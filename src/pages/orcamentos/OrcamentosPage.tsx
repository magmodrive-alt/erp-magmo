import { useEffect, useState } from 'react'
import { Plus, Search, FileText, Edit2, Eye, Copy, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardHeader, CardContent, Button, Loading, EmptyState, StatCard, Badge
} from '../../components/ui'
import type { Orcamento } from '../../types'
import { formatCurrency, formatDate, STATUS_ORC_COLOR, STATUS_ORC_LABEL } from '../../lib/utils'

export default function OrcamentosPage() {
  const { empresa } = useAuth()
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { if (empresa?.id) fetchOrcamentos() }, [empresa?.id])

  async function fetchOrcamentos() {
    setLoading(true)
    const { data } = await supabase.from('orcamentos')
      .select('*, obras(nome), clientes(nome)')
      .eq('empresa_id', empresa!.id)
      .order('criado_em', { ascending: false })
    setOrcamentos(data || [])
    setLoading(false)
  }

  const filtered = orcamentos.filter(o => {
    const matchSearch = o.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (o.numero || '').includes(search)
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: orcamentos.length,
    aprovados: orcamentos.filter(o => o.status === 'aprovado').length,
    valorTotal: orcamentos.reduce((s, o) => s + o.valor_total, 0),
    valorAprovado: orcamentos.filter(o => o.status === 'aprovado').reduce((s, o) => s + o.valor_total, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-1">{orcamentos.length} orçamentos elaborados</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => navigate('/orcamentos/novo')}>
          Novo Orçamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total" value={stats.total} icon={<FileText size={20} />} color="#3b82f6" />
        <StatCard title="Aprovados" value={stats.aprovados} icon={<FileText size={20} />} color="#22c55e" />
        <StatCard title="Valor Total" value={formatCurrency(stats.valorTotal)} icon={<TrendingUp size={20} />} color="#f97316" />
        <StatCard title="Valor Aprovado" value={formatCurrency(stats.valorAprovado)} icon={<TrendingUp size={20} />} color="#22c55e" />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Buscar orçamento..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_ORC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </CardContent>
      </Card>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="Nenhum orçamento encontrado"
          action={<Button icon={<Plus size={16} />} size="sm" onClick={() => navigate('/orcamentos/novo')}>Novo Orçamento</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(orc => (
            <Card key={orc.id} className="hover:shadow-md hover:border-orange-300 transition-all cursor-pointer"
              onClick={() => navigate(`/orcamentos/${orc.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {orc.numero && <span className="text-xs text-gray-400 font-mono">{orc.numero}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_ORC_COLOR[orc.status]}`}>
                        {STATUS_ORC_LABEL[orc.status]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{orc.titulo}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {(orc as any).clientes?.nome && <span>{(orc as any).clientes.nome}</span>}
                      {(orc as any).obras?.nome && <span>· {(orc as any).obras.nome}</span>}
                      <span>· v{orc.versao}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-1">{formatDate(orc.criado_em)}</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(orc.valor_total)}</p>
                    {orc.bdi > 0 && <p className="text-xs text-gray-400">BDI {orc.bdi}%</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
