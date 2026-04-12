import cors from "cors";
import express from "express";
import bcrypt from "bcrypt";
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
 * Expira em 1 dia
 */
function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tipo: user.tipo_usuario,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

/**
 * Middleware de autenticação
 * Valida token Bearer e extrai dados do usuário para req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticacao ausente." });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      tipo: payload.tipo,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
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
  const { email, senha, tipo, nomeResponsavel, telefone } = req.body ?? {};

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
    const token = createToken(createdUser);

    return res.status(201).json({
      token,
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
    const result = await pool.query(
      "SELECT id, email, senha, tipo_usuario, nome_responsavel, telefone FROM usuarios WHERE email = $1 LIMIT 1",
      [normalizeEmail(email)]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tipo: user.tipo_usuario,
        nome: user.nome_responsavel,
        telefone: user.telefone,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ message: "Erro interno ao autenticar." });
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
      "SELECT id FROM instituicoes WHERE usuario_id = $1 LIMIT 1",
      [req.user.id]
    );

    if (existingByUser.rowCount) {
      return res.status(409).json({ message: "Usuario ja possui instituicao cadastrada." });
    }

    const result = await pool.query(
      `INSERT INTO instituicoes
       (usuario_id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente')
       RETURNING id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status`,
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
    const result = await pool.query(
      `SELECT inst.id, inst.nome, inst.cnpj, inst.endereco, inst.cidade, inst.estado, inst.cep,
              inst.telefone, inst.descricao, inst.imagem_id, img.cloudinary_url AS imagem_url, inst.status
       FROM instituicoes inst
       LEFT JOIN imagens img ON img.id = inst.imagem_id
       WHERE inst.usuario_id = $1
       LIMIT 1`,
      [req.user.id]
    );

    return res.json({ instituicao: result.rows[0] ?? null });
  } catch (error) {
    console.error("Erro ao buscar instituicao:", error);
    return res.status(500).json({ message: "Erro interno ao buscar instituicao." });
  }
});

/**
 * PUT /api/instituicoes/me
 * Atualiza dados da instituição do usuário (suporta atualização parcial)
 */
app.put("/api/instituicoes/me", authMiddleware, async (req, res) => {
  const { nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId, status } = req.body ?? {};

  try {
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
       WHERE usuario_id = $1
       RETURNING id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagem_id, status`,
      [req.user.id, nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId, status]
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
    const instituicaoResult = await pool.query(
      "SELECT id FROM instituicoes WHERE usuario_id = $1 LIMIT 1",
      [req.user.id]
    );

    const instituicao = instituicaoResult.rows[0];

    if (!instituicao) {
      return res.status(400).json({ message: "Cadastre uma instituicao antes de cadastrar idosos." });
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
       LEFT JOIN imagens img ON img.id = i.imagem_id
       WHERE inst.usuario_id = $1
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
app.get("/api/idosos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const idosoResult = await pool.query(
      `SELECT i.id, i.nome, i.idade, i.data_aniversario, i.imagem_id, img.cloudinary_url AS foto_url,
              i.historia, i.hobbies, i.musica_favorita, i.comida_favorita
       FROM idosos i
       INNER JOIN instituicoes inst ON inst.id = i.instituicao_id
       LEFT JOIN imagens img ON img.id = i.imagem_id
       WHERE i.id = $1 AND inst.usuario_id = $2
       LIMIT 1`,
      [id, req.user.id]
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
        ...idosoResult.rows[0],
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
    const updateResult = await pool.query(
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
       WHERE i.id = $1 AND i.instituicao_id = inst.id AND inst.usuario_id = $2
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
    const result = await pool.query(
      `DELETE FROM idosos i
       USING instituicoes inst
       WHERE i.id = $1 AND i.instituicao_id = inst.id AND inst.usuario_id = $2
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
