import { useEffect, useState } from 'react'
import {
  HardHat, DollarSign, FileText, Users, TrendingUp,
  AlertTriangle, CheckCircle, Clock, ArrowUpRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  StatCard, Card, CardHeader, CardTitle, CardContent,
  Badge, Loading, ProgressBar
} from '../../components/ui'
import { formatCurrency, formatDate, STATUS_OBRA_COLOR, STATUS_OBRA_LABEL } from '../../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { empresa } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalObras: 0,
    obrasAtivas: 0,
    totalOrcamentos: 0,
    valorObras: 0,
    totalClientes: 0,
    saldoGerencial: 0,
    saldoOperacional: 0,
    provisoes: 0,
    receitaMes: 0,
    despesaMes: 0,
  })
  const [obrasRecentes, setObrasRecentes] = useState<any[]>([])
  const [obrasPorStatus, setObrasPorStatus] = useState<any[]>([])
  const [fluxoMensal, setFluxoMensal] = useState<any[]>([])
  const [lancamentosPendentes, setLancamentosPendentes] = useState<any[]>([])

  useEffect(() => {
    if (!empresa?.id) return
    fetchData()
  }, [empresa?.id])

  async function fetchData() {
    setLoading(true)
    try {
      const [
        { data: obras },
        { data: orcamentos },
        { data: clientes },
        { data: contas },
        { data: lancamentos },
      ] = await Promise.all([
        supabase.from('obras').select('*').eq('empresa_id', empresa!.id),
        supabase.from('orcamentos').select('*').eq('empresa_id', empresa!.id),
        supabase.from('clientes').select('id').eq('empresa_id', empresa!.id),
        supabase.from('contas_financeiras').select('*').eq('empresa_id', empresa!.id).eq('ativo', true),
        supabase.from('lancamentos').select('*, contas_financeiras(nome,tipo)').eq('empresa_id', empresa!.id)
          .in('status', ['pendente','atrasado']).order('data_vencimento', { ascending: true }).limit(5),
      ])

      const obrasArr = obras || []
      const contasArr = contas || []

      // Obras por status para gráfico de pizza
      const statusCount: Record<string, number> = {}
      obrasArr.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })
      setObrasPorStatus(Object.entries(statusCount).map(([status, value]) => ({
        name: STATUS_OBRA_LABEL[status] || status,
        value,
        status,
      })))

      // Saldos por tipo de conta
      const gerencial = contasArr.filter(c => c.tipo === 'gerencial').reduce((s, c) => s + (c.saldo_atual || 0), 0)
      const operacional = contasArr.filter(c => c.tipo === 'operacional').reduce((s, c) => s + (c.saldo_atual || 0), 0)
      const provisoes = contasArr.filter(c => c.tipo === 'provisao').reduce((s, c) => s + (c.saldo_atual || 0), 0)

      // Obras recentes
      setObrasRecentes(obrasArr.slice(0, 5))
      setLancamentosPendentes(lancamentos || [])

      // Fluxo mensal simulado (últimos 6 meses)
      const meses = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr']
      setFluxoMensal(meses.map((mes, i) => ({
        mes,
        receita: Math.random() * 50000 + 20000,
        despesa: Math.random() * 30000 + 10000,
      })))

      setStats({
        totalObras: obrasArr.length,
        obrasAtivas: obrasArr.filter(o => o.status === 'em_andamento').length,
        totalOrcamentos: (orcamentos || []).length,
        valorObras: obrasArr.reduce((s, o) => s + (o.valor_contrato || 0), 0),
        totalClientes: (clientes || []).length,
        saldoGerencial: gerencial,
        saldoOperacional: operacional,
        provisoes,
        receitaMes: 0,
        despesaMes: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Carregando dashboard..." />

  const COLORS_PIE = ['#3b82f6', '#f59e0b', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#6b7280']

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Bem-vindo ao ERP MAGMO — visão geral da empresa</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Obras Ativas"
          value={stats.obrasAtivas}
          subtitle={`de ${stats.totalObras} total`}
          icon={<HardHat size={20} />}
          color="#f97316"
          trend={{ value: 12, label: 'vs mês anterior' }}
        />
        <StatCard
          title="Valor em Obras"
          value={formatCurrency(stats.valorObras)}
          subtitle="valor total contratado"
          icon={<TrendingUp size={20} />}
          color="#3b82f6"
        />
        <StatCard
          title="Saldo Gerencial"
          value={formatCurrency(stats.saldoGerencial)}
          subtitle="Conta Gerencial ITAÚ"
          icon={<DollarSign size={20} />}
          color="#22c55e"
        />
        <StatCard
          title="Provisões"
          value={formatCurrency(stats.provisoes)}
          subtitle="trabalhistas + tributárias"
          icon={<AlertTriangle size={20} />}
          color="#8b5cf6"
        />
      </div>

      {/* Segunda linha de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Orçamentos"
          value={stats.totalOrcamentos}
          subtitle="elaborados"
          icon={<FileText size={20} />}
          color="#f59e0b"
        />
        <StatCard
          title="Clientes"
          value={stats.totalClientes}
          subtitle="cadastrados"
          icon={<Users size={20} />}
          color="#06b6d4"
        />
        <StatCard
          title="Saldo Operacional"
          value={formatCurrency(stats.saldoOperacional)}
          subtitle="total das obras"
          icon={<DollarSign size={20} />}
          color="#f97316"
        />
        <StatCard
          title="Resultado Mês"
          value={formatCurrency(stats.receitaMes - stats.despesaMes)}
          subtitle="receitas - despesas"
          icon={<TrendingUp size={20} />}
          color={stats.receitaMes >= stats.despesaMes ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Caixa — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Obras por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Obras por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {obrasPorStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={obrasPorStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" paddingAngle={3}>
                    {obrasPorStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
                Nenhuma obra cadastrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obras Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Obras Recentes</CardTitle>
            <Link to="/obras" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {obrasRecentes.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Nenhuma obra cadastrada</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {obrasRecentes.map(obra => (
                  <div key={obra.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HardHat size={16} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{obra.nome}</p>
                      <p className="text-xs text-gray-400">{obra.cidade} · {formatCurrency(obra.valor_contrato)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_OBRA_COLOR[obra.status]}`}>
                        {STATUS_OBRA_LABEL[obra.status]}
                      </span>
                      <div className="w-20">
                        <ProgressBar value={obra.percentual_exec} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lançamentos Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contas a Pagar / Vencer</CardTitle>
            <Link to="/financeiro/lancamentos" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {lancamentosPendentes.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <CheckCircle className="mx-auto mb-2 text-green-400" size={24} />
                Nenhum lançamento pendente
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {lancamentosPendentes.map(l => (
                  <div key={l.id} className="px-6 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.status === 'atrasado' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                      <p className="text-xs text-gray-400">{l.categoria} · vence {formatDate(l.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{formatCurrency(l.valor)}</p>
                      <Badge variant={l.status === 'atrasado' ? 'danger' : 'warning'}>
                        {l.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
