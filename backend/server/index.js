import cors from "cors";
import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { cloudinary, isCloudinaryConfigured } from "./services/cloudinary.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerInstituicoesRoutes } from "./routes/instituicoes.js";
import { registerIdososRoutes } from "./routes/idosos.js";
import { registerIdosoNecessidadesRoutes } from "./routes/idoso-necessidades.js";
import { registerModeradorRoutes } from "./routes/moderador.js";
import { registerUploadsRoutes } from "./routes/uploads.js";

const app = express();
const PORT = process.env.PORT || 3001;
const VALID_TIPOS = new Set(["moderador", "donatario"]);
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change";
const VALID_IMAGE_TYPES = new Set(["idosos", "instituicoes"]);
const APPROVED_INSTITUICAO_STATUS = new Set(["aprovada", "ativa"]);
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 5;

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
 * Middleware de autenticação opcional - permite passar sem token, mas parseia se presente
 * Usado para rotas que têm acesso público mas oferecem funcionalidades extras para usuários autenticados
 */
async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (typeof payload !== "object" || payload === null) {
      return next();
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
      return next();
    }

    if (revokedTokenResult.rowCount) {
      return next();
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
  } catch {
    // Falhe silenciosamente se token inválido
  }

  return next();
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

async function createApprovedMembership(instituicaoId, usuarioId, aprovadoPorUsuarioId, perfil = "membro") {
  // Validação: perfil proprietario só é permitido se o usuário for o criador da instituição
  if (perfil === "proprietario") {
    const instituicaoResult = await pool.query(
      "SELECT usuario_id FROM instituicoes WHERE id = $1 LIMIT 1",
      [instituicaoId]
    );

    if (!instituicaoResult.rowCount || instituicaoResult.rows[0].usuario_id !== usuarioId) {
      throw new Error("Apenas o criador da instituição pode ter o perfil proprietario.");
    }
  }

  // Validação: perfil admin não deve ser atribuído automaticamente
  // (somente proprietario e membro são permitidos)
  if (!["proprietario", "membro"].includes(perfil)) {
    perfil = "membro";
  }

  const result = await pool.query(
    `INSERT INTO instituicao_usuarios
      (instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, aprovado_por_usuario_id, motivo_rejeicao, atualizado_em)
     VALUES ($1, $2, $3, 'aprovado', NOW(), NOW(), $4, NULL, NOW())
     ON CONFLICT (instituicao_id, usuario_id)
     DO UPDATE SET
       perfil = CASE
         WHEN instituicao_usuarios.perfil = 'proprietario' THEN instituicao_usuarios.perfil
         ELSE EXCLUDED.perfil
       END,
       status = 'aprovado',
       solicitado_em = COALESCE(instituicao_usuarios.solicitado_em, EXCLUDED.solicitado_em),
       aprovado_em = NOW(),
       aprovado_por_usuario_id = $4,
       motivo_rejeicao = NULL,
       atualizado_em = NOW()
     RETURNING id, instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, motivo_rejeicao`,
    [instituicaoId, usuarioId, perfil, aprovadoPorUsuarioId]
  );

  return result.rows[0];
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

registerIdosoNecessidadesRoutes({
  app,
  pool,
  authMiddleware,
});

registerUploadsRoutes({
  app,
  pool,
  authMiddleware,
  cloudinary,
  isCloudinaryConfigured,
  validImageTypes: VALID_IMAGE_TYPES,
});

registerModeradorRoutes({
  app,
  pool,
  authMiddleware,
  getApprovedMembership,
  createApprovedMembership,
  mapInstituicaoStatusToUi,
  mapModeradorActionToDbStatus,
});

registerAuthRoutes({
  app,
  pool,
  authMiddleware,
  createToken,
  normalizeEmail,
  createPendingMembership,
  clearFailedLoginAttempts,
  registerFailedLoginAttempt,
  buildLockedAccountMessage,
});

registerInstituicoesRoutes({
  app,
  pool,
  authMiddleware,
  getApprovedMembership,
  createPendingMembership,
  resolveImageUrl,
  mapInstituicaoStatusToUi,
  mapModeradorActionToDbStatus,
  APPROVED_INSTITUICAO_STATUS,
});

registerIdososRoutes({
  app,
  pool,
  authMiddleware,
  optionalAuthMiddleware,
  getApprovedMembership,
  resolveImageUrl,
  APPROVED_INSTITUICAO_STATUS,
});

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
// UPLOADS - Imagens para Cloudinary
// ============================================================================
// Legacy inline routes removed after modularization.

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
      "SELECT id, item, tipo, concluida_em FROM idoso_necessidades WHERE idoso_id = $1 AND concluida_em IS NULL ORDER BY criado_em DESC",
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
