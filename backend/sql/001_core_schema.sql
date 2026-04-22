-- ============================================================================
-- SCHEMA DO BANCO DE DADOS - GERAS
-- ============================================================================
-- 
-- Sistema de gerenciamento de doações e cuidados para idosos.
-- 
-- TABELAS PRINCIPAIS:
--   usuarios: Usuários do sistema (donatários e moderadores)
--   imagens: Metadados de imagens armazenadas no Cloudinary
--   instituicoes: Instituições de cuidado (1 por usuário donatário)
--   idosos: Idosos sob cuidado (1 para many instituições)
--   idoso_necessidades: Necessidades/desejos de cada idoso
--   logs_auditoria: Log de auditoria de todas as operações DML
-- 
-- ARQUIVO: backend/sql/001_core_schema.sql
-- ============================================================================

-- Tabela de usuários (donatários e moderadores)
CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('moderador', 'donatario')),
  nome_responsavel TEXT NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de imagens (armazenadas no Cloudinary)
CREATE TABLE imagens (
  id BIGSERIAL PRIMARY KEY,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  mime_type TEXT,
  bytes INTEGER,
  largura INTEGER,
  altura INTEGER,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imagens_criado_por_usuario_id ON imagens(criado_por_usuario_id);

-- Tabela de instituições
CREATE TABLE instituicoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cep VARCHAR(9) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  descricao TEXT,
  imagem_id BIGINT REFERENCES imagens(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instituicoes_usuario_id ON instituicoes(usuario_id);
CREATE INDEX idx_instituicoes_status ON instituicoes(status);
CREATE INDEX idx_instituicoes_imagem_id ON instituicoes(imagem_id);

-- Tabela de idosos
CREATE TABLE idosos (
  id BIGSERIAL PRIMARY KEY,
  instituicao_id BIGINT NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  idade INTEGER NOT NULL CHECK (idade >= 0 AND idade <= 130),
  data_aniversario DATE,
  imagem_id BIGINT REFERENCES imagens(id) ON DELETE SET NULL,
  historia TEXT,
  hobbies TEXT,
  musica_favorita TEXT,
  comida_favorita TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_idosos_instituicao_id ON idosos(instituicao_id);
CREATE INDEX idx_idosos_nome ON idosos(nome);
CREATE INDEX idx_idosos_imagem_id ON idosos(imagem_id);

-- Tabela de necessidades dos idosos
CREATE TABLE idoso_necessidades (
  id BIGSERIAL PRIMARY KEY,
  idoso_id BIGINT NOT NULL REFERENCES idosos(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('urgente', 'desejado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_idoso_necessidades_idoso_id ON idoso_necessidades(idoso_id);
CREATE INDEX idx_idoso_necessidades_tipo ON idoso_necessidades(tipo);

-- Tabela de logs de auditoria
CREATE TABLE logs_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registro_id TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  usuario_banco TEXT NOT NULL DEFAULT CURRENT_USER,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_auditoria_tabela ON logs_auditoria(tabela);
CREATE INDEX idx_logs_auditoria_ocorrido_em ON logs_auditoria(ocorrido_em DESC);

CREATE TABLE logs_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registro_id TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  usuario_banco TEXT NOT NULL DEFAULT CURRENT_USER,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_auditoria_tabela ON logs_auditoria(tabela);
CREATE INDEX idx_logs_auditoria_ocorrido_em ON logs_auditoria(ocorrido_em DESC);

-- Função para atualizar o campo atualizado_em
CREATE FUNCTION fn_set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Função para auditoria de operações DML
CREATE FUNCTION fn_auditoria_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO logs_auditoria (tabela, operacao, registro_id, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO logs_auditoria (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO logs_auditoria (tabela, operacao, registro_id, dados_antes)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id::TEXT, to_jsonb(OLD));
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers para atualizar atualizado_em
CREATE TRIGGER trg_set_atualizado_em_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em_imagens
BEFORE UPDATE ON imagens
FOR EACH ROW
EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em_instituicoes
BEFORE UPDATE ON instituicoes
FOR EACH ROW
EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em_idosos
BEFORE UPDATE ON idosos
FOR EACH ROW
EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_set_atualizado_em_idoso_necessidades
BEFORE UPDATE ON idoso_necessidades
FOR EACH ROW
EXECUTE FUNCTION fn_set_atualizado_em();

-- Triggers para auditoria
CREATE TRIGGER trg_auditoria_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_dml();

CREATE TRIGGER trg_auditoria_instituicoes
AFTER INSERT OR UPDATE OR DELETE ON instituicoes
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_dml();

CREATE TRIGGER trg_auditoria_idosos
AFTER INSERT OR UPDATE OR DELETE ON idosos
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_dml();

CREATE TRIGGER trg_auditoria_idoso_necessidades
AFTER INSERT OR UPDATE OR DELETE ON idoso_necessidades
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_dml();

CREATE TRIGGER trg_auditoria_imagens
AFTER INSERT OR UPDATE OR DELETE ON imagens
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_dml();
