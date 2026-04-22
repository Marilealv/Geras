export function registerIdososRoutes({
  app,
  pool,
  authMiddleware,
  getApprovedMembership,
  resolveImageUrl,
  APPROVED_INSTITUICAO_STATUS,
}) {
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

      const instituicaoResult = await pool.query("SELECT id, status FROM instituicoes WHERE id = $1 LIMIT 1", [
        membership.instituicao_id,
      ]);

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

  app.get("/api/idosos/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const isModerador = req.user?.tipo === "moderador";

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

      // Verificar se o usuário autenticado pode editar o idoso
      let userCanEdit = false;
      if (userId) {
        if (isModerador) {
          userCanEdit = true;
        } else {
          // Verificar se o usuário tem vínculo aprovado com a instituição do idoso
          const permissionResult = await pool.query(
            `SELECT 1 FROM instituicao_usuarios
             WHERE instituicao_id = $1 AND usuario_id = $2 AND status = 'aprovado'
             LIMIT 1`,
            [idosoResult.rows[0].instituicao_id, userId]
          );
          userCanEdit = permissionResult.rowCount > 0;
        }
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
          user_can_edit: userCanEdit,
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
}
