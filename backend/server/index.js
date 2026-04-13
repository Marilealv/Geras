import cors from "cors";
import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import multer from "multer";
import streamifier from "streamifier";
import { pool } from "./db.js";
import { cloudinary, isCloudinaryConfigured } from "./services/cloudinary.js";

const app = express();
const PORT = process.env.PORT || 3001;
const VALID_TIPOS = new Set(["moderador", "donatario"]);
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change";
const VALID_IMAGE_TYPES = new Set(["idosos", "instituicoes"]);
const APPROVED_INSTITUICAO_STATUS = new Set(["aprovada", "ativa"]);
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 5;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

/**
 * Normaliza email para comparação case-insensitive
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Cria token JWT para autenticação
 * Expira em 1 hora
 */
function createToken(user) {
  const tokenId = crypto.randomUUID();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tipo: user.tipo_usuario,
      jti: tokenId,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getDateFromUnixSeconds(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

function buildLockedAccountMessage() {
  return `Conta bloqueada temporariamente. Tente novamente em ${LOGIN_LOCK_MINUTES} minutos.`;
}

async function getActiveLoginBlock(email) {
  const result = await pool.query(
    `SELECT bloqueado_ate
     FROM auth_tentativas_login
     WHERE email = $1 AND bloqueado_ate IS NOT NULL AND bloqueado_ate > NOW()
     LIMIT 1`,
    [email]
  );

  return result.rows[0]?.bloqueado_ate ?? null;
}

async function registerFailedLoginAttempt(email) {
  const result = await pool.query(
    `INSERT INTO auth_tentativas_login (email, tentativas_falhas, bloqueado_ate, ultima_falha_em, atualizado_em)
     VALUES ($1, 1, NULL, NOW(), NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       tentativas_falhas = CASE
         WHEN auth_tentativas_login.bloqueado_ate IS NOT NULL AND auth_tentativas_login.bloqueado_ate <= NOW() THEN 1
         ELSE auth_tentativas_login.tentativas_falhas + 1
       END,
       ultima_falha_em = NOW(),
       bloqueado_ate = CASE
         WHEN (
           CASE
             WHEN auth_tentativas_login.bloqueado_ate IS NOT NULL AND auth_tentativas_login.bloqueado_ate <= NOW() THEN 1
             ELSE auth_tentativas_login.tentativas_falhas + 1
           END
         ) >= $2 THEN NOW() + ($3 * INTERVAL '1 minute')
         ELSE NULL
       END,
       atualizado_em = NOW()
     RETURNING tentativas_falhas, bloqueado_ate`,
    [email, MAX_FAILED_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES]
  );

  return result.rows[0] ?? { tentativas_falhas: 1, bloqueado_ate: null };
}

async function clearFailedLoginAttempts(email) {
  await pool.query("DELETE FROM auth_tentativas_login WHERE email = $1", [email]);
}

/**
 * Middleware de autenticação
 * Valida token Bearer e extrai dados do usuário para req.user
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticacao ausente." });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (typeof payload !== "object" || payload === null) {
      return res.status(401).json({ message: "Token invalido ou expirado." });
    }

    const tokenHash = hashToken(token);
    let revokedTokenResult;

    try {
      revokedTokenResult = await pool.query(
        "SELECT 1 FROM auth_tokens_revogados WHERE token_hash = $1 AND expira_em > NOW() LIMIT 1",
        [tokenHash]
      );
    } catch (error) {
      console.error("Erro ao verificar token revogado:", error);
      return res.status(500).json({ message: "Erro ao validar autenticacao." });
    }

    if (revokedTokenResult.rowCount) {
      return res.status(401).json({ message: "Token invalidado. Faca login novamente." });
    }

    const expiresAt = getDateFromUnixSeconds(Number(payload.exp));

    req.user = {
      id: payload.sub,
      email: payload.email,
      tipo: payload.tipo,
    };

    req.auth = {
      token,
      tokenHash,
      tokenId: payload.jti,
      expiresAt,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
}

/**
 * Middleware de autorização para moderadores
 */
function moderadorMiddleware(req, res, next) {
  if (req.user?.tipo !== "moderador") {
    return res.status(403).json({ message: "Acesso permitido apenas para moderador." });
  }

  return next();
}

function mapInstituicaoStatusToUi(status) {
  if (status === "aprovada") return "ativa";
  if (status === "rejeitada") return "recusada";
  return status;
}

function mapModeradorActionToDbStatus(actionStatus) {
  if (actionStatus === "aprovar" || actionStatus === "reativar") return "aprovada";
  if (actionStatus === "pendenciar") return "pendente";
  if (actionStatus === "recusar" || actionStatus === "desativar") return "rejeitada";
  return null;
}

async function getApprovedMembership(userId, instituicaoId = null) {
  const params = [userId];
  let whereClause = "iu.usuario_id = $1";

  if (instituicaoId) {
    params.push(instituicaoId);
    whereClause += " AND iu.instituicao_id = $2";
  }

  const result = await pool.query(
    `SELECT iu.id, iu.instituicao_id, iu.usuario_id, iu.perfil, iu.status,
            inst.nome AS instituicao_nome, inst.status AS instituicao_status
     FROM instituicao_usuarios iu
     INNER JOIN instituicoes inst ON inst.id = iu.instituicao_id
     WHERE ${whereClause} AND iu.status = 'aprovado'
     ORDER BY CASE iu.perfil WHEN 'proprietario' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, iu.id ASC
     LIMIT 1`,
    params
  );

  return result.rows[0] ?? null;
}

async function createPendingMembership(instituicaoId, usuarioId) {
  const result = await pool.query(
    `INSERT INTO instituicao_usuarios
      (instituicao_id, usuario_id, perfil, status, solicitado_em, atualizado_em)
     VALUES ($1, $2, 'membro', 'pendente', NOW(), NOW())
     ON CONFLICT (instituicao_id, usuario_id)
     DO UPDATE SET
       status = CASE
         WHEN instituicao_usuarios.status = 'aprovado' THEN instituicao_usuarios.status
         ELSE 'pendente'
       END,
       motivo_rejeicao = NULL,
       solicitado_em = NOW(),
       atualizado_em = NOW()
     RETURNING id, status`,
    [instituicaoId, usuarioId]
  );

  return result.rows[0];
}

/**
 * Faz upload de arquivo para Cloudinary em pasta específica
 * @param {Buffer} fileBuffer - Buffer do arquivo
 * @param {string} folder - Caminho da pasta no Cloudinary (ex: home/geras/idosos)
 * @returns {Promise} Resultado do upload com public_id e secure_url
 */
function uploadToCloudinary(fileBuffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

/**
 * Resolve URL da imagem a partir do ID no banco de dados
 */
async function resolveImageUrl(imageId) {
  if (!imageId) {
    return null;
  }

  const result = await pool.query("SELECT cloudinary_url FROM imagens WHERE id = $1 LIMIT 1", [imageId]);
  return result.rows[0]?.cloudinary_url ?? null;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/api/health", async (_, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "erro" });
  }
});

// ============================================================================
// AUTENTICAÇÃO - Registro e Login
// ============================================================================

app.post("/api/auth/register", async (req, res) => {
  const { email, senha, tipo, nomeResponsavel, telefone, instituicaoIdExistente } = req.body ?? {};

  if (!email || !senha || !tipo || !nomeResponsavel || !telefone) {
    return res
      .status(400)
      .json({ message: "Nome do responsavel, telefone, email, senha e tipo sao obrigatorios." });
  }

  if (!VALID_TIPOS.has(tipo)) {
    return res.status(400).json({ message: "Tipo de usuario invalido." });
  }

  try {
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1 LIMIT 1", [
      normalizedEmail,
    ]);

    if (existingUser.rowCount) {
      return res.status(409).json({ message: "Ja existe usuario com esse email." });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const insertResult = await pool.query(
      `INSERT INTO usuarios (email, senha, tipo_usuario, nome_responsavel, telefone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, tipo_usuario, nome_responsavel, telefone`,
      [normalizedEmail, senhaHash, tipo, nomeResponsavel, telefone]
    );

    const createdUser = insertResult.rows[0];

    let vinculoPendente = false;

    if (tipo === "donatario" && instituicaoIdExistente) {
      const instituicaoResult = await pool.query(
        "SELECT id FROM instituicoes WHERE id = $1 LIMIT 1",
        [instituicaoIdExistente]
      );

      if (!instituicaoResult.rowCount) {
        return res.status(400).json({ message: "Instituicao selecionada nao encontrada." });
      }

      const membership = await createPendingMembership(instituicaoIdExistente, createdUser.id);
      vinculoPendente = membership.status !== "aprovado";
    }

    const token = createToken(createdUser);

    return res.status(201).json({
      token,
      vinculoPendente,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        tipo: createdUser.tipo_usuario,
        nome: createdUser.nome_responsavel,
        telefone: createdUser.telefone,
      },
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    return res.status(500).json({ message: "Erro interno ao registrar usuario." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body ?? {};

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha sao obrigatorios." });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const blockedUntil = await getActiveLoginBlock(normalizedEmail);

    if (blockedUntil) {
      return res.status(423).json({
        message: buildLockedAccountMessage(),
        bloqueadoAte: blockedUntil,
      });
    }

    const result = await pool.query(
      `SELECT id, email, senha, tipo_usuario, nome_responsavel, telefone, bloqueado, precisa_trocar_senha
       FROM usuarios WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      const loginAttempt = await registerFailedLoginAttempt(normalizedEmail);

      if (loginAttempt?.bloqueado_ate) {
        return res.status(423).json({
          message: buildLockedAccountMessage(),
          bloqueadoAte: loginAttempt.bloqueado_ate,
        });
      }

      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    if (user.bloqueado) {
      return res.status(403).json({ message: "Usuario bloqueado. Contate um moderador." });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);

    if (!isValidPassword) {
      const loginAttempt = await registerFailedLoginAttempt(normalizedEmail);

      if (loginAttempt?.bloqueado_ate) {
        return res.status(423).json({
          message: buildLockedAccountMessage(),
          bloqueadoAte: loginAttempt.bloqueado_ate,
        });
      }

      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    await clearFailedLoginAttempts(normalizedEmail);

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tipo: user.tipo_usuario,
        nome: user.nome_responsavel,
        telefone: user.telefone,
        precisaTrocarSenha: Boolean(user.precisa_trocar_senha),
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);

    if (error?.code === "42P01") {
      return res.status(500).json({
        message: "Estrutura de seguranca de autenticacao nao encontrada. Rode o SQL 002_auth_security.sql.",
      });
    }

    return res.status(500).json({ message: "Erro interno ao autenticar." });
  }
});

app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    const tokenHash = req.auth?.tokenHash;
    const expiresAt = req.auth?.expiresAt;

    if (!tokenHash || !expiresAt) {
      return res.status(400).json({ message: "Token de autenticacao invalido para logout." });
    }

    await pool.query(
      `INSERT INTO auth_tokens_revogados (token_hash, usuario_id, expira_em)
       VALUES ($1, $2, $3)
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, req.user.id, expiresAt]
    );

    return res.status(204).send();
  } catch (error) {
    console.error("Erro no logout:", error);

    if (error?.code === "42P01") {
      return res.status(500).json({
        message: "Estrutura de seguranca de autenticacao nao encontrada. Rode o SQL 002_auth_security.sql.",
      });
    }

    return res.status(500).json({ message: "Erro interno ao finalizar sessao." });
  }
});

// ============================================================================
// UPLOADS - Imagens para Cloudinary
// ============================================================================

/**
 * POST /api/uploads/image
 * Faz upload de imagem para Cloudinary em pasta específica
 * 
 * Body (FormData):
 * - image: File (obrigatório)
 * - type: "idosos" | "instituicoes" (obrigatório)
 * 
 * Response:
 * {
 *   imagem: {
 *     id: number,        // ID no banco de dados
 *     url: string,       // URL do Cloudinary
 *     publicId: string   // Public ID do Cloudinary
 *   }
 * }
 */
app.post("/api/uploads/image", authMiddleware, upload.single("image"), async (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.status(500).json({ message: "Cloudinary nao configurado no backend." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Arquivo de imagem obrigatorio." });
  }

  const imageType = req.body.type || req.query.type;

  if (!imageType) {
    return res.status(400).json({ message: "Tipo de imagem (type) obrigatorio." });
  }

  if (!VALID_IMAGE_TYPES.has(imageType)) {
    return res.status(400).json({ message: "Tipo de imagem invalido. Use: idosos ou instituicoes." });
  }

  try {
    // Caminho da pasta no Cloudinary: home/geras/idosos ou home/geras/instituicoes
    const cloudinaryFolder = `home/geras/${imageType}`;
    const result = await uploadToCloudinary(req.file.buffer, cloudinaryFolder);

    const imageInsertResult = await pool.query(
      `INSERT INTO imagens
       (cloudinary_public_id, cloudinary_url, mime_type, bytes, largura, altura, criado_por_usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cloudinary_url, cloudinary_public_id`,
      [
        result.public_id,
        result.secure_url,
        req.file.mimetype,
        req.file.size,
        result.width || null,
        result.height || null,
        req.user.id,
      ]
    );

    const image = imageInsertResult.rows[0];

    return res.status(201).json({
      imagem: {
        id: image.id,
        url: image.cloudinary_url,
        publicId: image.cloudinary_public_id,
      },
    });
  } catch (error) {
    console.error("Erro no upload de imagem:", error);
    const errorCode = error?.code || error?.error?.code;
    const errorMessage = error?.message || error?.error?.message;

    // Mensagens claras para acelerar diagnóstico em produção.
    if (errorCode === "42P01") {
      return res.status(500).json({
        message: "Tabela de imagens nao encontrada no banco. Rode o SQL mais recente.",
      });
    }

    if (error?.http_code) {
      return res.status(500).json({
        message: `Falha no Cloudinary (HTTP ${error.http_code}). Verifique credenciais e pasta.`,
      });
    }

    return res.status(500).json({
      message: errorMessage || "Erro ao enviar imagem.",
    });
  }
});

// ============================================================================
// INSTITUIÇÕES - CRUD
// ============================================================================

app.post("/api/instituicoes", authMiddleware, async (req, res) => {
  const { nomeInstituicao, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId } =
    req.body ?? {};

  if (!nomeInstituicao || !cnpj || !endereco || !cidade || !estado || !cep || !telefone) {
    return res.status(400).json({ message: "Dados obrigatorios da instituicao nao informados." });
  }

  try {
    const existingByUser = await pool.query(
      `SELECT iu.id
       FROM instituicao_usuarios iu
       WHERE iu.usuario_id = $1 AND iu.status = 'aprovado'
       LIMIT 1`,
      [req.user.id]
    );

    if (existingByUser.rowCount) {
      return res.status(409).json({ message: "Usuario ja possui instituicao cadastrada." });
    }

    const result = await pool.query(
      `INSERT INTO instituicoes
       (usuario_id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente')
       RETURNING id, usuario_id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status`,
      [
        req.user.id,
        nomeInstituicao,
        cnpj,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        descricao ?? "",
        imagemId ?? null,
      ]
    );

    const instituicao = result.rows[0];

    await pool.query(
      `INSERT INTO instituicao_usuarios
        (instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, aprovado_por_usuario_id, atualizado_em)
       VALUES ($1, $2, 'proprietario', 'aprovado', NOW(), NOW(), $2, NOW())
       ON CONFLICT (instituicao_id, usuario_id)
       DO UPDATE SET perfil = 'proprietario', status = 'aprovado', atualizado_em = NOW()`,
      [instituicao.id, req.user.id]
    );

    return res.status(201).json({
      instituicao: {
        ...instituicao,
        imagem_url: await resolveImageUrl(instituicao.imagem_id),
      },
    });
  } catch (error) {
    console.error("Erro ao cadastrar instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar instituicao." });
  }
});

app.get("/api/instituicoes/me", authMiddleware, async (req, res) => {
  /**
   * GET /api/instituicoes/me
   * Busca instituição do usuário autenticado com imagem resolvida
   * 
   * Response: { instituicao: {..., imagem_url: "cloudinary_url" | null} | null }
   */
  try {
    const approvedMembership = await getApprovedMembership(req.user.id);

    if (!approvedMembership) {
      const pendingResult = await pool.query(
        `SELECT iu.id, iu.status, iu.solicitado_em, iu.motivo_rejeicao,
                inst.id AS instituicao_id, inst.nome AS instituicao_nome, inst.cnpj AS instituicao_cnpj
         FROM instituicao_usuarios iu
         INNER JOIN instituicoes inst ON inst.id = iu.instituicao_id
         WHERE iu.usuario_id = $1 AND iu.status IN ('pendente', 'rejeitado')
         ORDER BY iu.solicitado_em DESC
         LIMIT 1`,
        [req.user.id]
      );

      return res.json({
        instituicao: null,
        vinculo: pendingResult.rows[0]
          ? {
              id: pendingResult.rows[0].id,
              status: pendingResult.rows[0].status,
              solicitado_em: pendingResult.rows[0].solicitado_em,
              motivo_rejeicao: pendingResult.rows[0].motivo_rejeicao,
              instituicao: {
                id: pendingResult.rows[0].instituicao_id,
                nome: pendingResult.rows[0].instituicao_nome,
                cnpj: pendingResult.rows[0].instituicao_cnpj,
              },
            }
          : null,
      });
    }

    const result = await pool.query(
      `SELECT inst.id, inst.nome, inst.cnpj, inst.endereco, inst.cidade, inst.estado, inst.cep,
              inst.telefone, inst.descricao, inst.imagem_id, img.cloudinary_url AS imagem_url,
              inst.status, inst.motivo_recusa
       FROM instituicoes inst
       LEFT JOIN imagens img ON img.id = inst.imagem_id
       WHERE inst.id = $1
       LIMIT 1`,
      [approvedMembership.instituicao_id]
    );

    return res.json({ instituicao: result.rows[0] ?? null, vinculo: null });
  } catch (error) {
    console.error("Erro ao buscar instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao buscar instituicao." });
  }
});

app.get("/api/instituicoes/search", async (req, res) => {
  const query = String(req.query.query || "").trim();

  if (query.length < 2) {
    return res.json({ instituicoes: [] });
  }

  try {
    const result = await pool.query(
      `SELECT id, nome, cnpj, cidade, estado, status
       FROM instituicoes
       WHERE nome ILIKE $1 OR cnpj ILIKE $1
       ORDER BY nome ASC
       LIMIT 20`,
      [`%${query}%`]
    );

    return res.json({ instituicoes: result.rows });
  } catch (error) {
    console.error("Erro ao buscar instituicoes:", error);
    return res.status(500).json({ message: "Erro interno ao buscar instituicoes." });
  }
});

app.post("/api/instituicoes/:id/solicitar-vinculo", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const instituicaoResult = await pool.query("SELECT id FROM instituicoes WHERE id = $1 LIMIT 1", [id]);

    if (!instituicaoResult.rowCount) {
      return res.status(404).json({ message: "Instituicao nao encontrada." });
    }

    const membership = await createPendingMembership(id, req.user.id);

    if (membership.status === "aprovado") {
      return res.status(200).json({ message: "Usuario ja vinculado e aprovado nessa instituicao." });
    }

    return res.status(202).json({ message: "Solicitacao de vinculo enviada para aprovacao." });
  } catch (error) {
    console.error("Erro ao solicitar vinculo:", error);
    return res.status(500).json({ message: "Erro interno ao solicitar vinculo." });
  }
});

app.get("/api/instituicoes/publicas", async (_, res) => {
  try {
    const instituicoesResult = await pool.query(
      `SELECT inst.id, inst.nome, inst.cnpj, inst.endereco, inst.cidade, inst.estado,
              inst.cep, inst.telefone, inst.descricao, inst.status
       FROM instituicoes inst
       WHERE inst.status IN ('aprovada', 'ativa')
       ORDER BY inst.criado_em DESC`
    );

    const instituicoes = instituicoesResult.rows;

    if (!instituicoes.length) {
      return res.json({ instituicoes: [] });
    }

    const instituicaoIds = instituicoes.map((inst) => inst.id);

    const idososResult = await pool.query(
      `SELECT i.id, i.instituicao_id, i.nome, i.idade, i.historia, img.cloudinary_url AS foto_url
       FROM idosos i
       LEFT JOIN imagens img ON img.id = i.imagem_id
       WHERE i.instituicao_id = ANY($1::bigint[])
       ORDER BY i.criado_em DESC`,
      [instituicaoIds]
    );

    const idososByInstituicaoId = new Map();

    idososResult.rows.forEach((idoso) => {
      const existing = idososByInstituicaoId.get(idoso.instituicao_id) || [];
      existing.push({
        id: idoso.id,
        nome: idoso.nome,
        idade: idoso.idade,
        historia: idoso.historia,
        foto_url: idoso.foto_url,
      });
      idososByInstituicaoId.set(idoso.instituicao_id, existing);
    });

    const payload = instituicoes.map((inst) => ({
      id: inst.id,
      nome: inst.nome,
      cnpj: inst.cnpj,
      endereco: inst.endereco,
      cidade: inst.cidade,
      estado: inst.estado,
      cep: inst.cep,
      telefone: inst.telefone,
      descricao: inst.descricao,
      status: mapInstituicaoStatusToUi(inst.status),
      idosos: idososByInstituicaoId.get(inst.id) || [],
    }));

    return res.json({ instituicoes: payload });
  } catch (error) {
    console.error("Erro ao listar instituicoes publicas:", error);
    return res.status(500).json({ message: "Erro interno ao listar instituicoes publicas." });
  }
});

/**
 * PUT /api/instituicoes/me
 * Atualiza dados da instituição do usuário (suporta atualização parcial)
 */
app.put("/api/instituicoes/me", authMiddleware, async (req, res) => {
  const { nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId, status } = req.body ?? {};

  try {
    const membership = await getApprovedMembership(req.user.id);

    if (!membership) {
      return res.status(404).json({ message: "Instituicao nao encontrada para este usuario." });
    }

    const result = await pool.query(
      `UPDATE instituicoes
       SET nome = COALESCE($2, nome),
           cnpj = COALESCE($3, cnpj),
           endereco = COALESCE($4, endereco),
           cidade = COALESCE($5, cidade),
           estado = COALESCE($6, estado),
           cep = COALESCE($7, cep),
           telefone = COALESCE($8, telefone),
           descricao = COALESCE($9, descricao),
           imagem_id = COALESCE($10, imagem_id),
           status = COALESCE($11, status),
           atualizado_em = NOW()
       WHERE id = $1
       RETURNING id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status`,
      [membership.instituicao_id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId, status]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Instituicao nao encontrada." });
    }

    const instituicao = result.rows[0];

    return res.json({
      instituicao: {
        ...instituicao,
        imagem_url: await resolveImageUrl(instituicao.imagem_id),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar instituicao." });
  }
});

// ============================================================================
// MODERAÇÃO - Gestão de instituições
// ============================================================================

app.get("/api/moderador/instituicoes", authMiddleware, moderadorMiddleware, async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT inst.id, inst.nome, inst.cnpj, inst.endereco, inst.cidade, inst.estado, inst.cep,
              inst.telefone, inst.descricao, inst.status, inst.motivo_recusa, inst.criado_em,
              u.nome_responsavel, u.email
       FROM instituicoes inst
       INNER JOIN usuarios u ON u.id = inst.usuario_id
       ORDER BY
         CASE WHEN inst.status = 'pendente' THEN 0 ELSE 1 END,
         inst.criado_em DESC`
    );

    const instituicoes = result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      cnpj: row.cnpj,
      endereco: row.endereco,
      cidade: row.cidade,
      estado: row.estado,
      cep: row.cep,
      telefone: row.telefone,
      descricao: row.descricao,
      motivo_recusa: row.motivo_recusa,
      status: mapInstituicaoStatusToUi(row.status),
      data_cadastro: row.criado_em,
      nome_responsavel: row.nome_responsavel,
      email_responsavel: row.email,
    }));

    return res.json({ instituicoes });
  } catch (error) {
    console.error("Erro ao listar instituicoes para moderacao:", error);
    return res.status(500).json({ message: "Erro interno ao listar instituicoes." });
  }
});

app.patch("/api/moderador/instituicoes/:id/status", authMiddleware, moderadorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action, motivoRecusa } = req.body ?? {};

  const nextStatus = mapModeradorActionToDbStatus(action);

  if (!nextStatus) {
    return res.status(400).json({ message: "Acao de moderacao invalida." });
  }

  const normalizedMotivoRecusa = String(motivoRecusa || "").trim();

  if (action === "recusar" && !normalizedMotivoRecusa) {
    return res.status(400).json({ message: "Motivo da recusa e obrigatorio." });
  }

  try {
    const result = await pool.query(
      `UPDATE instituicoes
       SET status = $2,
           motivo_recusa = CASE WHEN $3::text = 'recusar' THEN $4 ELSE NULL END,
           atualizado_em = NOW()
       WHERE id = $1
       RETURNING id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao,
                 status, motivo_recusa, criado_em`,
      [id, nextStatus, action, normalizedMotivoRecusa || null]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Instituicao nao encontrada." });
    }

    const instituicao = result.rows[0];

    return res.json({
      instituicao: {
        id: instituicao.id,
        nome: instituicao.nome,
        cnpj: instituicao.cnpj,
        endereco: instituicao.endereco,
        cidade: instituicao.cidade,
        estado: instituicao.estado,
        cep: instituicao.cep,
        telefone: instituicao.telefone,
        descricao: instituicao.descricao,
        motivo_recusa: instituicao.motivo_recusa,
        status: mapInstituicaoStatusToUi(instituicao.status),
        data_cadastro: instituicao.criado_em,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar status da instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar status da instituicao." });
  }
});

app.get("/api/instituicoes/:id/vinculos-pendentes", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const isModerador = req.user?.tipo === "moderador";
    const membership = isModerador ? null : await getApprovedMembership(req.user.id, id);

    if (!isModerador && !membership) {
      return res.status(403).json({ message: "Acesso negado aos vinculos desta instituicao." });
    }

    const result = await pool.query(
      `SELECT iu.id, iu.usuario_id, iu.status, iu.solicitado_em, iu.motivo_rejeicao,
              u.nome_responsavel, u.email, u.telefone
       FROM instituicao_usuarios iu
       INNER JOIN usuarios u ON u.id = iu.usuario_id
       WHERE iu.instituicao_id = $1 AND iu.status = 'pendente'
       ORDER BY iu.solicitado_em ASC`,
      [id]
    );

    return res.json({ vinculos: result.rows });
  } catch (error) {
    console.error("Erro ao listar vinculos pendentes:", error);
    return res.status(500).json({ message: "Erro interno ao listar vinculos pendentes." });
  }
});

app.patch("/api/instituicoes/:instituicaoId/vinculos/:vinculoId", authMiddleware, async (req, res) => {
  const { instituicaoId, vinculoId } = req.params;
  const action = String(req.body?.action || "").trim().toLowerCase();
  const motivoRejeicao = String(req.body?.motivoRejeicao || "").trim();

  if (!["aprovar", "recusar"].includes(action)) {
    return res.status(400).json({ message: "Acao invalida. Use aprovar ou recusar." });
  }

  if (action === "recusar" && !motivoRejeicao) {
    return res.status(400).json({ message: "Motivo de rejeicao e obrigatorio." });
  }

  try {
    const isModerador = req.user?.tipo === "moderador";
    const membership = isModerador ? null : await getApprovedMembership(req.user.id, instituicaoId);

    if (!isModerador && !membership) {
      return res.status(403).json({ message: "Acesso negado para aprovar vinculos desta instituicao." });
    }

    const newStatus = action === "aprovar" ? "aprovado" : "rejeitado";
    const result = await pool.query(
      `UPDATE instituicao_usuarios
       SET status = $3,
           aprovado_em = CASE WHEN $3 = 'aprovado' THEN NOW() ELSE NULL END,
           aprovado_por_usuario_id = $4,
           motivo_rejeicao = CASE WHEN $3 = 'rejeitado' THEN $5 ELSE NULL END,
           atualizado_em = NOW()
       WHERE id = $1 AND instituicao_id = $2
       RETURNING id, instituicao_id, usuario_id, status, solicitado_em, aprovado_em, motivo_rejeicao`,
      [vinculoId, instituicaoId, newStatus, req.user.id, motivoRejeicao || null]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Vinculo nao encontrado." });
    }

    return res.json({ vinculo: result.rows[0] });
  } catch (error) {
    console.error("Erro ao atualizar vinculo:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar vinculo." });
  }
});

app.get("/api/moderador/usuarios", authMiddleware, moderadorMiddleware, async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome_responsavel, u.email, u.telefone, u.tipo_usuario, u.bloqueado, u.precisa_trocar_senha,
              COUNT(iu.id) FILTER (WHERE iu.status = 'aprovado') AS instituicoes_aprovadas,
              COUNT(iu.id) FILTER (WHERE iu.status = 'pendente') AS vinculos_pendentes
       FROM usuarios u
       LEFT JOIN instituicao_usuarios iu ON iu.usuario_id = u.id
       GROUP BY u.id
       ORDER BY u.criado_em DESC`);

    return res.json({ usuarios: result.rows });
  } catch (error) {
    console.error("Erro ao listar usuarios:", error);
    return res.status(500).json({ message: "Erro interno ao listar usuarios." });
  }
});

app.patch("/api/moderador/usuarios/:id", authMiddleware, moderadorMiddleware, async (req, res) => {
  const { id } = req.params;
  const action = String(req.body?.action || "").trim();
  const novaSenha = String(req.body?.novaSenha || "").trim();

  try {
    if (String(req.user.id) === String(id) && (action === "bloquear" || action === "tornarDonatario")) {
      return res.status(400).json({ message: "Nao e permitido aplicar essa acao no proprio usuario." });
    }

    if (action === "tornarModerador" || action === "tornarDonatario") {
      const tipo = action === "tornarModerador" ? "moderador" : "donatario";
      await pool.query("UPDATE usuarios SET tipo_usuario = $2 WHERE id = $1", [id, tipo]);
    } else if (action === "bloquear" || action === "desbloquear") {
      await pool.query("UPDATE usuarios SET bloqueado = $2 WHERE id = $1", [id, action === "bloquear"]);
    } else if (action === "forcarTrocaSenha" || action === "removerTrocaSenha") {
      await pool.query("UPDATE usuarios SET precisa_trocar_senha = $2 WHERE id = $1", [
        id,
        action === "forcarTrocaSenha",
      ]);
    } else if (action === "trocarSenha") {
      if (novaSenha.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter ao menos 6 caracteres." });
      }

      const senhaHash = await bcrypt.hash(novaSenha, 12);
      await pool.query(
        "UPDATE usuarios SET senha = $2, precisa_trocar_senha = FALSE, bloqueado = FALSE WHERE id = $1",
        [id, senhaHash]
      );
    } else {
      return res.status(400).json({ message: "Acao de usuario invalida." });
    }

    const userResult = await pool.query(
      `SELECT id, nome_responsavel, email, telefone, tipo_usuario, bloqueado, precisa_trocar_senha
       FROM usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    return res.json({ usuario: userResult.rows[0] });
  } catch (error) {
    console.error("Erro ao atualizar usuario:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar usuario." });
  }
});

app.get("/api/moderador/usuarios/:id/vinculos", authMiddleware, moderadorMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 LIMIT 1",
      [id]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    const result = await pool.query(
      `SELECT iu.id, iu.instituicao_id, iu.perfil, iu.status, iu.solicitado_em, iu.aprovado_em, iu.motivo_rejeicao,
              inst.nome AS instituicao_nome, inst.cnpj AS instituicao_cnpj
       FROM instituicao_usuarios iu
       INNER JOIN instituicoes inst ON inst.id = iu.instituicao_id
       WHERE iu.usuario_id = $1
       ORDER BY iu.atualizado_em DESC, iu.id DESC`,
      [id]
    );

    return res.json({ vinculos: result.rows });
  } catch (error) {
    console.error("Erro ao listar vinculos do usuario:", error);
    return res.status(500).json({ message: "Erro interno ao listar vinculos do usuario." });
  }
});

app.patch("/api/moderador/usuarios/:id/vinculos/:vinculoId", authMiddleware, moderadorMiddleware, async (req, res) => {
  const { id, vinculoId } = req.params;
  const action = String(req.body?.action || "").trim().toLowerCase();

  if (!["aprovar", "pendenciar", "rejeitar", "desvincular"].includes(action)) {
    return res.status(400).json({ message: "Acao de vinculo invalida." });
  }

  try {
    const userResult = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 LIMIT 1",
      [id]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    const vinculoResult = await pool.query(
      `SELECT id, usuario_id
       FROM instituicao_usuarios
       WHERE id = $1 AND usuario_id = $2
       LIMIT 1`,
      [vinculoId, id]
    );

    if (!vinculoResult.rowCount) {
      return res.status(404).json({ message: "Vinculo nao encontrado para este usuario." });
    }

    if (action === "desvincular") {
      await pool.query("DELETE FROM instituicao_usuarios WHERE id = $1", [vinculoId]);
      return res.status(204).send();
    }

    const statusMap = {
      aprovar: "aprovado",
      pendenciar: "pendente",
      rejeitar: "rejeitado",
    };

    const newStatus = statusMap[action];
    const result = await pool.query(
      `UPDATE instituicao_usuarios
       SET status = $2,
           aprovado_em = CASE WHEN $2 = 'aprovado' THEN NOW() ELSE NULL END,
           aprovado_por_usuario_id = CASE WHEN $2 = 'aprovado' THEN $3 ELSE NULL END,
           motivo_rejeicao = CASE WHEN $2 = 'rejeitado' THEN 'Rejeitado pelo moderador.' ELSE NULL END,
           atualizado_em = NOW()
       WHERE id = $1
       RETURNING id, instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, motivo_rejeicao`,
      [vinculoId, newStatus, req.user.id]
    );

    return res.json({ vinculo: result.rows[0] });
  } catch (error) {
    console.error("Erro ao atualizar vinculo do usuario:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar vinculo do usuario." });
  }
});

app.delete("/api/moderador/instituicoes/:id", authMiddleware, moderadorMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM instituicoes
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Instituicao nao encontrada." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao excluir instituicao." });
  }
});

// ============================================================================
// IDOSOS - CRUD
// ============================================================================

/**
 * POST /api/idosos
 * Cadastra novo idoso com necessidades associadas
 * Requer instituição cadastrada para o usuário
 */
app.post("/api/idosos", authMiddleware, async (req, res) => {
  const {
    nome,
    idade,
    dataAniversario,
    fotoImagemId,
    historia,
    hobbies,
    musicaFavorita,
    comidaFavorita,
    necessidades,
  } = req.body ?? {};

  if (!nome || !idade) {
    return res.status(400).json({ message: "Nome e idade do idoso sao obrigatorios." });
  }

  try {
    const membership = await getApprovedMembership(req.user.id);

    if (!membership) {
      return res.status(400).json({ message: "Cadastre ou vincule-se a uma instituicao antes de cadastrar idosos." });
    }

    const instituicaoResult = await pool.query(
      "SELECT id, status FROM instituicoes WHERE id = $1 LIMIT 1",
      [membership.instituicao_id]
    );

    const instituicao = instituicaoResult.rows[0];

    if (!instituicao) {
      return res.status(400).json({ message: "Cadastre uma instituicao antes de cadastrar idosos." });
    }

    if (!APPROVED_INSTITUICAO_STATUS.has(String(instituicao.status || ""))) {
      return res.status(403).json({
        message: "A instituicao precisa ser aprovada pelo moderador antes de cadastrar idosos.",
      });
    }

    const idosoResult = await pool.query(
      `INSERT INTO idosos
       (instituicao_id, nome, idade, data_aniversario, imagem_id, historia, hobbies, musica_favorita, comida_favorita)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nome, idade, data_aniversario, imagem_id, historia, hobbies, musica_favorita, comida_favorita`,
      [
        instituicao.id,
        nome,
        idade,
        dataAniversario || null,
        fotoImagemId || null,
        historia || null,
        hobbies || null,
        musicaFavorita || null,
        comidaFavorita || null,
      ]
    );

    const idoso = idosoResult.rows[0];

    // Insere necessidades em lote se fornecidas
    if (Array.isArray(necessidades) && necessidades.length > 0) {
      const values = [];
      const placeholders = [];

      necessidades.forEach((item, index) => {
        const base = index * 3;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        values.push(idoso.id, item.item, item.tipo);
      });

      await pool.query(
        `INSERT INTO idoso_necessidades (idoso_id, item, tipo)
         VALUES ${placeholders.join(",")}`,
        values
      );
    }

    return res.status(201).json({
      idoso: {
        ...idoso,
        foto_url: await resolveImageUrl(idoso.imagem_id),
      },
    });
  } catch (error) {
    console.error("Erro ao cadastrar idoso:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar idoso." });
  }
});

/**
 * GET /api/idosos
 * Lista todos os idosos da instituição do usuário autenticado
 */
app.get("/api/idosos", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.nome, i.idade, i.data_aniversario, i.imagem_id, img.cloudinary_url AS foto_url,
              i.historia, i.hobbies, i.musica_favorita, i.comida_favorita
       FROM idosos i
       INNER JOIN instituicoes inst ON inst.id = i.instituicao_id
       INNER JOIN instituicao_usuarios iu ON iu.instituicao_id = inst.id
       LEFT JOIN imagens img ON img.id = i.imagem_id
       WHERE iu.usuario_id = $1 AND iu.status = 'aprovado'
       ORDER BY i.criado_em DESC`,
      [req.user.id]
    );

    return res.json({ idosos: result.rows });
  } catch (error) {
    console.error("Erro ao listar idosos:", error);
    return res.status(500).json({ message: "Erro interno ao listar idosos." });
  }
});

/**
 * GET /api/idosos/:id
 * Busca idoso específico com suas necessidades associadas
 */
app.get("/api/idosos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const idosoResult = await pool.query(
      `SELECT i.id, i.nome, i.idade, i.data_aniversario, i.imagem_id, img.cloudinary_url AS foto_url,
              i.historia, i.hobbies, i.musica_favorita, i.comida_favorita,
              inst.id AS instituicao_id,
              (
                SELECT iu.usuario_id
                FROM instituicao_usuarios iu
                WHERE iu.instituicao_id = inst.id AND iu.status = 'aprovado'
                ORDER BY CASE iu.perfil WHEN 'proprietario' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, iu.id ASC
                LIMIT 1
              ) AS instituicao_usuario_id,
              inst.nome AS instituicao_nome,
              inst.endereco AS instituicao_endereco,
              inst.cidade AS instituicao_cidade,
              inst.estado AS instituicao_estado,
              inst.cep AS instituicao_cep,
              inst.telefone AS instituicao_telefone
       FROM idosos i
       INNER JOIN instituicoes inst ON inst.id = i.instituicao_id
       LEFT JOIN imagens img ON img.id = i.imagem_id
       WHERE i.id = $1
       LIMIT 1`,
      [id]
    );

    if (!idosoResult.rowCount) {
      return res.status(404).json({ message: "Idoso nao encontrado." });
    }

    const necessidadesResult = await pool.query(
      "SELECT id, item, tipo FROM idoso_necessidades WHERE idoso_id = $1 ORDER BY criado_em DESC",
      [id]
    );

    return res.json({
      idoso: {
        id: idosoResult.rows[0].id,
        nome: idosoResult.rows[0].nome,
        idade: idosoResult.rows[0].idade,
        data_aniversario: idosoResult.rows[0].data_aniversario,
        imagem_id: idosoResult.rows[0].imagem_id,
        foto_url: idosoResult.rows[0].foto_url,
        historia: idosoResult.rows[0].historia,
        hobbies: idosoResult.rows[0].hobbies,
        musica_favorita: idosoResult.rows[0].musica_favorita,
        comida_favorita: idosoResult.rows[0].comida_favorita,
        instituicao: {
          id: idosoResult.rows[0].instituicao_id,
          usuario_id: idosoResult.rows[0].instituicao_usuario_id,
          nome: idosoResult.rows[0].instituicao_nome,
          endereco: idosoResult.rows[0].instituicao_endereco,
          cidade: idosoResult.rows[0].instituicao_cidade,
          estado: idosoResult.rows[0].instituicao_estado,
          cep: idosoResult.rows[0].instituicao_cep,
          telefone: idosoResult.rows[0].instituicao_telefone,
        },
        necessidades: necessidadesResult.rows,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar idoso:", error);
    return res.status(500).json({ message: "Erro interno ao buscar idoso." });
  }
});

/**
 * PUT /api/idosos/:id
 * Atualiza dados do idoso (suporta atualização parcial)
 * Também pode atualizar necessidades (delete + insert)
 */
app.put("/api/idosos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    idade,
    dataAniversario,
    fotoImagemId,
    historia,
    hobbies,
    musicaFavorita,
    comidaFavorita,
    necessidades,
  } = req.body ?? {};

  try {
    const isModerador = req.user?.tipo === "moderador";

    const updateResult = isModerador
      ? await pool.query(
          `UPDATE idosos i
           SET nome = COALESCE($2, i.nome),
               idade = COALESCE($3, i.idade),
               data_aniversario = COALESCE($4, i.data_aniversario),
               imagem_id = COALESCE($5, i.imagem_id),
               historia = COALESCE($6, i.historia),
               hobbies = COALESCE($7, i.hobbies),
               musica_favorita = COALESCE($8, i.musica_favorita),
               comida_favorita = COALESCE($9, i.comida_favorita),
               atualizado_em = NOW()
           WHERE i.id = $1
           RETURNING i.id, i.nome, i.idade, i.data_aniversario, i.imagem_id, i.historia, i.hobbies, i.musica_favorita, i.comida_favorita`,
          [
            id,
            nome,
            idade,
            dataAniversario || null,
            fotoImagemId || null,
            historia || null,
            hobbies || null,
            musicaFavorita || null,
            comidaFavorita || null,
          ]
        )
      : await pool.query(
          `UPDATE idosos i
           SET nome = COALESCE($3, i.nome),
               idade = COALESCE($4, i.idade),
               data_aniversario = COALESCE($5, i.data_aniversario),
               imagem_id = COALESCE($6, i.imagem_id),
               historia = COALESCE($7, i.historia),
               hobbies = COALESCE($8, i.hobbies),
               musica_favorita = COALESCE($9, i.musica_favorita),
               comida_favorita = COALESCE($10, i.comida_favorita),
               atualizado_em = NOW()
           FROM instituicoes inst
           INNER JOIN instituicao_usuarios iu ON iu.instituicao_id = inst.id
           WHERE i.id = $1
             AND i.instituicao_id = inst.id
             AND iu.usuario_id = $2
             AND iu.status = 'aprovado'
           RETURNING i.id, i.nome, i.idade, i.data_aniversario, i.imagem_id, i.historia, i.hobbies, i.musica_favorita, i.comida_favorita`,
          [
            id,
            req.user.id,
            nome,
            idade,
            dataAniversario || null,
            fotoImagemId || null,
            historia || null,
            hobbies || null,
            musicaFavorita || null,
            comidaFavorita || null,
          ]
        );

    if (!updateResult.rowCount) {
      return res.status(404).json({ message: "Idoso nao encontrado." });
    }

    // Atualiza necessidades: delete antigas e insere novas
    if (Array.isArray(necessidades)) {
      await pool.query("DELETE FROM idoso_necessidades WHERE idoso_id = $1", [id]);

      if (necessidades.length > 0) {
        const values = [];
        const placeholders = [];

        necessidades.forEach((item, index) => {
          const base = index * 3;
          placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
          values.push(id, item.item, item.tipo);
        });

        await pool.query(
          `INSERT INTO idoso_necessidades (idoso_id, item, tipo)
           VALUES ${placeholders.join(",")}`,
          values
        );
      }
    }

    const idoso = updateResult.rows[0];

    return res.json({
      idoso: {
        ...idoso,
        foto_url: await resolveImageUrl(idoso.imagem_id),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar idoso:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar idoso." });
  }
});

/**
 * DELETE /api/idosos/:id
 * Remove idoso (necessidades são deletadas em cascata)
 */
app.delete("/api/idosos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const isModerador = req.user?.tipo === "moderador";

    const result = isModerador
      ? await pool.query(
          `DELETE FROM idosos i
           WHERE i.id = $1
           RETURNING i.id`,
          [id]
        )
      : await pool.query(
          `DELETE FROM idosos i
           USING instituicoes inst, instituicao_usuarios iu
           WHERE i.id = $1
             AND i.instituicao_id = inst.id
             AND iu.instituicao_id = inst.id
             AND iu.usuario_id = $2
             AND iu.status = 'aprovado'
           RETURNING i.id`,
          [id, req.user.id]
        );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Idoso nao encontrado." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao remover idoso:", error);
    return res.status(500).json({ message: "Erro interno ao remover idoso." });
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`API de autenticacao rodando na porta ${PORT}`);
});
