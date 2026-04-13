-- ============================================================================
-- MODERACAO - MOTIVO DE RECUSA
-- ============================================================================
--
-- Armazena o motivo informado pelo moderador ao recusar instituicoes.
--
-- ARQUIVO: backend/sql/003_moderacao_recusa.sql
-- ============================================================================

ALTER TABLE instituicoes
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;
