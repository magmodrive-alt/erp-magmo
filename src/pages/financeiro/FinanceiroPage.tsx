import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardHeader, CardTitle, CardContent, Loading, StatCard, Badge, ProgressBar
} from '../../components/ui'
import { formatCurrency, TIPO_CONTA_LABEL, TIPO_CONTA_COLOR } from '../../lib/utils'
import { Banknote, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Building2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function FinanceiroPage() {
  const { empresa } = useAuth()
  const [loading, setLoading] = useState(true)
  const [contas, setContas] = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])

  useEffect(() => { if (empresa?.id) fetchData() }, [empresa?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from('contas_financeiras').select('*').eq('empresa_id', empresa!.id).eq('ativo', true),
      supabase.from('lancamentos').select('*').eq('empresa_id', empresa!.id)
        .gte('data_lancamento', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .order('data_lancamento', { ascending: false })
    ])
    setContas(c || [])
    setLancamentos(l || [])
    setLoading(false)
  }

  // Agrupar contas por tipo
  const contasPorTipo = contas.reduce((acc: Record<string, any[]>, c) => {
    acc[c.tipo] = [...(acc[c.tipo] || []), c]
    return acc
  }, {})

  // Saldo por tipo
  const saldoPorTipo = Object.entries(contasPorTipo).map(([tipo, cs]) => ({
    tipo,
    nome: TIPO_CONTA_LABEL[tipo],
    saldo: cs.reduce((s, c) => s + (c.saldo_atual || 0), 0),
    qtd: cs.length,
    cor: TIPO_CONTA_COLOR[tipo],
  }))

  // Receitas e despesas do mês
  const receitaMes = lancamentos.filter(l => l.tipo === 'receita' && l.status === 'recebido').reduce((s, l) => s + l.valor, 0)
  const despesaMes = lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  const provisoesMes = lancamentos.filter(l => l.tipo === 'provisao' && l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  const resultadoMes = receitaMes - despesaMes - provisoesMes

  const totalGeral = contas.reduce((s, c) => s + (c.saldo_atual || 0), 0)

  if (loading) return <Loading text="Carregando financeiro..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral das contas e movimentações</p>
      </div>

      {/* Stats do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Saldo Total" value={formatCurrency(totalGeral)} icon={<Banknote size={20} />} color="#0f1729" />
        <StatCard title="Receitas do Mês" value={formatCurrency(receitaMes)} icon={<TrendingUp size={20} />} color="#22c55e" />
        <StatCard title="Despesas do Mês" value={formatCurrency(despesaMes)} icon={<TrendingDown size={20} />} color="#ef4444" />
        <StatCard
          title="Resultado do Mês"
          value={formatCurrency(resultadoMes)}
          icon={<TrendingUp size={20} />}
          color={resultadoMes >= 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* Estrutura de Contas (seguindo o fluxograma) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Conta Gerencial */}
        <ContaTipoCard
          tipo="gerencial"
          contas={contasPorTipo['gerencial'] || []}
          descricao="Hub financeiro central da empresa"
        />
        {/* Conta Operacional */}
        <ContaTipoCard
          tipo="operacional"
          contas={contasPorTipo['operacional'] || []}
          descricao="Custos diretos por obra"
        />
        {/* Fluxo Fixo */}
        <ContaTipoCard
          tipo="fluxo_fixo"
          contas={contasPorTipo['fluxo_fixo'] || []}
          descricao="Despesas administrativas fixas"
        />
        {/* Provisões */}
        <ContaTipoCard
          tipo="provisao"
          contas={contasPorTipo['provisao'] || []}
          descricao="Trabalhistas, tributárias e marketing"
        />
        {/* Lucro Excedente */}
        <ContaTipoCard
          tipo="lucro_excedente"
          contas={contasPorTipo['lucro_excedente'] || []}
          descricao="Bonificações, premiações e investimentos"
        />
      </div>

      {/* Gráfico saldos por tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Saldos por Tipo de Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={saldoPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="saldo" radius={[0, 6, 6, 0]}>
                {saldoPorTipo.map((entry, index) => (
                  <Cell key={index} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Últimos lançamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lançamentos do Mês</CardTitle>
          <Link to="/financeiro/lancamentos" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {lancamentos.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Nenhum lançamento este mês</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lancamentos.slice(0, 8).map(l => (
                <div key={l.id} className="px-6 py-3 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    l.tipo === 'receita' ? 'bg-green-500' :
                    l.tipo === 'provisao' ? 'bg-purple-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                    <p className="text-xs text-gray-400">{l.categoria} · {l.data_lancamento}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {l.tipo === 'receita' ? '+' : '-'}{formatCurrency(l.valor)}
                    </p>
                    <span className={`text-xs ${
                      l.status === 'pago' || l.status === 'recebido' ? 'text-green-500' :
                      l.status === 'atrasado' ? 'text-red-500' : 'text-yellow-500'
                    }`}>{l.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ContaTipoCard({ tipo, contas, descricao }: { tipo: string; contas: any[]; descricao: string }) {
  const saldoTotal = contas.reduce((s, c) => s + (c.saldo_atual || 0), 0)
  const cor = TIPO_CONTA_COLOR[tipo]
  const label = TIPO_CONTA_LABEL[tipo]

  return (
    <Link to="/financeiro/contas" className="block">
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-opacity-70 transition-all h-full"
        style={{ borderTopColor: cor, borderTopWidth: 3 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cor + '20' }}>
            <Building2 size={16} style={{ color: cor }} />
          </div>
          <span className="text-xs text-gray-400">{contas.length} conta{contas.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-800">{formatCurrency(saldoTotal)}</p>
        <p className="text-xs text-gray-400 mt-1">{descricao}</p>
      </div>
    </Link>
  )
}
