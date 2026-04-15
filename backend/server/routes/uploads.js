import multer from "multer";
import { uploadToCloudinary } from "../services/uploads.js";

const upload = multer({ storage: multer.memoryStorage() });

export function registerUploadsRoutes({ app, pool, authMiddleware, cloudinary, isCloudinaryConfigured, validImageTypes }) {
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

    if (!validImageTypes.has(imageType)) {
      return res.status(400).json({ message: "Tipo de imagem invalido. Use: idosos ou instituicoes." });
    }

    try {
      const cloudinaryFolder = `home/geras/${imageType}`;
      const result = await uploadToCloudinary(cloudinary, req.file.buffer, cloudinaryFolder);

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
}
