-- ============================================================
-- ERP MAGMO — SCHEMA COMPLETO MULTI-TENANT
-- Projeto: orcclbqyzxrahpdpljmp
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─────────────────────────────────────────────────────────────
-- 1. TENANTS (EMPRESAS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  cnpj            TEXT UNIQUE,
  razao_social    TEXT,
  email           TEXT,
  telefone        TEXT,
  endereco        TEXT,
  cidade          TEXT,
  estado          CHAR(2),
  cep             TEXT,
  logo_url        TEXT,
  plano           TEXT NOT NULL DEFAULT 'free' CHECK (plano IN ('free','starter','pro','enterprise')),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. USUÁRIOS / PERFIS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfis (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL,
  cargo           TEXT,
  role            TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('superadmin','admin','gestor','engenheiro','financeiro','viewer')),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON perfis(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- 3. CLIENTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'pf' CHECK (tipo IN ('pf','pj')),
  nome            TEXT NOT NULL,
  cpf_cnpj        TEXT,
  email           TEXT,
  telefone        TEXT,
  celular         TEXT,
  endereco        TEXT,
  numero          TEXT,
  complemento     TEXT,
  bairro          TEXT,
  cidade          TEXT,
  estado          CHAR(2),
  cep             TEXT,
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes USING gin(nome gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- 4. FORNECEDORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'pj' CHECK (tipo IN ('pf','pj')),
  nome            TEXT NOT NULL,
  cpf_cnpj        TEXT,
  email           TEXT,
  telefone        TEXT,
  celular         TEXT,
  endereco        TEXT,
  cidade          TEXT,
  estado          CHAR(2),
  cep             TEXT,
  categoria       TEXT, -- materiais, serviços, equipamentos, etc.
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- 5. BANCO DE INSUMOS (multi-tenant + base pública)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE, -- NULL = base pública SINAPI/FDE
  codigo          TEXT,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL,           -- m², m³, kg, un, m, l, etc.
  categoria       TEXT,                    -- material, mão_de_obra, equipamento, serviço
  fonte           TEXT DEFAULT 'proprio',  -- sinapi, fde, orse, deinfra, proprio
  preco_unitario  NUMERIC(15,4) NOT NULL DEFAULT 0,
  referencia_mes  DATE,                    -- mês de referência do preço
  estado_ref      CHAR(2),                 -- UF de referência (para SINAPI estadual)
  desonerado      BOOLEAN DEFAULT FALSE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insumos_empresa ON insumos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_insumos_descricao ON insumos USING gin(descricao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_insumos_codigo ON insumos(codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_fonte ON insumos(fonte);

-- Histórico de preços dos insumos
CREATE TABLE IF NOT EXISTS insumos_historico_preco (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insumo_id       UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  preco_unitario  NUMERIC(15,4) NOT NULL,
  referencia_mes  DATE NOT NULL,
  fonte           TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 6. COMPOSIÇÕES (sempre baseadas em insumos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS composicoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  codigo          TEXT,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL,
  categoria       TEXT,
  fonte           TEXT DEFAULT 'proprio',
  custo_total     NUMERIC(15,4) NOT NULL DEFAULT 0, -- calculado automaticamente
  bdi_padrao      NUMERIC(5,2) DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_composicoes_empresa ON composicoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_composicoes_descricao ON composicoes USING gin(descricao gin_trgm_ops);

-- Itens de cada composição (insumos que a formam)
CREATE TABLE IF NOT EXISTS composicoes_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composicao_id   UUID NOT NULL REFERENCES composicoes(id) ON DELETE CASCADE,
  insumo_id       UUID NOT NULL REFERENCES insumos(id),
  quantidade      NUMERIC(15,4) NOT NULL,
  preco_unitario  NUMERIC(15,4) NOT NULL, -- snapshot no momento
  subtotal        NUMERIC(15,4) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  ordem           INT DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_composicoes_itens_comp ON composicoes_itens(composicao_id);

-- Trigger: recalcula custo_total da composição ao inserir/atualizar/deletar item
CREATE OR REPLACE FUNCTION fn_recalc_composicao_custo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE composicoes
  SET custo_total = (
    SELECT COALESCE(SUM(quantidade * preco_unitario),0)
    FROM composicoes_itens
    WHERE composicao_id = COALESCE(NEW.composicao_id, OLD.composicao_id)
  ),
  atualizado_em = NOW()
  WHERE id = COALESCE(NEW.composicao_id, OLD.composicao_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_composicao ON composicoes_itens;
CREATE TRIGGER trg_recalc_composicao
  AFTER INSERT OR UPDATE OR DELETE ON composicoes_itens
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_composicao_custo();

-- ─────────────────────────────────────────────────────────────
-- 7. OBRAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obras (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id        UUID REFERENCES clientes(id),
  codigo            TEXT,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  tipo              TEXT DEFAULT 'residencial', -- residencial, comercial, industrial, reforma, infraestrutura
  endereco          TEXT,
  cidade            TEXT,
  estado            CHAR(2),
  cep               TEXT,
  area_total        NUMERIC(10,2),        -- m²
  status            TEXT NOT NULL DEFAULT 'prospeccao'
                    CHECK (status IN ('prospeccao','orcamento','contratada','em_andamento','paralisada','concluida','cancelada')),
  data_inicio_prev  DATE,
  data_fim_prev     DATE,
  data_inicio_real  DATE,
  data_fim_real     DATE,
  valor_contrato    NUMERIC(15,2) DEFAULT 0,
  percentual_exec   NUMERIC(5,2) DEFAULT 0, -- % execução física
  responsavel_id    UUID REFERENCES perfis(id),
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_empresa ON obras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON obras(status);
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON obras(cliente_id);

-- Documentos e anexos da obra
CREATE TABLE IF NOT EXISTS obras_documentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  tipo            TEXT, -- contrato, planta, aro, foto, nf, outro
  url             TEXT NOT NULL,
  tamanho_bytes   BIGINT,
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diário de obras (ocorrências / registro diário)
CREATE TABLE IF NOT EXISTS obras_diario (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data_registro   DATE NOT NULL DEFAULT CURRENT_DATE,
  clima           TEXT,
  funcionarios    INT DEFAULT 0,
  descricao       TEXT NOT NULL,
  percentual      NUMERIC(5,2),
  fotos           TEXT[],         -- array de URLs
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diario_obra ON obras_diario(obra_id);

-- Equipe alocada na obra
CREATE TABLE IF NOT EXISTS obras_equipe (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  perfil_id       UUID REFERENCES perfis(id),
  nome_externo    TEXT,           -- colaborador não cadastrado no sistema
  funcao          TEXT,
  data_entrada    DATE,
  data_saida      DATE,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 8. ORÇAMENTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  obra_id         UUID REFERENCES obras(id),
  cliente_id      UUID REFERENCES clientes(id),
  numero          TEXT,           -- gerado automaticamente
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  status          TEXT NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','enviado','aprovado','reprovado','em_revisao','expirado')),
  versao          INT NOT NULL DEFAULT 1,
  bdi             NUMERIC(5,2) DEFAULT 0,    -- BDI global %
  desconto        NUMERIC(5,2) DEFAULT 0,    -- Desconto global %
  validade_dias   INT DEFAULT 30,
  validade_data   DATE,
  valor_custo     NUMERIC(15,2) DEFAULT 0,   -- calculado
  valor_bdi       NUMERIC(15,2) DEFAULT 0,   -- calculado
  valor_total     NUMERIC(15,2) DEFAULT 0,   -- calculado
  criado_por      UUID REFERENCES perfis(id),
  aprovado_por    UUID REFERENCES perfis(id),
  aprovado_em     TIMESTAMPTZ,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa ON orcamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_obra ON orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);

-- Grupos/Etapas do orçamento (WBS)
CREATE TABLE IF NOT EXISTS orcamentos_grupos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id    UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES orcamentos_grupos(id), -- hierarquia
  nome            TEXT NOT NULL,
  ordem           INT DEFAULT 0,
  valor_total     NUMERIC(15,2) DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Itens do orçamento (composições ou insumos diretos)
CREATE TABLE IF NOT EXISTS orcamentos_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id    UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  grupo_id        UUID REFERENCES orcamentos_grupos(id),
  tipo            TEXT NOT NULL DEFAULT 'composicao' CHECK (tipo IN ('composicao','insumo','servico')),
  composicao_id   UUID REFERENCES composicoes(id),
  insumo_id       UUID REFERENCES insumos(id),
  codigo          TEXT,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL,
  quantidade      NUMERIC(15,4) NOT NULL DEFAULT 0,
  preco_unitario  NUMERIC(15,4) NOT NULL DEFAULT 0,
  bdi_item        NUMERIC(5,2) DEFAULT 0,
  subtotal_custo  NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  subtotal_venda  NUMERIC(15,2) DEFAULT 0,
  ordem           INT DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orc_itens_orcamento ON orcamentos_itens(orcamento_id);

-- Trigger: recalcula totais do orçamento
CREATE OR REPLACE FUNCTION fn_recalc_orcamento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_orcamento_id UUID;
  v_bdi NUMERIC(5,2);
  v_custo NUMERIC(15,2);
  v_venda NUMERIC(15,2);
BEGIN
  v_orcamento_id := COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  
  SELECT bdi INTO v_bdi FROM orcamentos WHERE id = v_orcamento_id;
  
  SELECT COALESCE(SUM(quantidade * preco_unitario),0) INTO v_custo
  FROM orcamentos_itens WHERE orcamento_id = v_orcamento_id;
  
  v_venda := v_custo * (1 + COALESCE(v_bdi,0)/100);
  
  UPDATE orcamentos SET
    valor_custo = v_custo,
    valor_bdi   = v_venda - v_custo,
    valor_total = v_venda,
    atualizado_em = NOW()
  WHERE id = v_orcamento_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_orcamento ON orcamentos_itens;
CREATE TRIGGER trg_recalc_orcamento
  AFTER INSERT OR UPDATE OR DELETE ON orcamentos_itens
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_orcamento();

-- ─────────────────────────────────────────────────────────────
-- 9. ESTRUTURA FINANCEIRA (seguindo a lógica do fluxograma)
-- ─────────────────────────────────────────────────────────────

-- 9.1 Tipos de conta (baseado no fluxograma)
-- gerencial | operacional | fluxo_fixo | provisao | lucro_excedente

CREATE TABLE IF NOT EXISTS contas_financeiras (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  obra_id         UUID REFERENCES obras(id),          -- para contas operacionais por obra
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'gerencial',       -- CONTA GERENCIAL ITAU
                    'operacional',     -- C.O - OBRA X
                    'fluxo_fixo',      -- CONTA FLUXO FIXO
                    'provisao',        -- CONTA PROVISÕES
                    'lucro_excedente', -- LUCRO EXCEDENTE
                    'caixa'            -- CAIXA EMPRESA
                  )),
  subtipo         TEXT,   -- lucro | marketing | trabalhistas | tributarias (para provisões)
  banco           TEXT,
  agencia         TEXT,
  numero_conta    TEXT,
  saldo_inicial   NUMERIC(15,2) DEFAULT 0,
  saldo_atual     NUMERIC(15,2) DEFAULT 0,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_empresa ON contas_financeiras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_tipo ON contas_financeiras(tipo);

-- ─────────────────────────────────────────────────────────────
-- 10. LANÇAMENTOS FINANCEIROS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lancamentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  obra_id         UUID REFERENCES obras(id),
  conta_id        UUID NOT NULL REFERENCES contas_financeiras(id),
  conta_destino_id UUID REFERENCES contas_financeiras(id),  -- para transferências
  tipo            TEXT NOT NULL CHECK (tipo IN ('receita','despesa','transferencia','provisao')),
  categoria       TEXT NOT NULL,  -- ver tabela de categorias abaixo
  subcategoria    TEXT,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(15,2) NOT NULL,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_competencia DATE,
  data_vencimento DATE,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','recebido','cancelado','atrasado')),
  nf_numero       TEXT,
  nf_url          TEXT,
  fornecedor_id   UUID REFERENCES fornecedores(id),
  cliente_id      UUID REFERENCES clientes(id),
  recorrente      BOOLEAN DEFAULT FALSE,
  recorrencia     TEXT,           -- mensal, semanal, quinzenal
  observacoes     TEXT,
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_obra ON lancamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON lancamentos(conta_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);

-- Trigger: atualiza saldo da conta ao confirmar pagamento/recebimento
CREATE OR REPLACE FUNCTION fn_atualiza_saldo_conta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Ao marcar como pago/recebido
  IF NEW.status IN ('pago','recebido') AND (OLD.status IS NULL OR OLD.status NOT IN ('pago','recebido')) THEN
    IF NEW.tipo = 'receita' THEN
      UPDATE contas_financeiras SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
      WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'despesa' OR NEW.tipo = 'provisao' THEN
      UPDATE contas_financeiras SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
      WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'transferencia' THEN
      UPDATE contas_financeiras SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
      WHERE id = NEW.conta_id;
      IF NEW.conta_destino_id IS NOT NULL THEN
        UPDATE contas_financeiras SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
        WHERE id = NEW.conta_destino_id;
      END IF;
    END IF;
  END IF;
  -- Ao cancelar um lançamento que já estava pago
  IF NEW.status = 'cancelado' AND OLD.status IN ('pago','recebido') THEN
    IF OLD.tipo = 'receita' THEN
      UPDATE contas_financeiras SET saldo_atual = saldo_atual - OLD.valor, atualizado_em = NOW()
      WHERE id = OLD.conta_id;
    ELSIF OLD.tipo IN ('despesa','provisao') THEN
      UPDATE contas_financeiras SET saldo_atual = saldo_atual + OLD.valor, atualizado_em = NOW()
      WHERE id = OLD.conta_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saldo_conta ON lancamentos;
CREATE TRIGGER trg_saldo_conta
  AFTER UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION fn_atualiza_saldo_conta();

-- ─────────────────────────────────────────────────────────────
-- 11. CATEGORIAS DE LANÇAMENTO (baseadas no fluxograma)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_lancamento (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE, -- NULL = padrão sistema
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('receita','despesa','provisao','transferencia')),
  conta_tipo      TEXT,   -- qual tipo de conta esta categoria pertence
  icone           TEXT,
  cor             TEXT,
  ativo           BOOLEAN DEFAULT TRUE,
  ordem           INT DEFAULT 0
);

-- Inserir categorias padrão do sistema
INSERT INTO categorias_lancamento (id, nome, tipo, conta_tipo, cor, ordem) VALUES
  -- CONTA OPERACIONAL (despesas diretas de obra)
  (uuid_generate_v4(), 'Coord. Obra',        'despesa',   'operacional', '#ef4444', 1),
  (uuid_generate_v4(), 'Mão de Obra',        'despesa',   'operacional', '#ef4444', 2),
  (uuid_generate_v4(), 'Materiais',          'despesa',   'operacional', '#ef4444', 3),
  (uuid_generate_v4(), 'Equipamentos',       'despesa',   'operacional', '#ef4444', 4),
  (uuid_generate_v4(), 'EPI / Encargos',     'despesa',   'operacional', '#ef4444', 5),
  (uuid_generate_v4(), 'Benefícios',         'despesa',   'operacional', '#ef4444', 6),
  -- CONTA FLUXO FIXO (despesas fixas/administrativas)
  (uuid_generate_v4(), 'Despesas Escritório','despesa',   'fluxo_fixo',  '#f97316', 10),
  (uuid_generate_v4(), 'Jurídico / Contab.', 'despesa',   'fluxo_fixo',  '#f97316', 11),
  (uuid_generate_v4(), 'Aquisições',         'despesa',   'fluxo_fixo',  '#f97316', 12),
  (uuid_generate_v4(), 'Manutenção',         'despesa',   'fluxo_fixo',  '#f97316', 13),
  -- PROVISÕES — TRABALHISTAS
  (uuid_generate_v4(), 'INSS / FGTS',        'provisao',  'provisao',    '#f59e0b', 20),
  (uuid_generate_v4(), 'Multa FGTS',         'provisao',  'provisao',    '#f59e0b', 21),
  (uuid_generate_v4(), 'Rescisões',          'provisao',  'provisao',    '#f59e0b', 22),
  (uuid_generate_v4(), 'Acordo Trabalhista', 'provisao',  'provisao',    '#f59e0b', 23),
  -- PROVISÕES — TRIBUTÁRIAS
  (uuid_generate_v4(), 'PIS',                'provisao',  'provisao',    '#8b5cf6', 30),
  (uuid_generate_v4(), 'COFINS',             'provisao',  'provisao',    '#8b5cf6', 31),
  (uuid_generate_v4(), 'CSLL',               'provisao',  'provisao',    '#8b5cf6', 32),
  (uuid_generate_v4(), 'IRPJ',               'provisao',  'provisao',    '#8b5cf6', 33),
  (uuid_generate_v4(), 'ISS',                'provisao',  'provisao',    '#8b5cf6', 34),
  -- PROVISÕES — MARKETING
  (uuid_generate_v4(), 'Marketing C.D.E',    'provisao',  'provisao',    '#ec4899', 40),
  (uuid_generate_v4(), 'C.A.C',              'provisao',  'provisao',    '#ec4899', 41),
  -- LUCRO EXCEDENTE
  (uuid_generate_v4(), 'Bonificações',       'despesa',   'lucro_excedente','#10b981', 50),
  (uuid_generate_v4(), 'Premiações',         'despesa',   'lucro_excedente','#10b981', 51),
  (uuid_generate_v4(), 'Lucro Distribuído',  'despesa',   'lucro_excedente','#10b981', 52),
  (uuid_generate_v4(), 'Educação / Equip.',  'despesa',   'lucro_excedente','#10b981', 53),
  -- RECEITAS
  (uuid_generate_v4(), 'Medição de Obra',    'receita',   'gerencial',   '#22c55e', 60),
  (uuid_generate_v4(), 'Adiantamento',       'receita',   'gerencial',   '#22c55e', 61),
  (uuid_generate_v4(), 'Sinal / Entrada',    'receita',   'gerencial',   '#22c55e', 62),
  (uuid_generate_v4(), 'Outras Receitas',    'receita',   'gerencial',   '#22c55e', 63)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 12. REGRAS DE PROVISÃO AUTOMÁTICA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regras_provisao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  tipo_provisao   TEXT NOT NULL,  -- trabalhistas | tributarias | marketing | lucro
  percentual      NUMERIC(5,2) NOT NULL,
  conta_origem_id UUID REFERENCES contas_financeiras(id),
  conta_destino_id UUID REFERENCES contas_financeiras(id),
  ativo           BOOLEAN DEFAULT TRUE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 13. MEDIÇÕES DE OBRA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero          INT NOT NULL,
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  percentual_acum NUMERIC(5,2) DEFAULT 0,
  percentual_med  NUMERIC(5,2) DEFAULT 0,
  valor_medicao   NUMERIC(15,2) DEFAULT 0,
  valor_acumulado NUMERIC(15,2) DEFAULT 0,
  status          TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviada','aprovada','paga')),
  observacoes     TEXT,
  aprovado_por    UUID REFERENCES perfis(id),
  aprovado_em     TIMESTAMPTZ,
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Itens da medição
CREATE TABLE IF NOT EXISTS medicoes_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicao_id      UUID NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
  orcamento_item_id UUID REFERENCES orcamentos_itens(id),
  descricao       TEXT NOT NULL,
  unidade         TEXT,
  qtd_prev        NUMERIC(15,4) DEFAULT 0,
  qtd_acumulada   NUMERIC(15,4) DEFAULT 0,
  qtd_medicao     NUMERIC(15,4) DEFAULT 0,
  preco_unitario  NUMERIC(15,4) DEFAULT 0,
  valor_medicao   NUMERIC(15,2) DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- 14. CONTRATOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  obra_id         UUID REFERENCES obras(id),
  cliente_id      UUID REFERENCES clientes(id),
  orcamento_id    UUID REFERENCES orcamentos(id),
  numero          TEXT,
  tipo            TEXT DEFAULT 'obra' CHECK (tipo IN ('obra','servico','fornecimento','manutencao')),
  valor_total     NUMERIC(15,2) DEFAULT 0,
  data_assinatura DATE,
  data_inicio     DATE,
  data_fim_prev   DATE,
  data_fim_real   DATE,
  status          TEXT DEFAULT 'minuta' CHECK (status IN ('minuta','assinado','em_execucao','concluido','rescindido')),
  clausulas       TEXT,
  arquivo_url     TEXT,
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 15. DASHBOARD — VIEWS MATERIALIZADAS
-- ─────────────────────────────────────────────────────────────

-- View: resumo financeiro por empresa
CREATE OR REPLACE VIEW vw_resumo_financeiro AS
SELECT
  cf.empresa_id,
  cf.tipo,
  cf.subtipo,
  COUNT(*) AS qtd_contas,
  SUM(cf.saldo_atual) AS saldo_total
FROM contas_financeiras cf
WHERE cf.ativo = TRUE
GROUP BY cf.empresa_id, cf.tipo, cf.subtipo;

-- View: resumo de obras por empresa
CREATE OR REPLACE VIEW vw_resumo_obras AS
SELECT
  o.empresa_id,
  o.status,
  COUNT(*) AS qtd_obras,
  SUM(o.valor_contrato) AS valor_total_contratos,
  AVG(o.percentual_exec) AS percentual_medio_exec
FROM obras o
GROUP BY o.empresa_id, o.status;

-- View: DRE simplificado por obra
CREATE OR REPLACE VIEW vw_dre_obra AS
SELECT
  l.empresa_id,
  l.obra_id,
  o.nome AS obra_nome,
  SUM(CASE WHEN l.tipo = 'receita' AND l.status IN ('recebido','pago') THEN l.valor ELSE 0 END) AS receita_total,
  SUM(CASE WHEN l.tipo = 'despesa' AND l.status IN ('pago') THEN l.valor ELSE 0 END) AS despesa_total,
  SUM(CASE WHEN l.tipo = 'provisao' AND l.status IN ('pago') THEN l.valor ELSE 0 END) AS provisao_total,
  SUM(CASE WHEN l.tipo = 'receita' AND l.status IN ('recebido','pago') THEN l.valor ELSE 0 END)
    - SUM(CASE WHEN l.tipo IN ('despesa','provisao') AND l.status IN ('pago') THEN l.valor ELSE 0 END) AS resultado
FROM lancamentos l
LEFT JOIN obras o ON o.id = l.obra_id
GROUP BY l.empresa_id, l.obra_id, o.nome;

-- ─────────────────────────────────────────────────────────────
-- 16. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE composicoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE composicoes_itens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_documentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_diario          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_financeiras    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos             ENABLE ROW LEVEL SECURITY;

-- Função helper para pegar empresa_id do usuário logado
CREATE OR REPLACE FUNCTION auth_empresa_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT empresa_id FROM perfis WHERE id = auth.uid()
$$;

-- Políticas: cada usuário vê apenas dados da sua empresa
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['clientes','fornecedores','obras','obras_documentos',
    'obras_diario','orcamentos','orcamentos_itens','contas_financeiras',
    'lancamentos','medicoes','contratos'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS policy_empresa_%s ON %s', t, t);
    EXECUTE format(
      'CREATE POLICY policy_empresa_%s ON %s
       USING (empresa_id = auth_empresa_id())
       WITH CHECK (empresa_id = auth_empresa_id())',
      t, t
    );
  END LOOP;
END $$;

-- Insumos: usuário vê seus próprios + insumos públicos (empresa_id NULL)
DROP POLICY IF EXISTS policy_insumos ON insumos;
CREATE POLICY policy_insumos ON insumos
  USING (empresa_id IS NULL OR empresa_id = auth_empresa_id())
  WITH CHECK (empresa_id = auth_empresa_id());

DROP POLICY IF EXISTS policy_composicoes ON composicoes;
CREATE POLICY policy_composicoes ON composicoes
  USING (empresa_id IS NULL OR empresa_id = auth_empresa_id())
  WITH CHECK (empresa_id = auth_empresa_id());

-- Perfis: usuário vê apenas o seu perfil e da sua empresa
DROP POLICY IF EXISTS policy_perfis ON perfis;
CREATE POLICY policy_perfis ON perfis
  USING (empresa_id = auth_empresa_id());

-- ─────────────────────────────────────────────────────────────
-- 17. SEQUENCE PARA NUMERAÇÃO AUTOMÁTICA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequencias (
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,   -- orcamento | medicao | contrato | obra
  ultimo_numero   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, tipo)
);

CREATE OR REPLACE FUNCTION fn_proximo_numero(p_empresa_id UUID, p_tipo TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_num INT;
  v_ano TEXT;
BEGIN
  v_ano := TO_CHAR(NOW(), 'YY');
  
  INSERT INTO sequencias (empresa_id, tipo, ultimo_numero)
  VALUES (p_empresa_id, p_tipo, 1)
  ON CONFLICT (empresa_id, tipo)
  DO UPDATE SET ultimo_numero = sequencias.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_num;
  
  RETURN v_ano || '/' || LPAD(v_num::TEXT, 4, '0');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 18. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────
-- Execute via Supabase Dashboard ou API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('obras-documentos', 'obras-documentos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('orcamentos-pdf', 'orcamentos-pdf', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('empresas-logos', 'empresas-logos', true);

-- ─────────────────────────────────────────────────────────────
-- FIM DO SCHEMA
-- ─────────────────────────────────────────────────────────────
