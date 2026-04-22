import bcrypt from "bcrypt";

export function registerModeradorRoutes({
  app,
  pool,
  authMiddleware,
  getApprovedMembership,
  createApprovedMembership,
  mapInstituicaoStatusToUi,
  mapModeradorActionToDbStatus,
}) {
  const moderadorMiddleware = (req, res, next) => {
    if (req.user?.tipo !== "moderador") {
      return res.status(403).json({ message: "Acesso restrito a moderadores." });
    }

    return next();
  };

  const toPositiveInt = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const normalizeVinculoAction = (rawAction) => {
    const action = String(rawAction || "").trim().toLowerCase();

    if (action === "aprovar") return "aprovar";
    if (action === "pendenciar" || action === "pendente") return "pendenciar";
    if (action === "rejeitar" || action === "recusar") return "rejeitar";
    if (action === "desvincular" || action === "remover" || action === "excluir") return "desvincular";

    return null;
  };

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
         ORDER BY u.criado_em DESC`
      );

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

  app.post("/api/moderador/usuarios/:id/vinculos", authMiddleware, moderadorMiddleware, async (req, res) => {
    const userId = toPositiveInt(req.params.id);
    const instituicaoId = toPositiveInt(req.body?.instituicaoId ?? req.body?.instituicao_id);

    if (!userId) {
      return res.status(400).json({ message: "Usuario invalido." });
    }

    if (!instituicaoId) {
      return res.status(400).json({ message: "Instituicao invalida." });
    }

    try {
      const userResult = await pool.query("SELECT id FROM usuarios WHERE id = $1 LIMIT 1", [userId]);

      if (!userResult.rowCount) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }

      const instituicaoResult = await pool.query("SELECT id FROM instituicoes WHERE id = $1 LIMIT 1", [instituicaoId]);

      if (!instituicaoResult.rowCount) {
        return res.status(404).json({ message: "Instituicao nao encontrada." });
      }

      const vinculo = await createApprovedMembership(instituicaoId, userId, req.user.id, "membro");

      return res.status(201).json({ vinculo });
    } catch (error) {
      console.error("Erro ao vincular usuario a instituicao:", error);
      return res.status(500).json({ message: "Erro interno ao vincular usuario a instituicao." });
    }
  });

  app.get("/api/moderador/usuarios/:id/vinculos", authMiddleware, moderadorMiddleware, async (req, res) => {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Usuario invalido." });
    }

    try {
      const userResult = await pool.query("SELECT id FROM usuarios WHERE id = $1 LIMIT 1", [userId]);

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
        [userId]
      );

      return res.json({ vinculos: result.rows });
    } catch (error) {
      console.error("Erro ao listar vinculos do usuario:", error);
      return res.status(500).json({ message: "Erro interno ao listar vinculos do usuario." });
    }
  });

  app.patch("/api/moderador/usuarios/:id/vinculos/:vinculoId", authMiddleware, moderadorMiddleware, async (req, res) => {
    const userId = toPositiveInt(req.params.id);
    const vinculoId = toPositiveInt(req.params.vinculoId);
    const action = normalizeVinculoAction(req.body?.action);
    const motivoRejeicao = String(req.body?.motivoRejeicao || "").trim();

    if (!userId) {
      return res.status(400).json({ message: "Usuario invalido." });
    }

    if (!vinculoId) {
      return res.status(400).json({ message: "Vinculo invalido." });
    }

    if (!action) {
      return res.status(400).json({ message: "Acao de vinculo invalida." });
    }

    try {
      const userResult = await pool.query("SELECT id FROM usuarios WHERE id = $1 LIMIT 1", [userId]);

      if (!userResult.rowCount) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }

      const vinculoResult = await pool.query(
        `SELECT id, usuario_id, perfil, status
         FROM instituicao_usuarios
         WHERE id = $1 AND usuario_id = $2
         LIMIT 1`,
        [vinculoId, userId]
      );

      if (!vinculoResult.rowCount) {
        return res.status(404).json({ message: "Vinculo nao encontrado para este usuario." });
      }

      const vinculo = vinculoResult.rows[0];

      if (vinculo.perfil === "proprietario" && action !== "aprovar") {
        return res.status(400).json({
          message: "Nao e permitido alterar ou remover o vinculo de proprietario da instituicao.",
        });
      }

      if (action === "desvincular") {
        await pool.query("DELETE FROM instituicao_usuarios WHERE id = $1", [vinculoId]);
        return res.status(204).send();
      }

      if (action === "aprovar") {
        // Validação: garantir que só proprietarios mantêm seu perfil ao aprovar
        // Todos os demais são/permanecem como 'membro'
        const vinculoExistente = await pool.query(
          `SELECT perfil FROM instituicao_usuarios WHERE id = $1 LIMIT 1`,
          [vinculoId]
        );

        if (!vinculoExistente.rowCount) {
          return res.status(404).json({ message: "Vínculo não encontrado." });
        }

        // Se não for proprietario, garante que fica como membro
        const perfilFinal = vinculoExistente.rows[0].perfil === "proprietario" ? "proprietario" : "membro";

        const result = await pool.query(
          `UPDATE instituicao_usuarios
           SET status = 'aprovado',
               aprovado_em = NOW(),
               aprovado_por_usuario_id = $2,
               motivo_rejeicao = NULL,
               perfil = $3,
               atualizado_em = NOW()
           WHERE id = $1
           RETURNING id, instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, motivo_rejeicao`,
          [vinculoId, req.user.id, perfilFinal]
        );

        if (!result.rowCount) {
          return res.status(404).json({ message: "Vínculo não encontrado." });
        }

        return res.json({ vinculo: result.rows[0] });
      }

      if (action === "pendenciar") {
        const result = await pool.query(
          `UPDATE instituicao_usuarios
           SET status = 'pendente',
               atualizado_em = NOW()
           WHERE id = $1
           RETURNING id, instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, motivo_rejeicao`,
          [vinculoId]
        );

        if (!result.rowCount) {
          return res.status(404).json({ message: "Vinculo nao encontrado." });
        }

        return res.json({ vinculo: result.rows[0] });
      }

      const result = await pool.query(
        `UPDATE instituicao_usuarios
         SET status = 'rejeitado',
             motivo_rejeicao = $2,
             atualizado_em = NOW()
         WHERE id = $1
         RETURNING id, instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, motivo_rejeicao`,
        [vinculoId, motivoRejeicao || "Rejeitado pelo moderador."]
      );

      if (!result.rowCount) {
        return res.status(404).json({ message: "Vinculo nao encontrado." });
      }

      return res.json({ vinculo: result.rows[0] });
    } catch (error) {
      console.error("Erro ao atualizar vinculo do usuario:", error);

      if (error?.code === "23514" || error?.code === "23503" || error?.code === "23502") {
        return res.status(400).json({ message: error?.detail || "Nao foi possivel atualizar este vinculo." });
      }

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
}
