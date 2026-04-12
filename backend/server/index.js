import cors from "cors";
import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const VALID_TIPOS = new Set(["moderador", "donatario"]);

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "erro" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, senha, tipo } = req.body ?? {};

  if (!email || !senha || !tipo) {
    return res.status(400).json({ message: "Email, senha e tipo sao obrigatorios." });
  }

  if (!VALID_TIPOS.has(tipo)) {
    return res.status(400).json({ message: "Tipo de usuario invalido." });
  }

  try {
    const existingUser = await pool.query("SELECT email FROM usuarios WHERE email = $1 LIMIT 1", [
      email,
    ]);

    if (existingUser.rowCount) {
      return res.status(409).json({ message: "Ja existe usuario com esse email." });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await pool.query(
      'INSERT INTO usuarios (email, senha, "tipo_usuário") VALUES ($1, $2, $3)',
      [email, senhaHash, tipo]
    );

    return res.status(201).json({
      user: {
        email,
        tipo,
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
      'SELECT email, senha, "tipo_usuário" AS tipo_usuario FROM usuarios WHERE email = $1 LIMIT 1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    return res.json({
      user: {
        email: user.email,
        tipo: user.tipo_usuario,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ message: "Erro interno ao autenticar." });
  }
});

app.listen(PORT, () => {
  console.log(`API de autenticacao rodando na porta ${PORT}`);
});
