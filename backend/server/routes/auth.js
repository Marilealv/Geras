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

    try {
      const normalizedEmail = normalizeEmail(email);

      const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1 LIMIT 1", [normalizedEmail]);

      if (existingUser.rowCount) {
        return res.status(409).json({ message: "Ja existe usuario com esse email." });
      }

      const bcrypt = await import("bcrypt");
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
        const instituicaoResult = await pool.query("SELECT id FROM instituicoes WHERE id = $1 LIMIT 1", [
          instituicaoIdExistente,
        ]);

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

      const bcrypt = await import("bcrypt");
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

      const bcrypt = await import("bcrypt");
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
}
