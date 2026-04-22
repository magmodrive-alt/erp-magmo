import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardContent, Button, Loading, EmptyState, Modal, Input, Select, Textarea
} from '../../components/ui'
import type { ContaFinanceira } from '../../types'
import { formatCurrency, TIPO_CONTA_LABEL, TIPO_CONTA_COLOR } from '../../lib/utils'

const TIPOS_CONTA = Object.entries(TIPO_CONTA_LABEL).map(([value, label]) => ({ value, label }))
const SUBTIPOS: Record<string, string[]> = {
  provisao: ['lucro','marketing','trabalhistas','tributarias'],
  gerencial: [],
  operacional: [],
  fluxo_fixo: [],
  lucro_excedente: [],
  caixa: [],
}

export default function ContasPage() {
  const { empresa } = useAuth()
  const [contas, setContas] = useState<ContaFinanceira[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ContaFinanceira | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return {
      nome: '', tipo: 'gerencial', subtipo: '', banco: '', agencia: '',
      numero_conta: '', saldo_inicial: '0', obra_id: ''
    }
  }

  useEffect(() => { if (empresa?.id) { fetchContas(); fetchObras() } }, [empresa?.id])

  async function fetchContas() {
    setLoading(true)
    const { data } = await supabase.from('contas_financeiras')
      .select('*, obras(nome)').eq('empresa_id', empresa!.id)
      .eq('ativo', true).order('tipo').order('nome')
    setContas(data || [])
    setLoading(false)
  }

  async function fetchObras() {
    const { data } = await supabase.from('obras').select('id,nome')
      .eq('empresa_id', empresa!.id).in('status', ['contratada','em_andamento'])
    setObras(data || [])
  }

  const contasPorTipo = contas.reduce((acc: Record<string, ContaFinanceira[]>, c) => {
    acc[c.tipo] = [...(acc[c.tipo] || []), c]
    return acc
  }, {})

  function openNew() { setEditing(null); setForm(defaultForm()); setModalOpen(true) }
  function openEdit(c: ContaFinanceira) {
    setEditing(c)
    setForm({
      nome: c.nome, tipo: c.tipo, subtipo: c.subtipo || '', banco: c.banco || '',
      agencia: c.agencia || '', numero_conta: c.numero_conta || '',
      saldo_inicial: String(c.saldo_inicial), obra_id: c.obra_id || ''
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      empresa_id: empresa!.id,
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      saldo_atual: parseFloat(form.saldo_inicial) || 0,
      obra_id: form.obra_id || null,
      subtipo: form.subtipo || null,
    }
    if (editing) {
      const { saldo_atual: _, ...rest } = payload as any
      await supabase.from('contas_financeiras').update(rest).eq('id', editing.id)
    } else {
      await supabase.from('contas_financeiras').insert(payload)
    }
    setSaving(false); setModalOpen(false); fetchContas()
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar esta conta?')) return
    await supabase.from('contas_financeiras').update({ ativo: false }).eq('id', id)
    fetchContas()
  }

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contas Financeiras</h1>
          <p className="text-sm text-gray-500 mt-1">Estrutura: Gerencial · Operacional · Fluxo Fixo · Provisões · Lucro Excedente</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>Nova Conta</Button>
      </div>

      {loading ? <Loading /> : contas.length === 0 ? (
        <EmptyState icon={<Building2 size={32} />} title="Nenhuma conta cadastrada"
          description="Crie as contas seguindo a estrutura do fluxograma financeiro"
          action={<Button icon={<Plus size={16} />} size="sm" onClick={openNew}>Criar Conta</Button>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(TIPO_CONTA_LABEL).map(([tipo, label]) => {
            const contasTipo = contasPorTipo[tipo] || []
            if (contasTipo.length === 0) return null
            const cor = TIPO_CONTA_COLOR[tipo]
            const saldoTipo = contasTipo.reduce((s, c) => s + c.saldo_atual, 0)
            return (
              <div key={tipo}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} />
                  <h2 className="font-semibold text-gray-700">{label}</h2>
                  <span className="text-sm text-gray-400">({contasTipo.length})</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(saldoTipo)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contasTipo.map(conta => (
                    <Card key={conta.id} className="hover:shadow-md transition-all"
                      style={{ borderLeftColor: cor, borderLeftWidth: 4 }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{conta.nome}</p>
                            {conta.subtipo && <p className="text-xs text-gray-400 capitalize">{conta.subtipo}</p>}
                            {(conta as any).obras?.nome && (
                              <p className="text-xs text-orange-500 mt-0.5">🏗 {(conta as any).obras.nome}</p>
                            )}
                            {conta.banco && (
                              <p className="text-xs text-gray-400 mt-1">{conta.banco} · Ag {conta.agencia} · CC {conta.numero_conta}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-gray-800">{formatCurrency(conta.saldo_atual)}</p>
                            <p className="text-xs text-gray-400">saldo atual</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button onClick={() => openEdit(conta)} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
                            <Edit2 size={12} /> Editar
                          </button>
                          <button onClick={() => handleDelete(conta.id)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Conta' : 'Nova Conta Financeira'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome da Conta *" value={form.nome} onChange={f('nome')} placeholder="Ex: Conta Gerencial ITAÚ" />
          </div>
          <Select label="Tipo *" options={TIPOS_CONTA} value={form.tipo} onChange={f('tipo')} />
          {SUBTIPOS[form.tipo]?.length > 0 && (
            <Select label="Subtipo" options={[{value:'',label:'Selecione...'},...SUBTIPOS[form.tipo].map(s=>({value:s,label:s}))]}
              value={form.subtipo} onChange={f('subtipo')} />
          )}
          {form.tipo === 'operacional' && (
            <Select label="Obra Vinculada"
              options={[{value:'',label:'Sem obra'},...obras.map(o=>({value:o.id,label:o.nome}))]}
              value={form.obra_id} onChange={f('obra_id')} />
          )}
          <Input label="Banco" value={form.banco} onChange={f('banco')} placeholder="Ex: Itaú, Bradesco, BB" />
          <Input label="Agência" value={form.agencia} onChange={f('agencia')} />
          <Input label="Número da Conta" value={form.numero_conta} onChange={f('numero_conta')} />
          <Input label="Saldo Inicial (R$)" type="number" step="0.01"
            value={form.saldo_inicial} onChange={f('saldo_inicial')} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>{editing ? 'Salvar' : 'Criar Conta'}</Button>
        </div>
      </Modal>
    </div>
  )
}
