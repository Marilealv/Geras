-- ============================================================================
-- IDOSO_NECESSIDADES - STATUS DE CONCLUSAO
-- ============================================================================
--
-- Adiciona data de conclusao para permitir editar e concluir necessidades sem
-- exibir itens finalizados na interface.
--
-- ARQUIVO: backend/sql/005_idoso_necessidades_conclusao.sql
-- ============================================================================

ALTER TABLE idoso_necessidades
ADD COLUMN IF NOT EXISTS concluida_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_idoso_necessidades_concluida_em
  ON idoso_necessidades (concluida_em);
