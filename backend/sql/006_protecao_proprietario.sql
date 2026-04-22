-- ARQUIVO: backend/sql/006_protecao_proprietario.sql
-- Descrição: Garante que apenas o criador da instituição pode ter perfil 'proprietario'
-- Data: 2026-04-22

-- TRIGGER: Prevenir promoção de usuários não-criadores para 'proprietario'
CREATE OR REPLACE FUNCTION validate_proprietario_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está tentando setar como proprietario
  IF NEW.perfil = 'proprietario' THEN
    -- Verifica se o usuário é o criador da instituição
    IF (
      SELECT i.usuario_id
      FROM instituicoes i
      WHERE i.id = NEW.instituicao_id
    ) != NEW.usuario_id THEN
      RAISE EXCEPTION 'Apenas o criador da instituição pode ter o perfil proprietario';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_proprietario ON instituicao_usuarios;
CREATE TRIGGER trigger_validate_proprietario
BEFORE INSERT OR UPDATE ON instituicao_usuarios
FOR EACH ROW
EXECUTE FUNCTION validate_proprietario_assignment();

-- VALIDAÇÃO: Garantir que dados existentes estão corretos
-- (Opcional: executar para verificar e corrigir dados problemáticos no banco)
-- UPDATE instituicao_usuarios
-- SET perfil = 'membro'
-- WHERE perfil = 'proprietario'
--   AND (instituicao_id, usuario_id) NOT IN (
--     SELECT id, usuario_id FROM instituicoes
--   );
