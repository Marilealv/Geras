-- ============================================================================
-- MULTI-USUARIO POR INSTITUICAO + GESTAO DE USUARIOS
-- ============================================================================
--
-- 1) Permite varios usuarios vinculados a uma instituicao com aprovacao.
-- 2) Permite moderador bloquear usuario e forcar troca de senha.
--
-- ARQUIVO: backend/sql/004_multi_usuario_instituicao_e_admin.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS instituicao_usuarios (
  id BIGSERIAL PRIMARY KEY,
  instituicao_id BIGINT NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil TEXT NOT NULL DEFAULT 'membro' CHECK (perfil IN ('proprietario', 'admin', 'membro')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,
  aprovado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_rejeicao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instituicao_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_instituicao_usuarios_usuario_status
  ON instituicao_usuarios (usuario_id, status);

CREATE INDEX IF NOT EXISTS idx_instituicao_usuarios_instituicao_status
  ON instituicao_usuarios (instituicao_id, status);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;

-- Migra o dono legado de instituicoes.usuario_id para tabela de vinculos.
INSERT INTO instituicao_usuarios (instituicao_id, usuario_id, perfil, status, solicitado_em, aprovado_em, aprovado_por_usuario_id)
SELECT i.id, i.usuario_id, 'proprietario', 'aprovado', COALESCE(i.criado_em, NOW()), COALESCE(i.criado_em, NOW()), i.usuario_id
FROM instituicoes i
WHERE i.usuario_id IS NOT NULL
ON CONFLICT (instituicao_id, usuario_id)
DO UPDATE SET
  perfil = 'proprietario',
  status = 'aprovado',
  aprovado_em = COALESCE(instituicao_usuarios.aprovado_em, EXCLUDED.aprovado_em),
  aprovado_por_usuario_id = COALESCE(instituicao_usuarios.aprovado_por_usuario_id, EXCLUDED.aprovado_por_usuario_id),
  atualizado_em = NOW();
