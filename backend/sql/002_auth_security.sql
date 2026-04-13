-- ============================================================================
-- AUTH SECURITY - LOGIN LOCKOUT + TOKEN REVOGATION
-- ============================================================================
--
-- Regras implementadas:
-- 1) Bloqueio de login por 5 minutos apos 5 tentativas falhas consecutivas.
-- 2) Revogacao de token JWT no logout para impedir reutilizacao.
--
-- ARQUIVO: backend/sql/002_auth_security.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_tentativas_login (
  email TEXT PRIMARY KEY,
  tentativas_falhas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas_falhas >= 0),
  bloqueado_ate TIMESTAMPTZ,
  ultima_falha_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tentativas_login_bloqueado_ate
  ON auth_tentativas_login (bloqueado_ate);

CREATE TABLE IF NOT EXISTS auth_tokens_revogados (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  revogado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_revogados_expira_em
  ON auth_tokens_revogados (expira_em);
