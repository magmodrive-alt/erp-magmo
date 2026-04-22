import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, HardHat, Calendar, DollarSign, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardHeader, CardContent, Button, Loading, EmptyState,
  Badge, ProgressBar, StatCard, Select
} from '../../components/ui'
import type { Obra } from '../../types'
import {
  formatCurrency, formatDate, formatPercent,
  STATUS_OBRA_COLOR, STATUS_OBRA_LABEL
} from '../../lib/utils'

export default function ObrasPage() {
  const { empresa } = useAuth()
  const navigate = useNavigate()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  useEffect(() => { if (empresa?.id) fetchObras() }, [empresa?.id])

  async function fetchObras() {
    setLoading(true)
    const { data } = await supabase.from('obras')
      .select('*, clientes(nome)')
      .eq('empresa_id', empresa!.id)
      .order('criado_em', { ascending: false })
    setObras(data || [])
    setLoading(false)
  }

  const filtered = obras.filter(o => {
    const matchSearch = o.nome.toLowerCase().includes(search.toLowerCase()) ||
      (o.cidade || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: obras.length,
    ativas: obras.filter(o => o.status === 'em_andamento').length,
    valorTotal: obras.reduce((s, o) => s + o.valor_contrato, 0),
    concluidas: obras.filter(o => o.status === 'concluida').length,
  }

  const statusOptions = Object.entries(STATUS_OBRA_LABEL).map(([value, label]) => ({ value, label }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Obras</h1>
          <p className="text-sm text-gray-500 mt-1">{obras.length} obras cadastradas</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => navigate('/obras/nova')}>
          Nova Obra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total de Obras" value={stats.total} icon={<HardHat size={20} />} color="#f97316" />
        <StatCard title="Em Andamento" value={stats.ativas} icon={<HardHat size={20} />} color="#22c55e" />
        <StatCard title="Valor Total" value={formatCurrency(stats.valorTotal)} icon={<DollarSign size={20} />} color="#3b82f6" />
        <StatCard title="Concluídas" value={stats.concluidas} icon={<HardHat size={20} />} color="#8b5cf6" />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Buscar obras..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex gap-1 border border-gray-300 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('card')}
                className={`px-3 py-2 text-xs ${viewMode === 'card' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Cards
              </button>
              <button onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-xs ${viewMode === 'table' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Tabela
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon={<HardHat size={32} />} title="Nenhuma obra encontrada"
          action={<Button icon={<Plus size={16} />} size="sm" onClick={() => navigate('/obras/nova')}>Nova Obra</Button>} />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(obra => <ObraCard key={obra.id} obra={obra} />)}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Código','Obra','Cliente','Status','% Exec','Valor Contrato','Previsão Fim',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map(obra => (
                  <tr key={obra.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/obras/${obra.id}`)}>
                    <td className="px-4 py-3 text-xs text-gray-500">{obra.codigo || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">{obra.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{(obra as any).clientes?.nome || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_OBRA_COLOR[obra.status]}`}>
                        {STATUS_OBRA_LABEL[obra.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <ProgressBar value={obra.percentual_exec} />
                        <span className="text-xs text-gray-500">{obra.percentual_exec}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 text-sm">{formatCurrency(obra.valor_contrato)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{obra.data_fim_prev ? formatDate(obra.data_fim_prev) : '-'}</td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ObraCard({ obra }: { obra: Obra & { clientes?: any } }) {
  const navigate = useNavigate()
  const statusColor = STATUS_OBRA_COLOR[obra.status] || 'bg-gray-100 text-gray-700'

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer"
      onClick={() => navigate(`/obras/${obra.id}`)}
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {obra.codigo && <span className="text-xs text-gray-400 font-mono">{obra.codigo}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                {STATUS_OBRA_LABEL[obra.status]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-800 truncate">{obra.nome}</h3>
            {obra.clientes?.nome && <p className="text-xs text-gray-500 mt-0.5">{obra.clientes.nome}</p>}
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <HardHat size={20} className="text-orange-500" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Progresso */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Execução Física</span>
            <span className="font-semibold text-gray-700">{obra.percentual_exec}%</span>
          </div>
          <ProgressBar
            value={obra.percentual_exec}
            color={obra.percentual_exec > 80 ? '#22c55e' : obra.percentual_exec > 50 ? '#f97316' : '#3b82f6'}
          />
        </div>

        {/* Infos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400">Valor do Contrato</p>
            <p className="text-sm font-semibold text-gray-800">{formatCurrency(obra.valor_contrato)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tipo</p>
            <p className="text-sm font-medium text-gray-700 capitalize">{obra.tipo}</p>
          </div>
          {obra.cidade && (
            <div>
              <p className="text-xs text-gray-400">Local</p>
              <p className="text-sm text-gray-700">{obra.cidade}{obra.estado ? `/${obra.estado}` : ''}</p>
            </div>
          )}
          {obra.data_fim_prev && (
            <div>
              <p className="text-xs text-gray-400">Previsão Fim</p>
              <p className="text-sm text-gray-700 flex items-center gap-1">
                <Calendar size={11} />{formatDate(obra.data_fim_prev)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
