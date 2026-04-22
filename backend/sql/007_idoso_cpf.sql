-- ============================================================================
-- IDOSOS - CPF (VALIDACAO E UNICIDADE)
-- ============================================================================
--
-- Adiciona coluna de CPF para idosos com validação de formato e unicidade.
-- O CPF deve conter apenas 11 dígitos e ser único no sistema quando preenchido.
--
-- ARQUIVO: backend/sql/007_idoso_cpf.sql
-- ============================================================================

ALTER TABLE idosos
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

ALTER TABLE idosos
DROP CONSTRAINT IF EXISTS chk_idosos_cpf_formato;

ALTER TABLE idosos
ADD CONSTRAINT chk_idosos_cpf_formato
CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');

CREATE UNIQUE INDEX IF NOT EXISTS ux_idosos_cpf
  ON idosos (cpf)
  WHERE cpf IS NOT NULL;
