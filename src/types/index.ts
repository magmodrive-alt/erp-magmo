export type UserRole = 'superadmin' | 'admin' | 'gestor' | 'engenheiro' | 'financeiro' | 'viewer'
export type PlanoEmpresa = 'free' | 'starter' | 'pro' | 'enterprise'

export interface Empresa {
  id: string
  nome: string
  cnpj?: string
  razao_social?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  logo_url?: string
  plano: PlanoEmpresa
  ativo: boolean
  criado_em: string
}

export interface Perfil {
  id: string
  empresa_id: string
  nome: string
  email: string
  cargo?: string
  role: UserRole
  ativo: boolean
  avatar_url?: string
  criado_em: string
}

export interface Cliente {
  id: string
  empresa_id: string
  tipo: 'pf' | 'pj'
  nome: string
  cpf_cnpj?: string
  email?: string
  telefone?: string
  celular?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  ativo: boolean
  criado_em: string
}

export interface Fornecedor {
  id: string
  empresa_id: string
  tipo: 'pf' | 'pj'
  nome: string
  cpf_cnpj?: string
  email?: string
  telefone?: string
  categoria?: string
  cidade?: string
  estado?: string
  ativo: boolean
  criado_em: string
}

export interface Insumo {
  id: string
  empresa_id?: string
  codigo?: string
  descricao: string
  unidade: string
  categoria?: string
  fonte: string
  preco_unitario: number
  referencia_mes?: string
  estado_ref?: string
  desonerado: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Composicao {
  id: string
  empresa_id?: string
  codigo?: string
  descricao: string
  unidade: string
  categoria?: string
  fonte: string
  custo_total: number
  bdi_padrao: number
  ativo: boolean
  criado_em: string
  composicoes_itens?: ComposicaoItem[]
}

export interface ComposicaoItem {
  id: string
  composicao_id: string
  insumo_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  ordem: number
  insumo?: Insumo
}

export type ObraStatus = 'prospeccao' | 'orcamento' | 'contratada' | 'em_andamento' | 'paralisada' | 'concluida' | 'cancelada'

export interface Obra {
  id: string
  empresa_id: string
  cliente_id?: string
  codigo?: string
  nome: string
  descricao?: string
  tipo: string
  endereco?: string
  cidade?: string
  estado?: string
  area_total?: number
  status: ObraStatus
  data_inicio_prev?: string
  data_fim_prev?: string
  data_inicio_real?: string
  data_fim_real?: string
  valor_contrato: number
  percentual_exec: number
  observacoes?: string
  criado_em: string
  cliente?: Cliente
}

export interface ObraDiario {
  id: string
  obra_id: string
  data_registro: string
  clima?: string
  funcionarios: number
  descricao: string
  percentual?: number
  fotos?: string[]
  criado_em: string
}

export type OrcamentoStatus = 'rascunho' | 'enviado' | 'aprovado' | 'reprovado' | 'em_revisao' | 'expirado'

export interface Orcamento {
  id: string
  empresa_id: string
  obra_id?: string
  cliente_id?: string
  numero?: string
  titulo: string
  descricao?: string
  status: OrcamentoStatus
  versao: number
  bdi: number
  desconto: number
  validade_dias: number
  valor_custo: number
  valor_bdi: number
  valor_total: number
  observacoes?: string
  criado_em: string
  atualizado_em: string
  obra?: Obra
  cliente?: Cliente
  orcamentos_itens?: OrcamentoItem[]
}

export interface OrcamentoItem {
  id: string
  orcamento_id: string
  grupo_id?: string
  tipo: 'composicao' | 'insumo' | 'servico'
  composicao_id?: string
  insumo_id?: string
  codigo?: string
  descricao: string
  unidade: string
  quantidade: number
  preco_unitario: number
  bdi_item: number
  subtotal_custo: number
  subtotal_venda: number
  ordem: number
}

export type TipoConta = 'gerencial' | 'operacional' | 'fluxo_fixo' | 'provisao' | 'lucro_excedente' | 'caixa'

export interface ContaFinanceira {
  id: string
  empresa_id: string
  obra_id?: string
  nome: string
  tipo: TipoConta
  subtipo?: string
  banco?: string
  agencia?: string
  numero_conta?: string
  saldo_inicial: number
  saldo_atual: number
  ativo: boolean
  criado_em: string
  obra?: Obra
}

export type LancamentoStatus = 'pendente' | 'pago' | 'recebido' | 'cancelado' | 'atrasado'
export type TipoLancamento = 'receita' | 'despesa' | 'transferencia' | 'provisao'

export interface Lancamento {
  id: string
  empresa_id: string
  obra_id?: string
  conta_id: string
  conta_destino_id?: string
  tipo: TipoLancamento
  categoria: string
  subcategoria?: string
  descricao: string
  valor: number
  data_lancamento: string
  data_competencia?: string
  data_vencimento?: string
  data_pagamento?: string
  status: LancamentoStatus
  nf_numero?: string
  fornecedor_id?: string
  cliente_id?: string
  recorrente: boolean
  observacoes?: string
  criado_em: string
  conta?: ContaFinanceira
  obra?: Obra
}

export interface Medicao {
  id: string
  empresa_id: string
  obra_id: string
  numero: number
  periodo_inicio: string
  periodo_fim: string
  percentual_acum: number
  percentual_med: number
  valor_medicao: number
  valor_acumulado: number
  status: 'rascunho' | 'enviada' | 'aprovada' | 'paga'
  criado_em: string
  obra?: Obra
}

export interface Contrato {
  id: string
  empresa_id: string
  obra_id?: string
  cliente_id?: string
  orcamento_id?: string
  numero?: string
  tipo: string
  valor_total: number
  data_assinatura?: string
  data_inicio?: string
  data_fim_prev?: string
  status: string
  criado_em: string
}
