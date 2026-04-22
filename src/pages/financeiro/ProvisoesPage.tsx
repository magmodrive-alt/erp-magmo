import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Calculator } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent, Button, Loading, EmptyState, Modal, Input, Select } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const TIPOS_PROVISAO = [
  { tipo: 'trabalhistas', label: 'Trabalhistas', cor: '#f59e0b', subcats: ['INSS / FGTS','Multa FGTS','Rescisões','Acordo Trabalhista'] },
  { tipo: 'tributarias', label: 'Tributárias', cor: '#8b5cf6', subcats: ['PIS','COFINS','CSLL','IRPJ','ISS'] },
  { tipo: 'marketing', label: 'Marketing (3,5%)', cor: '#ec4899', subcats: ['Marketing C.D.E','C.A.C'] },
  { tipo: 'lucro', label: 'Lucro', cor: '#22c55e', subcats: ['Caixa','C.D.E','C.A.C','Investimentos'] },
]

export default function ProvisoesPage() {
  const { empresa } = useAuth()
  const [regras, setRegras] = useState<any[]>([])
  const [contas, setContas] = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo_provisao: 'trabalhistas', percentual: '', conta_origem_id: '', conta_destino_id: '' })

  useEffect(() => { if (empresa?.id) fetchData() }, [empresa?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: l }] = await Promise.all([
      supabase.from('regras_provisao').select('*, conta_origem:contas_financeiras!conta_origem_id(nome), conta_destino:contas_financeiras!conta_destino_id(nome)')
        .eq('empresa_id', empresa!.id).eq('ativo', true),
      supabase.from('contas_financeiras').select('id,nome,tipo').eq('empresa_id', empresa!.id).eq('ativo', true),
      supabase.from('lancamentos').select('tipo,status,valor,categoria')
        .eq('empresa_id', empresa!.id).eq('tipo', 'provisao')
        .gte('data_lancamento', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
    ])
    setRegras(r || [])
    setContas(c || [])
    setLancamentos(l || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.nome || !form.percentual) return
    setSaving(true)
    await supabase.from('regras_provisao').insert({
      ...form,
      empresa_id: empresa!.id,
      percentual: parseFloat(form.percentual),
      conta_origem_id: form.conta_origem_id || null,
      conta_destino_id: form.conta_destino_id || null,
    })
    setSaving(false); setModalOpen(false); fetchData()
  }

  // Totais por tipo
  const totaisPorTipo: Record<string, number> = {}
  lancamentos.forEach(l => {
    const tipo = TIPOS_PROVISAO.find(t => t.subcats.includes(l.categoria))?.tipo || 'outros'
    totaisPorTipo[tipo] = (totaisPorTipo[tipo] || 0) + l.valor
  })

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Provisões</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão automática de provisões trabalhistas, tributárias e de marketing</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Nova Regra</Button>
      </div>

      {/* Cards por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TIPOS_PROVISAO.map(tp => (
          <div key={tp.tipo} className="bg-white rounded-xl border-2 p-5" style={{ borderColor: tp.cor }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: tp.cor + '20' }}>
              <AlertTriangle size={20} style={{ color: tp.cor }} />
            </div>
            <p className="text-xs font-semibold uppercase text-gray-500">{tp.label}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(totaisPorTipo[tp.tipo] || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">provisionado no ano</p>
          </div>
        ))}
      </div>

      {/* Regras de Provisão */}
      <Card>
        <CardHeader>
          <CardTitle>Regras de Provisão Automática</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <Loading /> : regras.length === 0 ? (
            <EmptyState icon={<Calculator size={32} />} title="Nenhuma regra definida"
              description="Crie regras para calcular provisões automaticamente"
              action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>Criar Regra</Button>} />
          ) : (
            <div className="divide-y divide-gray-100">
              {regras.map(r => {
                const tp = TIPOS_PROVISAO.find(t => t.tipo === r.tipo_provisao)
                return (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tp?.cor || '#ccc' }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{r.nome}</p>
                      <p className="text-xs text-gray-400">{tp?.label} · {r.percentual}%</p>
                      {r.conta_origem && <p className="text-xs text-gray-400">De: {r.conta_origem.nome}</p>}
                      {r.conta_destino && <p className="text-xs text-gray-400">Para: {r.conta_destino.nome}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-700">{r.percentual}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subcategorias por tipo */}
      <div className="grid grid-cols-2 gap-6">
        {TIPOS_PROVISAO.map(tp => (
          <Card key={tp.tipo}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tp.cor }} />
                <CardTitle>{tp.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tp.subcats.map(sub => {
                  const valor = lancamentos.filter(l => l.categoria === sub).reduce((s, l) => s + l.valor, 0)
                  return (
                    <div key={sub} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-600">{sub}</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(valor)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Regra de Provisão">
        <div className="space-y-4">
          <Input label="Nome da Regra *" value={form.nome} onChange={f('nome')} placeholder="Ex: INSS sobre folha obras" />
          <Select label="Tipo de Provisão" value={form.tipo_provisao} onChange={f('tipo_provisao')}
            options={TIPOS_PROVISAO.map(t => ({ value: t.tipo, label: t.label }))} />
          <Input label="Percentual (%)" type="number" step="0.01" value={form.percentual} onChange={f('percentual')} placeholder="3.5" />
          <Select label="Conta de Origem" value={form.conta_origem_id} onChange={f('conta_origem_id')}
            options={[{value:'',label:'Selecione...'}, ...contas.map(c => ({value:c.id,label:c.nome}))]} />
          <Select label="Conta de Destino (Provisão)" value={form.conta_destino_id} onChange={f('conta_destino_id')}
            options={[{value:'',label:'Selecione...'}, ...contas.filter(c => c.tipo === 'provisao').map(c => ({value:c.id,label:c.nome}))]} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Salvar Regra</Button>
        </div>
      </Modal>
    </div>
  )
}
