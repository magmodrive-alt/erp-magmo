import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select,
  Modal, Table, TableHead, TableBody, Th, Td, Badge, Loading, EmptyState, Textarea
} from '../../components/ui'
import type { Cliente } from '../../types'
import { formatDate } from '../../lib/utils'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function ClientesPage() {
  const { empresa } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return {
      tipo: 'pf', nome: '', cpf_cnpj: '', email: '', telefone: '',
      celular: '', endereco: '', numero: '', complemento: '', bairro: '',
      cidade: '', estado: '', cep: '', observacoes: ''
    }
  }

  useEffect(() => { if (empresa?.id) fetchClientes() }, [empresa?.id])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes')
      .select('*').eq('empresa_id', empresa!.id).eq('ativo', true)
      .order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj || '').includes(search) ||
    (c.cidade || '').toLowerCase().includes(search.toLowerCase())
  )

  function openNew() { setEditing(null); setForm(defaultForm()); setModalOpen(true) }
  function openEdit(c: Cliente) {
    setEditing(c)
    setForm({ tipo: c.tipo, nome: c.nome, cpf_cnpj: c.cpf_cnpj || '', email: c.email || '',
      telefone: c.telefone || '', celular: c.celular || '', endereco: c.endereco || '',
      numero: c.numero || '', complemento: c.complemento || '', bairro: c.bairro || '',
      cidade: c.cidade || '', estado: c.estado || '', cep: c.cep || '', observacoes: c.observacoes || '' })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = { ...form, empresa_id: empresa!.id }
    if (editing) {
      await supabase.from('clientes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('clientes').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchClientes()
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar este cliente?')) return
    await supabase.from('clientes').update({ ativo: false }).eq('id', id)
    fetchClientes()
  }

  const f = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>Novo Cliente</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Buscar por nome, CPF/CNPJ, cidade..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <Loading /> : filtered.length === 0 ? (
            <EmptyState icon={<Users size={32} />} title="Nenhum cliente encontrado"
              description="Cadastre seu primeiro cliente para começar"
              action={<Button icon={<Plus size={16} />} size="sm" onClick={openNew}>Adicionar Cliente</Button>} />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Tipo</Th>
                  <Th>CPF/CNPJ</Th>
                  <Th>Contato</Th>
                  <Th>Cidade/UF</Th>
                  <Th>Cadastro</Th>
                  <Th>Ações</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                          {c.nome[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{c.nome}</span>
                      </div>
                    </Td>
                    <Td><Badge variant={c.tipo === 'pj' ? 'info' : 'default'}>{c.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</Badge></Td>
                    <Td className="text-gray-500">{c.cpf_cnpj || '-'}</Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        {c.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} />{c.email}</span>}
                        {c.celular && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} />{c.celular}</span>}
                      </div>
                    </Td>
                    <Td>
                      {c.cidade ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={11} />{c.cidade}{c.estado ? `/${c.estado}` : ''}
                        </span>
                      ) : '-'}
                    </Td>
                    <Td className="text-gray-400 text-xs">{formatDate(c.criado_em)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-500 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
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
        title={editing ? 'Editar Cliente' : 'Novo Cliente'} size="2xl">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo" options={[{value:'pf',label:'Pessoa Física'},{value:'pj',label:'Pessoa Jurídica'}]}
            value={form.tipo} onChange={f('tipo')} />
          <Input label="Nome / Razão Social *" value={form.nome} onChange={f('nome')} placeholder="Nome completo" />
          <Input label={form.tipo === 'pf' ? 'CPF' : 'CNPJ'} value={form.cpf_cnpj} onChange={f('cpf_cnpj')} placeholder={form.tipo === 'pf' ? '000.000.000-00' : '00.000.000/0001-00'} />
          <Input label="Email" type="email" value={form.email} onChange={f('email')} placeholder="email@exemplo.com" />
          <Input label="Telefone" value={form.telefone} onChange={f('telefone')} placeholder="(00) 0000-0000" />
          <Input label="Celular" value={form.celular} onChange={f('celular')} placeholder="(00) 90000-0000" />
          <Input label="CEP" value={form.cep} onChange={f('cep')} placeholder="00000-000" />
          <Input label="Endereço" value={form.endereco} onChange={f('endereco')} placeholder="Rua, Av..." />
          <Input label="Número" value={form.numero} onChange={f('numero')} />
          <Input label="Complemento" value={form.complemento} onChange={f('complemento')} />
          <Input label="Bairro" value={form.bairro} onChange={f('bairro')} />
          <Input label="Cidade" value={form.cidade} onChange={f('cidade')} />
          <Select label="Estado" options={ESTADOS.map(e => ({value:e,label:e}))} placeholder="UF"
            value={form.estado} onChange={f('estado')} />
          <div className="col-span-2">
            <Textarea label="Observações" value={form.observacoes} onChange={f('observacoes')} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>
            {editing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
