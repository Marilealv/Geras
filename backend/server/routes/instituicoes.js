export function registerInstituicoesRoutes({
  app,
  pool,
  authMiddleware,
  getApprovedMembership,
  createPendingMembership,
  resolveImageUrl,
  mapInstituicaoStatusToUi,
  mapModeradorActionToDbStatus,
  APPROVED_INSTITUICAO_STATUS,
}) {
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
        [req.user.id, nomeInstituicao, cnpj, endereco, cidade, estado, cep, telefone, descricao ?? "", imagemId ?? null]
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

      const instituicaoIds = instituicoes.map((instituicao) => instituicao.id);

      const idososResult = await pool.query(
        `SELECT i.id, i.instituicao_id, i.nome, i.idade, i.data_aniversario, i.historia, img.cloudinary_url AS foto_url
         FROM idosos i
         LEFT JOIN imagens img ON img.id = i.imagem_id
         WHERE i.instituicao_id = ANY($1::bigint[])
         ORDER BY i.criado_em DESC`,
        [instituicaoIds]
      );

      const idososByInstituicaoId = new Map();

      idososResult.rows.forEach((idoso) => {
        const current = idososByInstituicaoId.get(idoso.instituicao_id) || [];
        current.push({
          id: idoso.id,
          nome: idoso.nome,
          idade: idoso.idade,
          data_aniversario: idoso.data_aniversario,
          historia: idoso.historia,
          foto_url: idoso.foto_url,
        });
        idososByInstituicaoId.set(idoso.instituicao_id, current);
      });

      return res.json({
        instituicoes: instituicoes.map((row) => ({
          id: row.id,
          nome: row.nome,
          cnpj: row.cnpj,
          endereco: row.endereco,
          cidade: row.cidade,
          estado: row.estado,
          cep: row.cep,
          telefone: row.telefone,
          descricao: row.descricao,
          status: row.status,
          status_ui: mapInstituicaoStatusToUi(row.status),
          idosos: idososByInstituicaoId.get(row.id) || [],
        })),
      });
    } catch (error) {
      console.error("Erro ao listar instituicoes publicas:", error);
      return res.status(500).json({ message: "Erro interno ao listar instituicoes publicas." });
    }
  });

  app.put("/api/instituicoes/me", authMiddleware, async (req, res) => {
    const { nome, cnpj, endereco, cidade, estado, cep, telefone, descricao, imagemId, status } =
      req.body ?? {};

    try {
      const membership = await getApprovedMembership(req.user.id);

      if (!membership) {
        return res.status(403).json({ message: "Acesso negado para atualizar instituicao." });
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

      return res.json({
        instituicao: {
          ...result.rows[0],
          imagem_url: await resolveImageUrl(result.rows[0].imagem_id),
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar instituicao:", error);
      return res.status(500).json({ message: "Erro interno ao atualizar instituicao." });
    }
  });
}
