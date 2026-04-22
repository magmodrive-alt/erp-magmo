import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Layers, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardContent, Button, Loading, EmptyState, Badge,
  Modal, Input, Select, Textarea, Table, TableHead, TableBody, Th, Td
} from '../../components/ui'
import type { Composicao, Insumo } from '../../types'
import { formatCurrency } from '../../lib/utils'

const CATEGORIAS = ['estrutura','alvenaria','cobertura','revestimento','instalações','esquadrias','pintura','outros']
const UNIDADES = ['m²','m³','m','kg','t','l','un','h','verba']

export default function ComposicoesPage() {
  const { empresa } = useAuth()
  const [composicoes, setComposicoes] = useState<Composicao[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Composicao | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())
  const [itens, setItens] = useState<{insumo_id:string; quantidade:string; preco_unitario:string; descricao?:string; unidade?:string}[]>([])

  function defaultForm() {
    return { codigo: '', descricao: '', unidade: 'm²', categoria: 'alvenaria', fonte: 'proprio', bdi_padrao: '', observacoes: '' }
  }

  useEffect(() => { if (empresa?.id) { fetchComposicoes(); fetchInsumos() } }, [empresa?.id])

  async function fetchComposicoes() {
    setLoading(true)
    const { data } = await supabase.from('composicoes')
      .select('*, composicoes_itens(*, insumos(descricao,unidade,preco_unitario))')
      .or(`empresa_id.is.null,empresa_id.eq.${empresa!.id}`)
      .eq('ativo', true).order('descricao')
    setComposicoes(data || [])
    setLoading(false)
  }

  async function fetchInsumos() {
    const { data } = await supabase.from('insumos')
      .select('id,descricao,unidade,preco_unitario')
      .or(`empresa_id.is.null,empresa_id.eq.${empresa!.id}`)
      .eq('ativo', true).order('descricao')
    setInsumos(data || [])
  }

  const filtered = composicoes.filter(c =>
    c.descricao.toLowerCase().includes(search.toLowerCase()) ||
    (c.codigo || '').toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditing(null); setForm(defaultForm())
    setItens([{ insumo_id: '', quantidade: '1', preco_unitario: '' }])
    setModalOpen(true)
  }

  function openEdit(c: Composicao) {
    setEditing(c)
    setForm({
      codigo: c.codigo || '', descricao: c.descricao, unidade: c.unidade,
      categoria: c.categoria || 'alvenaria', fonte: c.fonte, bdi_padrao: String(c.bdi_padrao), observacoes: c.observacoes || ''
    })
    setItens((c.composicoes_itens || []).map((i: any) => ({
      insumo_id: i.insumo_id, quantidade: String(i.quantidade),
      preco_unitario: String(i.preco_unitario), descricao: i.insumos?.descricao, unidade: i.insumos?.unidade
    })))
    setModalOpen(true)
  }

  function addItem() { setItens(p => [...p, { insumo_id: '', quantidade: '1', preco_unitario: '' }]) }
  function removeItem(i: number) { setItens(p => p.filter((_, idx) => idx !== i)) }
  function updateItem(idx: number, field: string, value: string) {
    setItens(p => {
      const n = [...p]
      n[idx] = { ...n[idx], [field]: value }
      if (field === 'insumo_id') {
        const ins = insumos.find(i => i.id === value)
        if (ins) n[idx].preco_unitario = String(ins.preco_unitario)
      }
      return n
    })
  }

  const totalCusto = itens.reduce((s, i) => s + (parseFloat(i.quantidade)||0) * (parseFloat(i.preco_unitario)||0), 0)

  async function handleSave() {
    if (!form.descricao.trim()) return
    setSaving(true)
    const payload = { ...form, empresa_id: empresa!.id, bdi_padrao: parseFloat(form.bdi_padrao)||0 }
    let compId = editing?.id
    if (editing) {
      await supabase.from('composicoes').update(payload).eq('id', editing.id)
      await supabase.from('composicoes_itens').delete().eq('composicao_id', editing.id)
    } else {
      const { data } = await supabase.from('composicoes').insert(payload).select().single()
      compId = data?.id
    }
    if (compId) {
      const itemsPayload = itens.filter(i => i.insumo_id).map((i, idx) => ({
        composicao_id: compId, insumo_id: i.insumo_id,
        quantidade: parseFloat(i.quantidade)||0, preco_unitario: parseFloat(i.preco_unitario)||0, ordem: idx
      }))
      if (itemsPayload.length > 0) await supabase.from('composicoes_itens').insert(itemsPayload)
    }
    setSaving(false); setModalOpen(false); fetchComposicoes()
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar esta composição?')) return
    await supabase.from('composicoes').update({ ativo: false }).eq('id', id)
    fetchComposicoes()
  }

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Composições</h1>
          <p className="text-sm text-gray-500 mt-1">{composicoes.length} composições cadastradas</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>Nova Composição</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input className="w-full max-w-sm pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Buscar composição..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <Loading /> : filtered.length === 0 ? (
            <EmptyState icon={<Layers size={32} />} title="Nenhuma composição encontrada"
              action={<Button icon={<Plus size={16} />} size="sm" onClick={openNew}>Nova Composição</Button>} />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th></Th><Th>Código</Th><Th>Descrição</Th><Th>Unidade</Th>
                  <Th>Categoria</Th><Th>Custo Total</Th><Th>Itens</Th><Th>Ações</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.map(comp => (
                  <>
                    <tr key={comp.id} className="hover:bg-gray-50">
                      <Td>
                        <button onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                          className="text-gray-400 hover:text-orange-500">
                          {expandedId === comp.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </Td>
                      <Td className="font-mono text-xs text-gray-500">{comp.codigo || '-'}</Td>
                      <Td><p className="font-medium text-gray-800">{comp.descricao}</p></Td>
                      <Td><span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">{comp.unidade}</span></Td>
                      <Td><Badge variant="default" className="capitalize">{comp.categoria || '-'}</Badge></Td>
                      <Td className="font-semibold text-gray-800">{formatCurrency(comp.custo_total)}</Td>
                      <Td className="text-gray-500">{(comp.composicoes_itens || []).length} itens</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(comp)} className="text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                          {comp.empresa_id && <button onClick={() => handleDelete(comp.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>}
                        </div>
                      </Td>
                    </tr>
                    {expandedId === comp.id && (comp.composicoes_itens || []).length > 0 && (
                      <tr key={comp.id + '_exp'}>
                        <td colSpan={8} className="bg-blue-50 px-8 py-3">
                          <table className="w-full text-xs">
                            <thead><tr className="text-gray-500 font-semibold">
                              <th className="text-left py-1">Insumo</th>
                              <th className="text-right py-1">Qtd</th>
                              <th className="text-right py-1">Preço Unit.</th>
                              <th className="text-right py-1">Subtotal</th>
                            </tr></thead>
                            <tbody>
                              {(comp.composicoes_itens as any[]).map((item: any) => (
                                <tr key={item.id} className="border-t border-blue-200/50">
                                  <td className="py-1 text-gray-700">{item.insumos?.descricao}</td>
                                  <td className="py-1 text-right text-gray-600">{item.quantidade} {item.insumos?.unidade}</td>
                                  <td className="py-1 text-right text-gray-600">{formatCurrency(item.preco_unitario)}</td>
                                  <td className="py-1 text-right font-semibold text-gray-800">{formatCurrency(item.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Composição' : 'Nova Composição'} size="2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Código" value={form.codigo} onChange={f('codigo')} />
            <div className="col-span-2">
              <Input label="Descrição *" value={form.descricao} onChange={f('descricao')} />
            </div>
            <Select label="Unidade" options={UNIDADES.map(u => ({value:u,label:u}))} value={form.unidade} onChange={f('unidade')} />
            <Select label="Categoria" options={CATEGORIAS.map(c => ({value:c,label:c}))} value={form.categoria} onChange={f('categoria')} />
            <Input label="BDI Padrão (%)" type="number" value={form.bdi_padrao} onChange={f('bdi_padrao')} />
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Insumos da Composição</h4>
              <button onClick={addItem} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.insumo_id} onChange={e => updateItem(idx, 'insumo_id', e.target.value)}>
                      <option value="">Selecionar insumo...</option>
                      {insumos.map(i => <option key={i.id} value={i.id}>{i.descricao} ({i.unidade})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.0001" placeholder="Qtd"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.0001" placeholder="R$ Unit."
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.preco_unitario} onChange={e => updateItem(idx, 'preco_unitario', e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-gray-500">Custo Total: </span>
              <span className="text-base font-bold text-orange-600">{formatCurrency(totalCusto)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>{editing ? 'Salvar' : 'Criar Composição'}</Button>
        </div>
      </Modal>
    </div>
  )
}
