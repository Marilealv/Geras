import bcrypt from "bcrypt";
import {
  buildResetPasswordUrl,
  buildVerificationUrl,
  isEmailServiceConfigured,
  sendEmailVerificationMessage,
  sendResetPasswordMessage,
} from "../services/email.js";
import { createHashedToken, hashRawToken } from "../services/token-links.js";

const EMAIL_VERIFICATION_EXPIRATION_MINUTES = 24 * 60;
const PASSWORD_RESET_EXPIRATION_MINUTES = 30;

function sanitizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function isValidPhone(value) {
  const digits = sanitizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

function formatPhone(value) {
  const digits = sanitizePhone(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function registerAuthRoutes({
  app,
  pool,
  authMiddleware,
  createToken,
  normalizeEmail,
  createPendingMembership,
  clearFailedLoginAttempts,
  registerFailedLoginAttempt,
  buildLockedAccountMessage,
}) {
  app.post("/api/auth/register", async (req, res) => {
    const { email, senha, tipo, nomeResponsavel, telefone, instituicaoIdExistente } = req.body ?? {};

    if (!email || !senha || !tipo || !nomeResponsavel || !telefone) {
      return res
        .status(400)
        .json({ message: "Nome do responsavel, telefone, email, senha e tipo sao obrigatorios." });
    }

    if (!new Set(["moderador", "donatario"]).has(tipo)) {
      return res.status(400).json({ message: "Tipo de usuario invalido." });
    }

    if (!isValidPhone(telefone)) {
      return res.status(400).json({ message: "Telefone invalido. Informe um telefone com DDD." });
    }

    try {
      const normalizedEmail = normalizeEmail(email);
      const formattedPhone = formatPhone(telefone);

      const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1 LIMIT 1", [normalizedEmail]);

      if (existingUser.rowCount) {
        return res.status(409).json({ message: "Ja existe usuario com esse email." });
      }

      const bcrypt = await import("bcrypt");
      const senhaHash = await bcrypt.hash(senha, 12);

      const insertResult = await pool.query(
        `INSERT INTO usuarios (email, senha, tipo_usuario, nome_responsavel, telefone, email_verificado)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING id, email, tipo_usuario, nome_responsavel, telefone`,
        [normalizedEmail, senhaHash, tipo, nomeResponsavel, formattedPhone]
      );

      const createdUser = insertResult.rows[0];
      let vinculoPendente = false;

      if (tipo === "donatario" && instituicaoIdExistente) {
        const instituicaoResult = await pool.query("SELECT id FROM instituicoes WHERE id = $1 LIMIT 1", [
          instituicaoIdExistente,
        ]);

        if (!instituicaoResult.rowCount) {
          return res.status(400).json({ message: "Instituicao selecionada nao encontrada." });
        }

        const membership = await createPendingMembership(instituicaoIdExistente, createdUser.id);
        vinculoPendente = membership.status !== "aprovado";
      }

      const verificationToken = createHashedToken(EMAIL_VERIFICATION_EXPIRATION_MINUTES);

      await pool.query(
        `INSERT INTO auth_email_verificacao_tokens (usuario_id, token_hash, expira_em)
         VALUES ($1, $2, $3)`,
        [createdUser.id, verificationToken.tokenHash, verificationToken.expiresAt]
      );

      let emailEnviado = false;

      if (isEmailServiceConfigured()) {
        try {
          await sendEmailVerificationMessage({
            to: createdUser.email,
            nome: createdUser.nome_responsavel,
            verificationUrl: buildVerificationUrl(verificationToken.token),
          });
          emailEnviado = true;
        } catch (emailError) {
          console.error("Erro ao enviar e-mail de verificacao:", emailError);
        }
      }

      return res.status(201).json({
        vinculoPendente,
        emailEnviado,
        message: emailEnviado
          ? "Cadastro concluido. Verifique seu e-mail para liberar o acesso."
          : "Cadastro concluido. Nao foi possivel enviar o e-mail de verificacao agora.",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          tipo: createdUser.tipo_usuario,
          nome: createdUser.nome_responsavel,
          telefone: createdUser.telefone,
          emailVerificado: false,
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
      const blockedUntil = await pool.query(
        `SELECT bloqueado_ate
         FROM auth_tentativas_login
         WHERE email = $1 AND bloqueado_ate IS NOT NULL AND bloqueado_ate > NOW()
         LIMIT 1`,
        [normalizedEmail]
      );

      if (blockedUntil.rowCount) {
        return res.status(423).json({
          message: buildLockedAccountMessage(),
          bloqueadoAte: blockedUntil.rows[0].bloqueado_ate,
        });
      }

      const result = await pool.query(
        `SELECT id, email, senha, tipo_usuario, nome_responsavel, telefone, bloqueado, precisa_trocar_senha, email_verificado
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

      if (!user.email_verificado) {
        return res.status(403).json({
          message: "Verifique seu e-mail antes de fazer login.",
          code: "EMAIL_NAO_VERIFICADO",
        });
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
          emailVerificado: Boolean(user.email_verificado),
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

  app.patch("/api/auth/me/password", authMiddleware, async (req, res) => {
    const novaSenha = String(req.body?.novaSenha || "").trim();

    if (!novaSenha) {
      return res.status(400).json({ message: "A nova senha e obrigatoria." });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ message: "A nova senha deve ter ao menos 6 caracteres." });
    }

    try {
      const result = await pool.query(
        "SELECT id, email, tipo_usuario, nome_responsavel, telefone FROM usuarios WHERE id = $1 LIMIT 1",
        [req.user.id]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }

      const senhaHash = await bcrypt.hash(novaSenha, 12);

      await pool.query("UPDATE usuarios SET senha = $2, precisa_trocar_senha = FALSE WHERE id = $1", [
        req.user.id,
        senhaHash,
      ]);

      return res.json({
        usuario: {
          id: user.id,
          email: user.email,
          tipo: user.tipo_usuario,
          nome: user.nome_responsavel,
          telefone: user.telefone,
          precisaTrocarSenha: false,
        },
      });
    } catch (error) {
      console.error("Erro ao trocar senha do usuario:", error);
      return res.status(500).json({ message: "Erro interno ao trocar senha." });
    }
  });

  app.post("/api/auth/email-verification/resend", async (req, res) => {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Email e obrigatorio." });
    }

    try {
      const userResult = await pool.query(
        `SELECT id, email, nome_responsavel, email_verificado
         FROM usuarios
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

      if (!userResult.rowCount) {
        return res.status(202).json({ message: "Se existir uma conta, enviaremos um novo e-mail." });
      }

      const user = userResult.rows[0];

      if (user.email_verificado) {
        return res.status(200).json({ message: "Este e-mail ja foi verificado." });
      }

      const verificationToken = createHashedToken(EMAIL_VERIFICATION_EXPIRATION_MINUTES);

      await pool.query(
        `INSERT INTO auth_email_verificacao_tokens (usuario_id, token_hash, expira_em)
         VALUES ($1, $2, $3)`,
        [user.id, verificationToken.tokenHash, verificationToken.expiresAt]
      );

      if (!isEmailServiceConfigured()) {
        return res.status(503).json({ message: "Servico de e-mail indisponivel no momento." });
      }

      await sendEmailVerificationMessage({
        to: user.email,
        nome: user.nome_responsavel,
        verificationUrl: buildVerificationUrl(verificationToken.token),
      });

      return res.status(200).json({ message: "E-mail de verificacao reenviado." });
    } catch (error) {
      console.error("Erro ao reenviar verificacao de e-mail:", error);
      return res.status(500).json({ message: "Erro interno ao reenviar verificacao." });
    }
  });

  app.post("/api/auth/email-verification/confirm", async (req, res) => {
    const token = String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Token de verificacao e obrigatorio." });
    }

    try {
      const tokenHash = hashRawToken(token);

      const tokenResult = await pool.query(
        `SELECT t.id, t.usuario_id
         FROM auth_email_verificacao_tokens t
         WHERE t.token_hash = $1
           AND t.usado_em IS NULL
           AND t.expira_em > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (!tokenResult.rowCount) {
        return res.status(400).json({ message: "Token invalido ou expirado." });
      }

      const verificationToken = tokenResult.rows[0];

      await pool.query(
        `UPDATE usuarios
         SET email_verificado = TRUE,
             email_verificado_em = COALESCE(email_verificado_em, NOW())
         WHERE id = $1`,
        [verificationToken.usuario_id]
      );

      await pool.query(
        `UPDATE auth_email_verificacao_tokens
         SET usado_em = NOW()
         WHERE id = $1`,
        [verificationToken.id]
      );

      return res.status(200).json({ message: "E-mail verificado com sucesso." });
    } catch (error) {
      console.error("Erro ao confirmar verificacao de e-mail:", error);
      return res.status(500).json({ message: "Erro interno ao confirmar verificacao." });
    }
  });

  app.post("/api/auth/password/forgot", async (req, res) => {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Email e obrigatorio." });
    }

    try {
      const userResult = await pool.query(
        `SELECT id, email, nome_responsavel
         FROM usuarios
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

      if (!userResult.rowCount) {
        return res.status(202).json({ message: "Se existir uma conta para este e-mail, enviaremos as instrucoes." });
      }

      const user = userResult.rows[0];
      const resetToken = createHashedToken(PASSWORD_RESET_EXPIRATION_MINUTES);

      await pool.query(
        `INSERT INTO auth_reset_senha_tokens (usuario_id, token_hash, expira_em)
         VALUES ($1, $2, $3)`,
        [user.id, resetToken.tokenHash, resetToken.expiresAt]
      );

      if (!isEmailServiceConfigured()) {
        return res.status(503).json({ message: "Servico de e-mail indisponivel no momento." });
      }

      await sendResetPasswordMessage({
        to: user.email,
        nome: user.nome_responsavel,
        resetUrl: buildResetPasswordUrl(resetToken.token),
      });

      return res.status(200).json({ message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes." });
    } catch (error) {
      console.error("Erro ao solicitar redefinicao de senha:", error);
      return res.status(500).json({ message: "Erro interno ao solicitar redefinicao de senha." });
    }
  });

  app.post("/api/auth/password/reset", async (req, res) => {
    const token = String(req.body?.token || "").trim();
    const novaSenha = String(req.body?.novaSenha || "").trim();

    if (!token || !novaSenha) {
      return res.status(400).json({ message: "Token e nova senha sao obrigatorios." });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ message: "A nova senha deve ter ao menos 6 caracteres." });
    }

    try {
      const tokenHash = hashRawToken(token);

      const tokenResult = await pool.query(
        `SELECT t.id, t.usuario_id, u.email
         FROM auth_reset_senha_tokens t
         INNER JOIN usuarios u ON u.id = t.usuario_id
         WHERE t.token_hash = $1
           AND t.usado_em IS NULL
           AND t.expira_em > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (!tokenResult.rowCount) {
        return res.status(400).json({ message: "Token invalido ou expirado." });
      }

      const resetToken = tokenResult.rows[0];
      const senhaHash = await bcrypt.hash(novaSenha, 12);

      await pool.query(
        `UPDATE usuarios
         SET senha = $2,
             precisa_trocar_senha = FALSE,
             bloqueado = FALSE,
             atualizado_em = NOW()
         WHERE id = $1`,
        [resetToken.usuario_id, senhaHash]
      );

      await pool.query(
        `UPDATE auth_reset_senha_tokens
         SET usado_em = NOW()
         WHERE id = $1`,
        [resetToken.id]
      );

      await pool.query(
        `UPDATE auth_reset_senha_tokens
         SET usado_em = NOW()
         WHERE usuario_id = $1 AND usado_em IS NULL`,
        [resetToken.usuario_id]
      );

      await clearFailedLoginAttempts(resetToken.email);

      return res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ message: "Erro interno ao redefinir senha." });
    }
  });
}
