export function registerIdosoNecessidadesRoutes({ app, pool, authMiddleware }) {
  const VALID_TIPOS = new Set(["urgente", "desejado"]);

  async function canManageIdoso(user, idosoId) {
    if (user?.tipo === "moderador") {
      return true;
    }

    const result = await pool.query(
      `SELECT 1
       FROM idosos i
       INNER JOIN instituicao_usuarios iu ON iu.instituicao_id = i.instituicao_id
       WHERE i.id = $1
         AND iu.usuario_id = $2
         AND iu.status = 'aprovado'
       LIMIT 1`,
      [idosoId, user.id]
    );

    return result.rowCount > 0;
  }

  async function ensureNeedBelongsToIdoso(idosoId, necessidadeId) {
    const result = await pool.query(
      `SELECT id, idoso_id, item, tipo, concluida_em
       FROM idoso_necessidades
       WHERE id = $1 AND idoso_id = $2
       LIMIT 1`,
      [necessidadeId, idosoId]
    );

    return result.rows[0] ?? null;
  }

  app.post("/api/idosos/:id/necessidades", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const item = String(req.body?.item || "").trim();
    const tipo = String(req.body?.tipo || "").trim();

    if (!item || !tipo) {
      return res.status(400).json({ message: "Item e tipo sao obrigatorios." });
    }

    if (!VALID_TIPOS.has(tipo)) {
      return res.status(400).json({ message: "Tipo de necessidade invalido." });
    }

    try {
      const isAllowed = await canManageIdoso(req.user, id);
      if (!isAllowed) {
        return res.status(403).json({ message: "Acesso negado para gerenciar necessidades deste idoso." });
      }

      const result = await pool.query(
        `INSERT INTO idoso_necessidades (idoso_id, item, tipo)
         VALUES ($1, $2, $3)
         RETURNING id, idoso_id, item, tipo, concluida_em, criado_em, atualizado_em`,
        [id, item, tipo]
      );

      return res.status(201).json({ necessidade: result.rows[0] });
    } catch (error) {
      console.error("Erro ao cadastrar necessidade:", error);
      return res.status(500).json({ message: "Erro interno ao cadastrar necessidade." });
    }
  });

  app.patch("/api/idosos/:id/necessidades/:necessidadeId", authMiddleware, async (req, res) => {
    const { id, necessidadeId } = req.params;
    const item = String(req.body?.item || "").trim();
    const tipo = String(req.body?.tipo || "").trim();

    if (!item && !tipo) {
      return res.status(400).json({ message: "Informe item ou tipo para atualizar." });
    }

    if (tipo && !VALID_TIPOS.has(tipo)) {
      return res.status(400).json({ message: "Tipo de necessidade invalido." });
    }

    try {
      const isAllowed = await canManageIdoso(req.user, id);
      if (!isAllowed) {
        return res.status(403).json({ message: "Acesso negado para gerenciar necessidades deste idoso." });
      }

      const currentNeed = await ensureNeedBelongsToIdoso(id, necessidadeId);
      if (!currentNeed) {
        return res.status(404).json({ message: "Necessidade nao encontrada para este idoso." });
      }

      const result = await pool.query(
        `UPDATE idoso_necessidades
         SET item = COALESCE(NULLIF($3, ''), item),
             tipo = COALESCE(NULLIF($4, ''), tipo),
             atualizado_em = NOW()
         WHERE id = $1 AND idoso_id = $2
         RETURNING id, idoso_id, item, tipo, concluida_em, criado_em, atualizado_em`,
        [necessidadeId, id, item, tipo]
      );

      return res.json({ necessidade: result.rows[0] });
    } catch (error) {
      console.error("Erro ao atualizar necessidade:", error);
      return res.status(500).json({ message: "Erro interno ao atualizar necessidade." });
    }
  });

  app.patch("/api/idosos/:id/necessidades/:necessidadeId/concluir", authMiddleware, async (req, res) => {
    const { id, necessidadeId } = req.params;

    try {
      const isAllowed = await canManageIdoso(req.user, id);
      if (!isAllowed) {
        return res.status(403).json({ message: "Acesso negado para gerenciar necessidades deste idoso." });
      }

      const currentNeed = await ensureNeedBelongsToIdoso(id, necessidadeId);
      if (!currentNeed) {
        return res.status(404).json({ message: "Necessidade nao encontrada para este idoso." });
      }

      const result = await pool.query(
        `UPDATE idoso_necessidades
         SET concluida_em = NOW(),
             atualizado_em = NOW()
         WHERE id = $1 AND idoso_id = $2
         RETURNING id, idoso_id, item, tipo, concluida_em, criado_em, atualizado_em`,
        [necessidadeId, id]
      );

      return res.json({ necessidade: result.rows[0] });
    } catch (error) {
      console.error("Erro ao concluir necessidade:", error);
      return res.status(500).json({ message: "Erro interno ao concluir necessidade." });
    }
  });
}
