-- ============================================================
-- GESTÃO PRO — SISTEMA DE ASSINATURAS E BILLING
-- Módulo completo: planos, assinaturas anuais, parcelas,
-- controle de inadimplência, notificações e histórico
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PLANOS DISPONÍVEIS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                TEXT NOT NULL,          -- Starter, Pro, Enterprise
  slug                TEXT UNIQUE NOT NULL,   -- starter, pro, enterprise
  descricao           TEXT,
  -- Preços
  valor_mensal        NUMERIC(10,2) DEFAULT 0,   -- referência (não cobrado)
  valor_anual_avista  NUMERIC(10,2) NOT NULL,     -- pagamento único anual
  valor_anual_12x     NUMERIC(10,2) NOT NULL,     -- valor de cada parcela (12x)
  valor_anual_6x      NUMERIC(10,2) DEFAULT 0,    -- valor de cada parcela (6x)
  desconto_avista_pct NUMERIC(5,2) DEFAULT 0,     -- % desconto à vista vs 12x
  -- Limites
  max_obras           INT DEFAULT 5,
  max_usuarios        INT DEFAULT 3,
  max_orcamentos      INT DEFAULT 20,
  max_insumos         INT DEFAULT 500,
  -- Features (jsonb para flexibilidade)
  features            JSONB DEFAULT '[]',
  -- Trial
  trial_dias          INT DEFAULT 14,
  -- Status
  ativo               BOOLEAN DEFAULT TRUE,
  destaque            BOOLEAN DEFAULT FALSE,   -- plano em destaque no marketing
  ordem               INT DEFAULT 0,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Planos padrão do Gestão PRO
INSERT INTO planos (nome, slug, descricao, valor_mensal, valor_anual_avista, valor_anual_12x, valor_anual_6x, desconto_avista_pct, max_obras, max_usuarios, max_orcamentos, max_insumos, features, trial_dias, destaque, ordem)
VALUES
  (
    'Trial', 'trial',
    'Experimente grátis — até 2 obras, sem cartão de crédito',
    0.00, 0.00, 0.00, 0.00, 0.00,
    2, 1, 5, 50,
    '["Dashboard básico","Até 2 obras","1 usuário","Orçamentos (5)","Insumos limitados (50)","Sem suporte dedicado","Válido por 14 dias"]',
    14, FALSE, 0
  ),
  (
    'Starter', 'starter',
    'Ideal para construtoras pequenas e autônomos',
    97.00, 797.00, 87.00, 91.00, 23.5,
    5, 3, 30, 300,
    '["Dashboard","Clientes","Obras (5)","Insumos básicos","Orçamentos (30)","Financeiro básico","Suporte por email"]',
    14, FALSE, 1
  ),
  (
    'Pro', 'pro',
    'Para construtoras em crescimento com múltiplas obras',
    197.00, 1597.00, 167.00, 177.00, 20.4,
    30, 10, 200, 5000,
    '["Tudo do Starter","Obras ilimitadas","Composições","Medições","Provisões automáticas","Relatórios DRE","Suporte prioritário","Import SINAPI/FDE"]',
    14, TRUE, 2
  ),
  (
    'Enterprise', 'enterprise',
    'Para construtoras de médio e grande porte',
    397.00, 3197.00, 337.00, 357.00, 20.9,
    999, 50, 9999, 99999,
    '["Tudo do Pro","Usuários ilimitados","Multi-obras ilimitadas","API acesso","Customizações","Onboarding dedicado","SLA garantido","Suporte 24/7"]',
    30, FALSE, 3
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. ASSINATURAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  plano_id            UUID NOT NULL REFERENCES planos(id),
  -- Tipo e valores
  tipo_pagamento      TEXT NOT NULL DEFAULT 'parcelado'
                      CHECK (tipo_pagamento IN ('avista','parcelado_6x','parcelado_12x')),
  num_parcelas        INT NOT NULL DEFAULT 12,   -- 1=avista, 6, 12
  valor_total         NUMERIC(10,2) NOT NULL,    -- total do contrato anual
  valor_parcela       NUMERIC(10,2) NOT NULL,    -- valor de cada parcela
  desconto_aplicado   NUMERIC(10,2) DEFAULT 0,   -- R$ desconto concedido
  -- Status
  status              TEXT NOT NULL DEFAULT 'trial'
                      CHECK (status IN (
                        'trial',      -- período de teste
                        'ativa',      -- em dia
                        'atrasada',   -- tem parcela(s) vencida(s)
                        'suspensa',   -- suspensa manualmente
                        'cancelada',  -- cancelada definitivamente
                        'expirada'    -- encerrou o período sem renovar
                      )),
  -- Datas
  data_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim            DATE NOT NULL,             -- data_inicio + 1 ano
  trial_fim           DATE,                      -- fim do período trial
  data_cancelamento   DATE,
  motivo_cancelamento TEXT,
  -- Controle
  dia_vencimento      INT NOT NULL DEFAULT 10
                      CHECK (dia_vencimento BETWEEN 1 AND 28),
  renovacao_automatica BOOLEAN DEFAULT TRUE,
  -- Identificação externa (para integração futura com gateway)
  gateway_id          TEXT,                      -- ID no Asaas/Vindi/Stripe
  gateway             TEXT,                      -- asaas, stripe, manual
  -- Responsável pela venda
  vendedor            TEXT,
  origem              TEXT DEFAULT 'organico',   -- organico, indicacao, ads
  -- Observações
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status  ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano   ON assinaturas(plano_id);

-- ─────────────────────────────────────────────────────────────
-- 3. PARCELAS DA ASSINATURA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas_parcelas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assinatura_id       UUID NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_parcela      INT NOT NULL,              -- 1, 2, 3... (1 = única se avista)
  valor               NUMERIC(10,2) NOT NULL,
  -- Datas
  data_vencimento     DATE NOT NULL,
  data_pagamento      DATE,                      -- preenchido ao confirmar
  data_compensacao    DATE,                      -- quando o dinheiro entrou de fato
  -- Status
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN (
                        'pendente',   -- aguardando vencimento
                        'vencendo',   -- vence em até 7 dias
                        'pago',       -- pago e confirmado
                        'atrasado',   -- passou do vencimento sem pagar
                        'cancelado'   -- parcela cancelada
                      )),
  dias_atraso         INT GENERATED ALWAYS AS (
                        CASE
                          WHEN status = 'atrasado' AND data_pagamento IS NULL
                          THEN (CURRENT_DATE - data_vencimento)::INT
                          ELSE 0
                        END
                      ) STORED,
  -- Pagamento
  metodo_pagamento    TEXT CHECK (metodo_pagamento IN ('pix','boleto','cartao_credito','cartao_debito','transferencia','dinheiro','cheque')),
  valor_pago          NUMERIC(10,2),             -- pode diferir por multa/desconto
  multa               NUMERIC(10,2) DEFAULT 0,
  juros               NUMERIC(10,2) DEFAULT 0,
  desconto            NUMERIC(10,2) DEFAULT 0,
  -- Comprovante
  comprovante_url     TEXT,
  banco_origem        TEXT,
  codigo_transacao    TEXT,
  -- Confirmação
  confirmado_por      UUID REFERENCES perfis(id),
  -- Notificações enviadas
  notificado_7d       BOOLEAN DEFAULT FALSE,     -- aviso 7 dias antes
  notificado_3d       BOOLEAN DEFAULT FALSE,     -- aviso 3 dias antes
  notificado_1d       BOOLEAN DEFAULT FALSE,     -- aviso no dia
  notificado_atraso   INT DEFAULT 0,             -- qtd de cobranças pós-vencimento
  -- Observações
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_assinatura    ON assinaturas_parcelas(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_empresa       ON assinaturas_parcelas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status        ON assinaturas_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento    ON assinaturas_parcelas(data_vencimento);

-- ─────────────────────────────────────────────────────────────
-- 4. FUNÇÃO: GERAR PARCELAS AUTOMATICAMENTE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_gerar_parcelas(p_assinatura_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_ass         RECORD;
  i             INT;
  v_vencimento  DATE;
  v_total       INT;
BEGIN
  SELECT * INTO v_ass FROM assinaturas WHERE id = p_assinatura_id;
  
  -- Limpar parcelas existentes (apenas pendentes)
  DELETE FROM assinaturas_parcelas
  WHERE assinatura_id = p_assinatura_id AND status = 'pendente';
  
  v_total := v_ass.num_parcelas;
  
  FOR i IN 1..v_total LOOP
    -- Calcula data de vencimento: mês i a partir do início
    v_vencimento := DATE_TRUNC('month', v_ass.data_inicio)
                    + (i || ' month')::INTERVAL
                    + (v_ass.dia_vencimento - 1 || ' day')::INTERVAL;
    
    -- Ajuste: se dia não existe no mês (ex: 31 em fevereiro), usa último dia
    v_vencimento := LEAST(v_vencimento,
                    (DATE_TRUNC('month', v_vencimento) + '1 month'::INTERVAL - '1 day'::INTERVAL)::DATE);
    
    INSERT INTO assinaturas_parcelas (
      assinatura_id, empresa_id, numero_parcela, valor, data_vencimento, status
    ) VALUES (
      p_assinatura_id,
      v_ass.empresa_id,
      i,
      v_ass.valor_parcela,
      v_vencimento,
      CASE WHEN v_vencimento <= CURRENT_DATE THEN 'atrasado' ELSE 'pendente' END
    );
  END LOOP;
  
  RETURN v_total;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGER: GERAR PARCELAS AO CRIAR ASSINATURA
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trigger_gerar_parcelas()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Só gera parcelas para assinaturas não-trial
  IF NEW.status != 'trial' THEN
    PERFORM fn_gerar_parcelas(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_parcelas ON assinaturas;
CREATE TRIGGER trg_gerar_parcelas
  AFTER INSERT ON assinaturas
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_gerar_parcelas();

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: ATUALIZAR STATUS DA ASSINATURA QUANDO PARCELA MUDA
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_status_assinatura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tem_atrasado    BOOLEAN;
  v_todas_pagas     BOOLEAN;
  v_novo_status     TEXT;
  v_status_atual    TEXT;
BEGIN
  -- Verifica situação das parcelas desta assinatura
  SELECT
    EXISTS(SELECT 1 FROM assinaturas_parcelas
           WHERE assinatura_id = COALESCE(NEW.assinatura_id, OLD.assinatura_id)
           AND status = 'atrasado'),
    NOT EXISTS(SELECT 1 FROM assinaturas_parcelas
               WHERE assinatura_id = COALESCE(NEW.assinatura_id, OLD.assinatura_id)
               AND status NOT IN ('pago','cancelado'))
  INTO v_tem_atrasado, v_todas_pagas;
  
  SELECT status INTO v_status_atual FROM assinaturas
  WHERE id = COALESCE(NEW.assinatura_id, OLD.assinatura_id);
  
  -- Não mexe em assinaturas suspensas/canceladas/expiradas manualmente
  IF v_status_atual IN ('suspensa','cancelada','expirada') THEN
    RETURN NEW;
  END IF;
  
  IF v_todas_pagas THEN
    v_novo_status := 'ativa';
  ELSIF v_tem_atrasado THEN
    v_novo_status := 'atrasada';
  ELSE
    v_novo_status := 'ativa';
  END IF;
  
  UPDATE assinaturas
  SET status = v_novo_status, atualizado_em = NOW()
  WHERE id = COALESCE(NEW.assinatura_id, OLD.assinatura_id)
  AND status != v_novo_status;
  
  -- Atualiza plano da empresa ao pagar
  IF NEW.status = 'pago' THEN
    UPDATE empresas e
    SET atualizado_em = NOW()
    FROM assinaturas a
    WHERE a.id = NEW.assinatura_id
    AND e.id = a.empresa_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_status_assinatura ON assinaturas_parcelas;
CREATE TRIGGER trg_sync_status_assinatura
  AFTER INSERT OR UPDATE ON assinaturas_parcelas
  FOR EACH ROW EXECUTE FUNCTION fn_sync_status_assinatura();

-- ─────────────────────────────────────────────────────────────
-- 7. FUNÇÃO: MARCAR PARCELAS VENCIDAS (executar diariamente via cron)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_processar_vencimentos()
RETURNS TABLE(parcelas_marcadas INT, assinaturas_atualizadas INT) LANGUAGE plpgsql AS $$
DECLARE
  v_parc_count  INT;
  v_ass_count   INT;
BEGIN
  -- Marca parcelas pendentes que venceram
  UPDATE assinaturas_parcelas
  SET status = 'atrasado', atualizado_em = NOW()
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;
  GET DIAGNOSTICS v_parc_count = ROW_COUNT;
  
  -- Marca parcelas que vencem em 7 dias
  UPDATE assinaturas_parcelas
  SET status = 'vencendo', atualizado_em = NOW()
  WHERE status = 'pendente'
  AND data_vencimento BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7);
  
  -- Atualiza status das assinaturas com parcelas atrasadas
  UPDATE assinaturas
  SET status = 'atrasada', atualizado_em = NOW()
  WHERE id IN (
    SELECT DISTINCT assinatura_id FROM assinaturas_parcelas WHERE status = 'atrasado'
  )
  AND status NOT IN ('suspensa','cancelada','expirada','trial');
  GET DIAGNOSTICS v_ass_count = ROW_COUNT;
  
  -- Expira assinaturas com data_fim passada
  UPDATE assinaturas
  SET status = 'expirada', atualizado_em = NOW()
  WHERE data_fim < CURRENT_DATE
  AND status NOT IN ('cancelada','expirada');
  
  -- Bloqueia empresas com assinatura atrasada há mais de 15 dias
  UPDATE empresas
  SET ativo = FALSE
  WHERE id IN (
    SELECT a.empresa_id FROM assinaturas a
    JOIN assinaturas_parcelas p ON p.assinatura_id = a.id
    WHERE p.status = 'atrasado'
    AND p.data_vencimento < (CURRENT_DATE - 15)
    AND a.status = 'atrasada'
  );
  
  RETURN QUERY SELECT v_parc_count, v_ass_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. FUNÇÃO: CONFIRMAR PAGAMENTO DE PARCELA
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_confirmar_pagamento(
  p_parcela_id      UUID,
  p_valor_pago      NUMERIC(10,2),
  p_metodo          TEXT,
  p_data_pagamento  DATE DEFAULT CURRENT_DATE,
  p_codigo_transacao TEXT DEFAULT NULL,
  p_comprovante_url TEXT DEFAULT NULL,
  p_confirmado_por  UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE assinaturas_parcelas SET
    status            = 'pago',
    valor_pago        = p_valor_pago,
    metodo_pagamento  = p_metodo,
    data_pagamento    = p_data_pagamento,
    data_compensacao  = p_data_pagamento,
    codigo_transacao  = p_codigo_transacao,
    comprovante_url   = p_comprovante_url,
    confirmado_por    = p_confirmado_por,
    -- Calcula multa e juros se houver atraso
    multa = CASE
      WHEN data_vencimento < p_data_pagamento
      THEN ROUND(valor * 0.02, 2)  -- 2% de multa
      ELSE 0
    END,
    juros = CASE
      WHEN data_vencimento < p_data_pagamento
      THEN ROUND(valor * 0.001 * (p_data_pagamento - data_vencimento), 2)  -- 0,1% ao dia
      ELSE 0
    END,
    atualizado_em = NOW()
  WHERE id = p_parcela_id;
  
  -- Reativa empresa se estava suspensa por inadimplência
  UPDATE empresas e SET ativo = TRUE, atualizado_em = NOW()
  FROM assinaturas_parcelas p
  JOIN assinaturas a ON a.id = p.assinatura_id
  WHERE p.id = p_parcela_id
  AND e.id = a.empresa_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. HISTÓRICO DE EVENTOS DA ASSINATURA (auditoria)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas_eventos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assinatura_id   UUID NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_evento     TEXT NOT NULL,
  -- ativacao | pagamento | atraso | suspensao | cancelamento |
  -- reativacao | upgrade | downgrade | renovacao | trial_inicio | trial_fim
  descricao       TEXT,
  dados_anteriores JSONB,
  dados_novos      JSONB,
  usuario_id      UUID REFERENCES perfis(id),
  ip              TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_assinatura ON assinaturas_eventos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa    ON assinaturas_eventos(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- 10. NOTIFICAÇÕES DE COBRANÇA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cobrancas_notificacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcela_id      UUID NOT NULL REFERENCES assinaturas_parcelas(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  -- aviso_7d | aviso_3d | aviso_1d | vencimento | atraso_1d |
  -- atraso_7d | atraso_15d | suspensao | cancelamento
  canal           TEXT NOT NULL DEFAULT 'email',  -- email | whatsapp | sms
  destinatario    TEXT,                            -- email/telefone
  assunto         TEXT,
  mensagem        TEXT,
  status          TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro','ignorado')),
  enviado_em      TIMESTAMPTZ,
  erro_mensagem   TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 11. VIEWS GERENCIAIS (PAINEL SAAS ADMIN)
-- ─────────────────────────────────────────────────────────────

-- View: resumo de todas as assinaturas
CREATE OR REPLACE VIEW vw_saas_assinaturas AS
SELECT
  e.id            AS empresa_id,
  e.nome          AS empresa_nome,
  e.cnpj,
  e.email         AS empresa_email,
  e.ativo         AS empresa_ativa,
  p.nome          AS plano_nome,
  p.slug          AS plano_slug,
  a.id            AS assinatura_id,
  a.status,
  a.tipo_pagamento,
  a.num_parcelas,
  a.valor_total,
  a.valor_parcela,
  a.data_inicio,
  a.data_fim,
  a.trial_fim,
  a.dia_vencimento,
  a.vendedor,
  a.origem,
  -- Parcelas pagas
  (SELECT COUNT(*) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status = 'pago') AS parcelas_pagas,
  -- Parcelas em atraso
  (SELECT COUNT(*) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status = 'atrasado') AS parcelas_atrasadas,
  -- Parcelas pendentes
  (SELECT COUNT(*) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status IN ('pendente','vencendo')) AS parcelas_pendentes,
  -- Valor já recebido
  (SELECT COALESCE(SUM(valor_pago),0) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status = 'pago') AS valor_recebido,
  -- Valor em aberto
  (SELECT COALESCE(SUM(valor),0) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status IN ('pendente','vencendo','atrasado')) AS valor_aberto,
  -- Próximo vencimento
  (SELECT MIN(data_vencimento) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status IN ('pendente','vencendo')) AS proximo_vencimento,
  -- Dias em atraso (maior atraso)
  (SELECT MAX(CURRENT_DATE - data_vencimento) FROM assinaturas_parcelas ap
   WHERE ap.assinatura_id = a.id AND ap.status = 'atrasado') AS max_dias_atraso,
  a.criado_em     AS assinatura_criada_em
FROM assinaturas a
JOIN empresas e ON e.id = a.empresa_id
JOIN planos   p ON p.id = a.plano_id
ORDER BY
  CASE a.status
    WHEN 'atrasada'  THEN 1
    WHEN 'trial'     THEN 2
    WHEN 'ativa'     THEN 3
    WHEN 'suspensa'  THEN 4
    WHEN 'expirada'  THEN 5
    WHEN 'cancelada' THEN 6
  END,
  a.criado_em DESC;

-- View: MRR (Monthly Recurring Revenue) e métricas SaaS
CREATE OR REPLACE VIEW vw_saas_mrr AS
SELECT
  p.slug AS plano,
  p.nome AS plano_nome,
  COUNT(a.id) FILTER (WHERE a.status = 'ativa')    AS clientes_ativos,
  COUNT(a.id) FILTER (WHERE a.status = 'trial')    AS em_trial,
  COUNT(a.id) FILTER (WHERE a.status = 'atrasada') AS inadimplentes,
  -- MRR: receita mensal recorrente
  SUM(a.valor_parcela) FILTER (WHERE a.status = 'ativa') AS mrr,
  -- ARR: receita anual recorrente
  SUM(a.valor_total) FILTER (WHERE a.status = 'ativa')  AS arr
FROM assinaturas a
JOIN planos p ON p.id = a.plano_id
GROUP BY p.slug, p.nome, p.ordem
ORDER BY p.ordem;

-- View: parcelas para o painel financeiro do SaaS
CREATE OR REPLACE VIEW vw_saas_parcelas AS
SELECT
  ap.id,
  ap.assinatura_id,
  ap.empresa_id,
  e.nome          AS empresa_nome,
  e.email         AS empresa_email,
  pl.nome         AS plano_nome,
  ap.numero_parcela,
  a.num_parcelas,
  ap.valor,
  ap.valor_pago,
  ap.multa,
  ap.juros,
  ap.data_vencimento,
  ap.data_pagamento,
  ap.status,
  ap.dias_atraso,
  ap.metodo_pagamento,
  ap.codigo_transacao,
  ap.comprovante_url,
  a.tipo_pagamento
FROM assinaturas_parcelas ap
JOIN assinaturas a  ON a.id  = ap.assinatura_id
JOIN empresas    e  ON e.id  = ap.empresa_id
JOIN planos      pl ON pl.id = a.plano_id
ORDER BY
  CASE ap.status WHEN 'atrasado' THEN 1 WHEN 'vencendo' THEN 2 WHEN 'pendente' THEN 3 ELSE 4 END,
  ap.data_vencimento;

-- ─────────────────────────────────────────────────────────────
-- 12. RLS PARA BILLING (apenas superadmin acessa)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE planos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas_parcelas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas_eventos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas_notificacoes   ENABLE ROW LEVEL SECURITY;

-- Superadmin vê tudo
CREATE OR REPLACE FUNCTION auth_is_superadmin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'superadmin'
  )
$$;

-- Planos: todos leem (para landing page), só superadmin escreve
DROP POLICY IF EXISTS policy_planos_read ON planos;
CREATE POLICY policy_planos_read ON planos FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS policy_planos_write ON planos;
CREATE POLICY policy_planos_write ON planos FOR ALL USING (auth_is_superadmin());

-- Assinaturas: empresa vê a sua, superadmin vê todas
DROP POLICY IF EXISTS policy_assinaturas ON assinaturas;
CREATE POLICY policy_assinaturas ON assinaturas
  USING (empresa_id = auth_empresa_id() OR auth_is_superadmin());

DROP POLICY IF EXISTS policy_assinaturas_parcelas ON assinaturas_parcelas;
CREATE POLICY policy_assinaturas_parcelas ON assinaturas_parcelas
  USING (empresa_id = auth_empresa_id() OR auth_is_superadmin());

DROP POLICY IF EXISTS policy_assinaturas_eventos ON assinaturas_eventos;
CREATE POLICY policy_assinaturas_eventos ON assinaturas_eventos
  USING (empresa_id = auth_empresa_id() OR auth_is_superadmin());

-- Notificações: apenas superadmin
DROP POLICY IF EXISTS policy_notificacoes ON cobrancas_notificacoes;
CREATE POLICY policy_notificacoes ON cobrancas_notificacoes
  USING (auth_is_superadmin());

-- ─────────────────────────────────────────────────────────────
-- 13. ADICIONAR COLUNAS DE BILLING NA TABELA EMPRESAS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS plano          TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plano_status   TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_fim      DATE,
  ADD COLUMN IF NOT EXISTS bloqueada      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- ─────────────────────────────────────────────────────────────
-- 14. CONTROLE DE LIMITE DE OBRAS POR PLANO (Trial = 2 obras)
-- ─────────────────────────────────────────────────────────────

-- Função: verifica se empresa pode criar mais obras
CREATE OR REPLACE FUNCTION fn_verificar_limite_obras(p_empresa_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_plano_slug    TEXT;
  v_max_obras     INT;
  v_obras_ativas  INT;
  v_bloqueada     BOOLEAN;
BEGIN
  -- Busca plano atual da empresa via assinatura ativa
  SELECT p.slug, p.max_obras
  INTO v_plano_slug, v_max_obras
  FROM assinaturas a
  JOIN planos p ON p.id = a.plano_id
  WHERE a.empresa_id = p_empresa_id
  AND a.status IN ('trial','ativa')
  ORDER BY a.criado_em DESC
  LIMIT 1;

  -- Se não tem assinatura, aplica limites do Trial (padrão)
  IF v_plano_slug IS NULL THEN
    v_plano_slug := 'trial';
    v_max_obras  := 2;
  END IF;

  -- Conta obras ativas da empresa
  SELECT COUNT(*) INTO v_obras_ativas
  FROM obras
  WHERE empresa_id = p_empresa_id
  AND status NOT IN ('concluida','cancelada');

  -- Verifica bloqueio
  SELECT bloqueada INTO v_bloqueada FROM empresas WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'pode_criar',    (NOT COALESCE(v_bloqueada, FALSE)) AND (v_obras_ativas < v_max_obras),
    'plano',         v_plano_slug,
    'max_obras',     v_max_obras,
    'obras_ativas',  v_obras_ativas,
    'obras_restantes', GREATEST(0, v_max_obras - v_obras_ativas),
    'bloqueada',     COALESCE(v_bloqueada, FALSE),
    'motivo',        CASE
                       WHEN COALESCE(v_bloqueada, FALSE) THEN 'Empresa bloqueada por inadimplência'
                       WHEN v_obras_ativas >= v_max_obras THEN
                         CASE WHEN v_plano_slug = 'trial'
                              THEN 'Limite do plano Trial atingido (2 obras). Faça upgrade para continuar.'
                              ELSE 'Limite de obras do plano ' || v_plano_slug || ' atingido. Faça upgrade.'
                         END
                       ELSE NULL
                     END
  );
END;
$$;

-- Trigger: bloqueia INSERT em obras se exceder limite do plano
CREATE OR REPLACE FUNCTION fn_trigger_limite_obras()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_check JSONB;
BEGIN
  v_check := fn_verificar_limite_obras(NEW.empresa_id);

  IF NOT (v_check->>'pode_criar')::BOOLEAN THEN
    RAISE EXCEPTION 'LIMITE_OBRAS: %', v_check->>'motivo'
      USING HINT = 'Faça upgrade do seu plano em Configurações > Assinatura';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limite_obras ON obras;
CREATE TRIGGER trg_limite_obras
  BEFORE INSERT ON obras
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_limite_obras();

-- View: limites por empresa (útil para frontend mostrar progresso)
CREATE OR REPLACE VIEW vw_empresa_limites AS
SELECT
  e.id            AS empresa_id,
  e.nome          AS empresa_nome,
  COALESCE(p.slug, 'trial')      AS plano_slug,
  COALESCE(p.nome, 'Trial')      AS plano_nome,
  COALESCE(p.max_obras, 2)       AS max_obras,
  COALESCE(p.max_usuarios, 1)    AS max_usuarios,
  COALESCE(p.max_orcamentos, 5)  AS max_orcamentos,
  COALESCE(p.max_insumos, 50)    AS max_insumos,
  -- Uso atual
  (SELECT COUNT(*) FROM obras o
   WHERE o.empresa_id = e.id AND o.status NOT IN ('concluida','cancelada'))
   AS obras_ativas,
  (SELECT COUNT(*) FROM perfis pf WHERE pf.empresa_id = e.id AND pf.ativo = TRUE)
   AS usuarios_ativos,
  -- % de uso das obras
  ROUND(
    (SELECT COUNT(*) FROM obras o
     WHERE o.empresa_id = e.id AND o.status NOT IN ('concluida','cancelada'))::NUMERIC
    / NULLIF(COALESCE(p.max_obras, 2), 0) * 100, 1
  ) AS obras_uso_pct,
  -- Flags
  e.bloqueada,
  a.status AS assinatura_status,
  a.trial_fim
FROM empresas e
LEFT JOIN assinaturas a ON a.empresa_id = e.id
  AND a.status IN ('trial','ativa')
  AND a.criado_em = (
    SELECT MAX(a2.criado_em) FROM assinaturas a2
    WHERE a2.empresa_id = e.id AND a2.status IN ('trial','ativa')
  )
LEFT JOIN planos p ON p.id = a.plano_id;

-- ─────────────────────────────────────────────────────────────
-- FIM DO MÓDULO DE BILLING
-- ============================================================
