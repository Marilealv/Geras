-- ============================================================================
-- AUTH - VERIFICACAO DE E-MAIL E RECUPERACAO DE SENHA
-- ============================================================================
--
-- 1) Exige verificacao de e-mail para login.
-- 2) Armazena tokens de verificacao de e-mail.
-- 3) Armazena tokens de redefinicao de senha com expiracao.
--
-- ARQUIVO: backend/sql/008_auth_email_verification_reset.sql
-- ============================================================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_email_verificado
  ON usuarios (email_verificado);

CREATE TABLE IF NOT EXISTS auth_email_verificacao_tokens (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_email_verificacao_tokens_usuario_id
  ON auth_email_verificacao_tokens (usuario_id);

CREATE INDEX IF NOT EXISTS idx_auth_email_verificacao_tokens_expira_em
  ON auth_email_verificacao_tokens (expira_em);

CREATE TABLE IF NOT EXISTS auth_reset_senha_tokens (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_reset_senha_tokens_usuario_id
  ON auth_reset_senha_tokens (usuario_id);

CREATE INDEX IF NOT EXISTS idx_auth_reset_senha_tokens_expira_em
  ON auth_reset_senha_tokens (expira_em);
