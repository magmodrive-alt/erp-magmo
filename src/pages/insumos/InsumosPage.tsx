import { useEffect, useState } from 'react'
import { Plus, Search, BookOpen, Edit2, Trash2, RefreshCw, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardHeader, CardContent, Button, Loading, EmptyState,
  Badge, Modal, Input, Select, Textarea, Table, TableHead, TableBody, Th, Td
} from '../../components/ui'
import type { Insumo } from '../../types'
import { formatCurrency } from '../../lib/utils'

const CATEGORIAS = ['material','mão_de_obra','equipamento','serviço','transporte','outros']
const FONTES = ['proprio','sinapi','fde','orse','deinfra','emop']
const UNIDADES = ['m²','m³','m','kg','t','l','un','cx','sc','pc','h','dia','mês','verba']

export default function InsumosPage() {
  const { empresa } = useAuth()
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterFonte, setFilterFonte] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Insumo | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return {
      codigo: '', descricao: '', unidade: 'un', categoria: 'material',
      fonte: 'proprio', preco_unitario: '', referencia_mes: '',
      estado_ref: '', desonerado: false, observacoes: ''
    }
  }

  useEffect(() => { if (empresa?.id) fetchInsumos() }, [empresa?.id, filterFonte, filterCat])

  async function fetchInsumos() {
    setLoading(true)
    let q = supabase.from('insumos').select('*')
      .or(`empresa_id.is.null,empresa_id.eq.${empresa!.id}`)
      .eq('ativo', true).order('descricao')

    if (filterFonte) q = q.eq('fonte', filterFonte)
    if (filterCat) q = q.eq('categoria', filterCat)

    const { data } = await q
    setInsumos(data || [])
    setLoading(false)
  }

  const filtered = insumos.filter(i =>
    i.descricao.toLowerCase().includes(search.toLowerCase()) ||
    (i.codigo || '').toLowerCase().includes(search.toLowerCase())
  )

  function openNew() { setEditing(null); setForm(defaultForm()); setModalOpen(true) }
  function openEdit(i: Insumo) {
    setEditing(i)
    setForm({
      codigo: i.codigo || '', descricao: i.descricao, unidade: i.unidade,
      categoria: i.categoria || 'material', fonte: i.fonte, preco_unitario: String(i.preco_unitario),
      referencia_mes: i.referencia_mes || '', estado_ref: i.estado_ref || '',
      desonerado: i.desonerado, observacoes: i.observacoes || ''
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.descricao.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      empresa_id: empresa!.id,
      preco_unitario: parseFloat(form.preco_unitario as string) || 0,
      referencia_mes: form.referencia_mes || null,
      estado_ref: form.estado_ref || null,
    }
    if (editing) {
      await supabase.from('insumos').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('insumos').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchInsumos()
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar este insumo?')) return
    await supabase.from('insumos').update({ ativo: false }).eq('id', id)
    fetchInsumos()
  }

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))

  const categoriaColor: Record<string, string> = {
    material: 'info', mão_de_obra: 'success', equipamento: 'warning', serviço: 'purple'
  } as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Banco de Insumos</h1>
          <p className="text-sm text-gray-500 mt-1">{insumos.length} insumos disponíveis (próprios + bases públicas)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={fetchInsumos}>Atualizar</Button>
          <Button icon={<Plus size={16} />} onClick={openNew}>Novo Insumo</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Buscar por descrição ou código..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
              value={filterFonte} onChange={e => setFilterFonte(e.target.value)}>
              <option value="">Todas as fontes</option>
              {FONTES.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
            <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
              value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? <Loading /> : filtered.length === 0 ? (
            <EmptyState icon={<BookOpen size={32} />} title="Nenhum insumo encontrado"
              action={<Button icon={<Plus size={16} />} size="sm" onClick={openNew}>Cadastrar Insumo</Button>} />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Código</Th>
                  <Th>Descrição</Th>
                  <Th>Unidade</Th>
                  <Th>Categoria</Th>
                  <Th>Fonte</Th>
                  <Th>Preço Unitário</Th>
                  <Th>UF Ref.</Th>
                  <Th>Ações</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.map(insumo => (
                  <tr key={insumo.id} className="hover:bg-gray-50">
                    <Td className="font-mono text-xs text-gray-500">{insumo.codigo || '-'}</Td>
                    <Td>
                      <p className="font-medium text-gray-800 max-w-xs truncate">{insumo.descricao}</p>
                      {insumo.observacoes && <p className="text-xs text-gray-400 truncate">{insumo.observacoes}</p>}
                    </Td>
                    <Td>
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">{insumo.unidade}</span>
                    </Td>
                    <Td>
                      <Badge variant={(categoriaColor[insumo.categoria || ''] || 'default') as any} className="capitalize">
                        {insumo.categoria || '-'}
                      </Badge>
                    </Td>
                    <Td>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase
                        ${insumo.fonte === 'sinapi' ? 'bg-blue-100 text-blue-700' :
                          insumo.fonte === 'fde' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'}`}>
                        {insumo.fonte}
                      </span>
                    </Td>
                    <Td className="font-semibold text-gray-800">{formatCurrency(insumo.preco_unitario)}</Td>
                    <Td className="text-gray-500 text-xs">{insumo.estado_ref || '-'}</Td>
                    <Td>
                      {(!insumo.empresa_id || insumo.empresa_id === empresa?.id) && (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(insumo)} className="text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                          {insumo.empresa_id && <button onClick={() => handleDelete(insumo.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Insumo' : 'Novo Insumo'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Código" value={form.codigo} onChange={f('codigo')} placeholder="Ex: SINAPI-98765" />
          <div className="col-span-1">
            <Select label="Unidade" options={UNIDADES.map(u => ({value:u,label:u}))}
              value={form.unidade} onChange={f('unidade')} />
          </div>
          <div className="col-span-2">
            <Input label="Descrição *" value={form.descricao} onChange={f('descricao')}
              placeholder="Descrição completa do insumo" />
          </div>
          <Select label="Categoria" options={CATEGORIAS.map(c => ({value:c,label:c}))}
            value={form.categoria} onChange={f('categoria')} />
          <Select label="Fonte" options={FONTES.map(f => ({value:f,label:f.toUpperCase()}))}
            value={form.fonte} onChange={f('fonte')} />
          <Input label="Preço Unitário (R$)" type="number" step="0.0001"
            value={form.preco_unitario} onChange={f('preco_unitario')} placeholder="0,00" />
          <Input label="Mês de Referência" type="month"
            value={form.referencia_mes} onChange={f('referencia_mes')} />
          <Input label="UF de Referência" value={form.estado_ref} onChange={f('estado_ref')} placeholder="SP" />
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="desonerado" checked={form.desonerado}
              onChange={e => setForm(p => ({...p, desonerado: e.target.checked}))} />
            <label htmlFor="desonerado" className="text-sm text-gray-700">Preço desonerado</label>
          </div>
          <div className="col-span-2">
            <Textarea label="Observações" value={form.observacoes} onChange={f('observacoes')} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>{editing ? 'Salvar' : 'Cadastrar Insumo'}</Button>
        </div>
      </Modal>
    </div>
  )
}
