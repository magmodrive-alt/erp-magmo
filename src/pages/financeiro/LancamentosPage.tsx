import { useEffect, useState } from 'react'
import { Plus, Search, Filter, CheckCircle, XCircle, ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardContent, Button, Loading, EmptyState, Modal, Input, Select, Textarea, Badge
} from '../../components/ui'
import type { Lancamento } from '../../types'
import { formatCurrency, formatDate } from '../../lib/utils'

const CATEGORIAS_DESPESA = [
  'Coord. Obra','Mão de Obra','Materiais','Equipamentos','EPI / Encargos','Benefícios',
  'Despesas Escritório','Jurídico / Contab.','Aquisições','Manutenção',
  'INSS / FGTS','Multa FGTS','Rescisões','Acordo Trabalhista',
  'PIS','COFINS','CSLL','IRPJ','ISS','Marketing C.D.E','C.A.C',
  'Bonificações','Premiações','Lucro Distribuído','Educação / Equip.','Outras Despesas'
]
const CATEGORIAS_RECEITA = ['Medição de Obra','Adiantamento','Sinal / Entrada','Outras Receitas']

export default function LancamentosPage() {
  const { empresa } = useAuth()
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [contas, setContas] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMes, setFilterMes] = useState(new Date().toISOString().slice(0, 7))
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return {
      tipo: 'despesa', categoria: '', subcategoria: '', descricao: '', valor: '',
      conta_id: '', conta_destino_id: '', obra_id: '', cliente_id: '', fornecedor_id: '',
      data_lancamento: new Date().toISOString().split('T')[0],
      data_vencimento: '', data_pagamento: '', status: 'pendente',
      nf_numero: '', recorrente: false, observacoes: ''
    }
  }

  useEffect(() => { if (empresa?.id) fetchAll() }, [empresa?.id, filterMes, filterTipo, filterStatus])

  async function fetchAll() {
    setLoading(true)
    const inicio = filterMes ? `${filterMes}-01` : undefined
    const fim = filterMes ? `${filterMes}-31` : undefined

    let q = supabase.from('lancamentos')
      .select('*, contas_financeiras!conta_id(nome,tipo), obras(nome), clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresa!.id)
      .order('data_lancamento', { ascending: false })

    if (inicio && fim) q = q.gte('data_lancamento', inicio).lte('data_lancamento', fim)
    if (filterTipo) q = q.eq('tipo', filterTipo)
    if (filterStatus) q = q.eq('status', filterStatus)

    const [{ data: l }, { data: c }, { data: o }, { data: cl }, { data: fo }] = await Promise.all([
      q,
      supabase.from('contas_financeiras').select('id,nome,tipo').eq('empresa_id', empresa!.id).eq('ativo', true),
      supabase.from('obras').select('id,nome').eq('empresa_id', empresa!.id),
      supabase.from('clientes').select('id,nome').eq('empresa_id', empresa!.id).eq('ativo', true),
      supabase.from('fornecedores').select('id,nome').eq('empresa_id', empresa!.id).eq('ativo', true),
    ])
    setLancamentos(l || [])
    setContas(c || [])
    setObras(o || [])
    setClientes(cl || [])
    setFornecedores(fo || [])
    setLoading(false)
  }

  const filtered = lancamentos.filter(l =>
    l.descricao.toLowerCase().includes(search.toLowerCase()) ||
    l.categoria.toLowerCase().includes(search.toLowerCase())
  )

  const totais = {
    receitas: filtered.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
    despesas: filtered.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
    provisoes: filtered.filter(l => l.tipo === 'provisao').reduce((s, l) => s + l.valor, 0),
  }

  async function handleSave() {
    if (!form.descricao || !form.valor || !form.conta_id) return
    setSaving(true)
    const payload = {
      ...form,
      empresa_id: empresa!.id,
      valor: parseFloat(form.valor),
      obra_id: form.obra_id || null,
      cliente_id: form.cliente_id || null,
      fornecedor_id: form.fornecedor_id || null,
      conta_destino_id: form.conta_destino_id || null,
      data_vencimento: form.data_vencimento || null,
      data_pagamento: form.data_pagamento || null,
    }
    await supabase.from('lancamentos').insert(payload)
    setSaving(false); setModalOpen(false); fetchAll()
  }

  async function marcarPago(id: string, tipo: string) {
    const status = tipo === 'receita' ? 'recebido' : 'pago'
    const data_pagamento = new Date().toISOString().split('T')[0]
    await supabase.from('lancamentos').update({ status, data_pagamento }).eq('id', id)
    fetchAll()
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar este lançamento?')) return
    await supabase.from('lancamentos').update({ status: 'cancelado' }).eq('id', id)
    fetchAll()
  }

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))
  const categorias = form.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const tipoColor: Record<string, string> = {
    receita: 'text-green-600', despesa: 'text-red-600', provisao: 'text-purple-600', transferencia: 'text-blue-600'
  }
  const statusBadge: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-700', pago: 'bg-green-100 text-green-700',
    recebido: 'bg-green-100 text-green-700', cancelado: 'bg-gray-100 text-gray-500',
    atrasado: 'bg-red-100 text-red-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-1">{lancamentos.length} lançamentos no período</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setForm(defaultForm()); setModalOpen(true) }}>
          Novo Lançamento
        </Button>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase">Receitas</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totais.receitas)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-semibold uppercase">Despesas</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totais.despesas)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-semibold uppercase">Provisões</p>
          <p className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(totais.provisoes)}</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Buscar lançamento..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input type="month" className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filterMes} onChange={e => setFilterMes(e.target.value)} />
          <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
            <option value="provisao">Provisão</option>
            <option value="transferencia">Transferência</option>
          </select>
          <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="recebido">Recebido</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </CardContent>
      </Card>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight size={32} />} title="Nenhum lançamento encontrado" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Data','Descrição','Categoria','Conta','Obra','Valor','Status','Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(l.data_lancamento)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800 max-w-xs truncate">{l.descricao}</p>
                      {l.nf_numero && <p className="text-xs text-gray-400">NF {l.nf_numero}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{l.categoria}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(l as any).contas_financeiras?.nome || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(l as any).obras?.nome || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${tipoColor[l.tipo]}`}>
                        {l.tipo === 'receita' ? '+' : '-'}{formatCurrency(l.valor)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(l.status === 'pendente' || l.status === 'atrasado') && (
                        <div className="flex gap-2">
                          <button onClick={() => marcarPago(l.id, l.tipo)}
                            className="text-green-500 hover:text-green-700" title="Confirmar pagamento">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => cancelar(l.id)}
                            className="text-gray-400 hover:text-red-500" title="Cancelar">
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Novo Lançamento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Lançamento" size="2xl">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo *" value={form.tipo} onChange={f('tipo')}
            options={[{value:'receita',label:'Receita'},{value:'despesa',label:'Despesa'},{value:'provisao',label:'Provisão'},{value:'transferencia',label:'Transferência'}]} />
          <Select label="Categoria *" value={form.categoria} onChange={f('categoria')}
            options={categorias.map(c => ({value:c,label:c}))} placeholder="Selecione..." />
          <div className="col-span-2">
            <Input label="Descrição *" value={form.descricao} onChange={f('descricao')} placeholder="Descreva o lançamento" />
          </div>
          <Input label="Valor (R$) *" type="number" step="0.01" value={form.valor} onChange={f('valor')} />
          <Select label="Conta *" value={form.conta_id} onChange={f('conta_id')}
            options={contas.map(c => ({value:c.id,label:`${c.nome} (${c.tipo})`}))} placeholder="Selecione a conta" />
          {form.tipo === 'transferencia' && (
            <Select label="Conta Destino" value={form.conta_destino_id} onChange={f('conta_destino_id')}
              options={contas.map(c => ({value:c.id,label:c.nome}))} placeholder="Selecione destino" />
          )}
          <Select label="Obra" value={form.obra_id} onChange={f('obra_id')}
            options={[{value:'',label:'Sem obra'},...obras.map(o => ({value:o.id,label:o.nome}))]} />
          {form.tipo === 'receita' ? (
            <Select label="Cliente" value={form.cliente_id} onChange={f('cliente_id')}
              options={[{value:'',label:'Sem cliente'},...clientes.map(c => ({value:c.id,label:c.nome}))]} />
          ) : (
            <Select label="Fornecedor" value={form.fornecedor_id} onChange={f('fornecedor_id')}
              options={[{value:'',label:'Sem fornecedor'},...fornecedores.map(c => ({value:c.id,label:c.nome}))]} />
          )}
          <Input label="Data do Lançamento" type="date" value={form.data_lancamento} onChange={f('data_lancamento')} />
          <Input label="Data de Vencimento" type="date" value={form.data_vencimento} onChange={f('data_vencimento')} />
          <Select label="Status" value={form.status} onChange={f('status')}
            options={[{value:'pendente',label:'Pendente'},{value:'pago',label:'Pago'},{value:'recebido',label:'Recebido'}]} />
          <Input label="Nº NF" value={form.nf_numero} onChange={f('nf_numero')} placeholder="0000" />
          <div className="col-span-2">
            <Textarea label="Observações" value={form.observacoes} onChange={f('observacoes')} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Salvar Lançamento</Button>
        </div>
      </Modal>
    </div>
  )
}
