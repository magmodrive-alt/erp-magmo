import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const PLANOS = [
  { slug:'trial',      nome:'🆓 Trial',      preco:'Grátis por 14 dias',  obras:2,   badge:'2 obras',      cor:'#22c55e',  bgCor:'rgba(34,197,94,0.1)' },
  { slug:'starter',    nome:'📦 Starter',    preco:'R$ 87/mês (12x)',     obras:5,   badge:'5 obras',      cor:'#3b82f6',  bgCor:'rgba(59,130,246,0.08)' },
  { slug:'pro',        nome:'⭐ Pro',         preco:'R$ 167/mês (12x)',    obras:30,  badge:'30 obras',     cor:'#f97316',  bgCor:'rgba(249,115,22,0.08)', destaque:true },
  { slug:'enterprise', nome:'🏆 Enterprise', preco:'R$ 337/mês (12x)',    obras:999, badge:'Ilimitadas',   cor:'#8b5cf6',  bgCor:'rgba(139,92,246,0.08)' },
]

const STEPS = ['Empresa', 'Usuário Mestre', 'Plano', 'Confirmar']

type FormData = {
  // Step 1 — Empresa
  razaoSocial: string
  cnpj: string
  emailEmpresa: string
  telefone: string
  uf: string
  porte: string
  // Step 2 — Usuário Mestre
  nome: string
  sobrenome: string
  email: string
  senha: string
  confirmarSenha: string
  cargo: string
  // Step 3 — Plano
  plano: string
  tipoPagamento: string
}

const initForm: FormData = {
  razaoSocial:'', cnpj:'', emailEmpresa:'', telefone:'', uf:'SP', porte:'pequena',
  nome:'', sobrenome:'', email:'', senha:'', confirmarSenha:'', cargo:'dono',
  plano:'trial', tipoPagamento:'12x'
}

function Input({ label, icon, type='text', placeholder, value, onChange, right }:
  { label:string; icon:string; type?:string; placeholder:string; value:string; onChange:(v:string)=>void; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#94a3b8',
        marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.3px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'15px', pointerEvents:'none' }}>{icon}</span>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
            color:'#f1f5f9', borderRadius:'10px', padding:`12px ${right?'40px':'14px'} 12px 40px`, fontSize:'14px' }}/>
        {right && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)' }}>{right}</div>}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, children }: { label:string; value:string; onChange:(v:string)=>void; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#94a3b8',
        marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.3px' }}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
          color:'#f1f5f9', borderRadius:'10px', padding:'12px 14px', fontSize:'14px' }}>
        {children}
      </select>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState<FormData>(initForm)
  const [errors, setErrors]   = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [done, setDone]       = useState(false)

  const set = (k: keyof FormData) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  function pwdStrength(pwd: string) {
    let s = 0
    if (pwd.length >= 8) s++
    if (/[A-Z]/.test(pwd)) s++
    if (/[0-9]/.test(pwd)) s++
    if (/[^A-Za-z0-9]/.test(pwd)) s++
    return s
  }

  function validate(n: number): string[] {
    const e: string[] = []
    if (n === 1) {
      if (!form.razaoSocial.trim()) e.push('Informe o nome da empresa.')
      if (!form.emailEmpresa.trim() || !form.emailEmpresa.includes('@')) e.push('Informe um e-mail corporativo válido.')
    }
    if (n === 2) {
      if (!form.nome.trim()) e.push('Informe seu nome.')
      if (!form.email.trim() || !form.email.includes('@')) e.push('Informe um e-mail de acesso válido.')
      if (form.senha.length < 8) e.push('A senha deve ter no mínimo 8 caracteres.')
      if (form.senha !== form.confirmarSenha) e.push('As senhas não coincidem.')
    }
    return e
  }

  function next() {
    const errs = validate(step)
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setStep(s => Math.min(s + 1, 4))
  }

  function back() { setErrors([]); setStep(s => Math.max(s - 1, 1)) }

  async function finalizar() {
    setLoading(true)
    try {
      // 1. Cria usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: { nome: form.nome, sobrenome: form.sobrenome } }
      })
      if (authError) throw new Error(authError.message)

      // 2. Cria empresa
      const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .insert({ nome: form.razaoSocial, cnpj: form.cnpj.replace(/\D/g,''), email: form.emailEmpresa,
          telefone: form.telefone.replace(/\D/g,''), uf: form.uf, porte: form.porte, plano: form.plano })
        .select().single()
      if (empError) throw new Error(empError.message)

      // 3. Cria perfil do usuário mestre
      if (authData.user) {
        const { error: perfError } = await supabase
          .from('perfis')
          .insert({ id: authData.user.id, empresa_id: empresa.id,
            nome: form.nome + ' ' + form.sobrenome, email: form.email,
            cargo: form.cargo, role: 'admin' })
        if (perfError) throw new Error(perfError.message)
      }

      setDone(true)
      setTimeout(() => navigate('/login'), 4000)
    } catch (err: any) {
      setErrors([err.message || 'Erro ao criar conta. Tente novamente.'])
    } finally {
      setLoading(false)
    }
  }

  const planoSel = PLANOS.find(p => p.slug === form.plano) || PLANOS[0]

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#0f1729', display:'flex', flexDirection:'column' }}>
      <div style={{ position:'fixed', top:'-200px', left:'-200px', width:'600px', height:'600px',
        background:'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
        pointerEvents:'none', zIndex:0 }}/>

      {/* TOPBAR */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100,
        backdropFilter:'blur(12px)', background:'rgba(15,23,41,0.85)',
        borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 32px',
        height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'38px', height:'38px', background:'#f97316', borderRadius:'10px',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px',
            boxShadow:'0 4px 14px rgba(249,115,22,0.4)' }}>🏗</div>
          <div>
            <div style={{ fontWeight:800, fontSize:'17px', color:'#f1f5f9' }}>Gestão PRO</div>
            <div style={{ fontSize:'10px', color:'#f97316', fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase' }}>
              Criar Nova Conta
            </div>
          </div>
        </div>
        <Link to="/login" style={{ padding:'9px 20px', background:'transparent', color:'#94a3b8',
          borderRadius:'8px', fontWeight:700, fontSize:'13px', textDecoration:'none',
          border:'1px solid rgba(255,255,255,0.08)' }}>
          Já tenho conta
        </Link>
      </header>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'88px 20px 48px', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:'620px',
          background:'#1a2540', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px',
          overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' }}>

          {/* Header do card */}
          <div style={{ padding:'28px 36px 0',  background:'linear-gradient(180deg, rgba(249,115,22,0.05) 0%, transparent 100%)' }}>
            <div style={{ fontSize:'20px', fontWeight:800, color:'#f1f5f9', marginBottom:'4px' }}>
              🏗 Criar Conta — Gestão PRO
            </div>
            <div style={{ fontSize:'13px', color:'#94a3b8', marginBottom:'24px' }}>
              Cadastre sua construtora e crie o usuário administrador
            </div>

            {/* Steps */}
            <div style={{ display:'flex', gap:'0', background:'#232f4b', borderRadius:'10px', padding:'4px', marginBottom:'0' }}>
              {STEPS.map((s, i) => {
                const n = i + 1
                const isActive = step === n
                const isDone   = step > n
                return (
                  <div key={s} style={{ flex:1, padding:'8px 4px', textAlign:'center', borderRadius:'7px', fontSize:'11px',
                    fontWeight:700, color: isDone ? '#22c55e' : isActive ? '#f97316' : '#64748b',
                    background: isActive ? '#1a2540' : 'transparent', boxShadow: isActive ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
                    transition:'all .2s' }}>
                    <span style={{ width:'18px', height:'18px', borderRadius:'50%',
                      border: `1.5px solid ${isDone ? '#22c55e' : isActive ? '#f97316' : '#64748b'}`,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:'10px', marginRight:'4px',
                      background: isDone ? '#22c55e' : isActive ? '#f97316' : 'transparent',
                      color: isDone || isActive ? '#fff' : 'inherit' }}>
                      {isDone ? '✓' : n}
                    </span>
                    {s}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ padding:'28px 36px 32px' }}>
            {/* Erros */}
            {errors.length > 0 && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#fca5a5', marginBottom:'16px' }}>
                {errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
              </div>
            )}

            {/* Sucesso final */}
            {done && (
              <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
                borderRadius:'12px', padding:'20px', fontSize:'14px', color:'#86efac', textAlign:'center', marginBottom:'16px' }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
                <div style={{ fontWeight:800 }}>Conta criada com sucesso!</div>
                <div style={{ fontSize:'12px', marginTop:'6px', color:'#94a3b8' }}>
                  Verifique seu e-mail para ativar o acesso. Redirecionando para o login...
                </div>
              </div>
            )}

            {/* ── STEP 1: EMPRESA ── */}
            {step === 1 && !done && (
              <div>
                <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
                  borderRadius:'10px', padding:'12px 14px', fontSize:'12px', color:'#93c5fd',
                  display:'flex', gap:'10px', marginBottom:'20px' }}>
                  <span style={{ fontSize:'14px' }}>💡</span>
                  <div>Cada empresa tem um ambiente totalmente isolado. Seus dados são privados e seguros.</div>
                </div>
                <Input label="Razão Social / Nome da Empresa *" icon="🏢" placeholder="Ex: Construtora Silva Ltda"
                  value={form.razaoSocial} onChange={set('razaoSocial')}/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Input label="CNPJ" icon="📄" placeholder="00.000.000/0001-00"
                    value={form.cnpj} onChange={set('cnpj')}/>
                  <Input label="Telefone" icon="📞" placeholder="(11) 90000-0000"
                    value={form.telefone} onChange={set('telefone')}/>
                </div>
                <Input label="E-mail Corporativo *" icon="✉️" type="email" placeholder="contato@suaempresa.com.br"
                  value={form.emailEmpresa} onChange={set('emailEmpresa')}/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Select label="Estado (UF)" value={form.uf} onChange={set('uf')}>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
                      'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => <option key={u}>{u}</option>)}
                  </Select>
                  <Select label="Porte" value={form.porte} onChange={set('porte')}>
                    <option value="autonomo">Autônomo / MEI</option>
                    <option value="pequena">Pequena empresa</option>
                    <option value="media">Média empresa</option>
                    <option value="grande">Grande empresa</option>
                  </Select>
                </div>
                <button onClick={next} style={{ width:'100%', padding:'14px', background:'#f97316', color:'#fff',
                  borderRadius:'10px', fontWeight:700, fontSize:'15px', border:'none', cursor:'pointer' }}>
                  Próximo: Usuário Mestre →
                </button>
              </div>
            )}

            {/* ── STEP 2: USUÁRIO MESTRE ── */}
            {step === 2 && !done && (
              <div>
                <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)',
                  borderRadius:'10px', padding:'12px 14px', fontSize:'12px', color:'#c4b5fd',
                  display:'flex', gap:'10px', marginBottom:'20px' }}>
                  <span style={{ fontSize:'16px' }}>👑</span>
                  <div>O <strong>Usuário Mestre</strong> tem acesso total ao sistema e pode criar outros usuários.</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Input label="Nome *" icon="👤" placeholder="Seu nome"
                    value={form.nome} onChange={set('nome')}/>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#94a3b8',
                      marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.3px' }}>Sobrenome</label>
                    <input type="text" value={form.sobrenome} onChange={e=>set('sobrenome')(e.target.value)}
                      placeholder="Sobrenome"
                      style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
                        color:'#f1f5f9', borderRadius:'10px', padding:'12px 14px', fontSize:'14px' }}/>
                  </div>
                </div>
                <Input label="E-mail de Acesso *" icon="✉️" type="email" placeholder="seu@email.com"
                  value={form.email} onChange={set('email')}/>
                <Input label="Senha *" icon="🔑" type={showPwd ? 'text' : 'password'}
                  placeholder="Mín. 8 caracteres" value={form.senha} onChange={set('senha')}
                  right={
                    <button type="button" onClick={()=>setShowPwd(!showPwd)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'14px' }}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  }/>
                {/* Força da senha */}
                {form.senha.length > 0 && (
                  <div style={{ marginTop:'-12px', marginBottom:'16px' }}>
                    <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:'2px', transition:'all .3s',
                        width: pwdStrength(form.senha) * 25 + '%',
                        background: ['','#ef4444','#f59e0b','#3b82f6','#22c55e'][pwdStrength(form.senha)] }}/>
                    </div>
                    <div style={{ fontSize:'11px', marginTop:'4px', color:'#94a3b8' }}>
                      {['','Muito fraca','Fraca','Boa','Forte 💪'][pwdStrength(form.senha)]}
                    </div>
                  </div>
                )}
                <Input label="Confirmar Senha *" icon="🔒" type={showPwd2 ? 'text' : 'password'}
                  placeholder="Repita a senha" value={form.confirmarSenha} onChange={set('confirmarSenha')}
                  right={
                    <button type="button" onClick={()=>setShowPwd2(!showPwd2)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'14px' }}>
                      {showPwd2 ? '🙈' : '👁'}
                    </button>
                  }/>
                <Select label="Cargo" value={form.cargo} onChange={set('cargo')}>
                  <option value="dono">Dono / Sócio</option>
                  <option value="diretor">Diretor</option>
                  <option value="gerente">Gerente de Obras</option>
                  <option value="engenheiro">Engenheiro</option>
                  <option value="administrador">Administrador</option>
                </Select>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={back} style={{ padding:'13px 20px', background:'transparent', color:'#f1f5f9',
                    borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.08)', fontWeight:700, cursor:'pointer', fontSize:'14px' }}>← Voltar</button>
                  <button onClick={next} style={{ flex:1, padding:'14px', background:'#f97316', color:'#fff',
                    borderRadius:'10px', fontWeight:700, fontSize:'15px', border:'none', cursor:'pointer' }}>
                    Próximo: Escolher Plano →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: PLANO ── */}
            {step === 3 && !done && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
                  {PLANOS.map(p => (
                    <div key={p.slug} onClick={() => setForm(f => ({ ...f, plano: p.slug }))}
                      style={{ border: `1.5px solid ${form.plano === p.slug ? p.cor : 'rgba(255,255,255,0.08)'}`,
                        borderRadius:'10px', padding:'14px 12px', cursor:'pointer', transition:'all .15s', position:'relative',
                        background: form.plano === p.slug ? p.bgCor : 'transparent' }}>
                      {p.destaque && <div style={{ position:'absolute', top:'-9px', right:'8px',
                        background:'#f97316', color:'#fff', fontSize:'9px', fontWeight:800,
                        padding:'2px 8px', borderRadius:'99px' }}>⭐ POPULAR</div>}
                      {form.plano === p.slug && (
                        <div style={{ position:'absolute', top:'8px', right:'8px', width:'18px', height:'18px',
                          borderRadius:'50%', background: p.cor, display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:'10px', color:'#fff', fontWeight:700 }}>✓</div>
                      )}
                      <div style={{ fontSize:'13px', fontWeight:800, color:'#f1f5f9', marginBottom:'2px' }}>{p.nome}</div>
                      <div style={{ fontSize:'11px', color:'#94a3b8' }}>{p.preco}</div>
                      <span style={{ display:'inline-block', marginTop:'6px', fontSize:'10px', fontWeight:700,
                        padding:'2px 8px', borderRadius:'99px', background: p.bgCor, color: p.cor }}>{p.badge}</span>
                    </div>
                  ))}
                </div>

                {/* Forma de pagamento (apenas planos pagos) */}
                {form.plano !== 'trial' && (
                  <div style={{ background:'#232f4b', borderRadius:'10px', padding:'14px', marginBottom:'16px' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#94a3b8', marginBottom:'10px',
                      textTransform:'uppercase', letterSpacing:'.3px' }}>Forma de Pagamento</div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      {[{v:'12x',l:'12x (mais econômico)'},{v:'6x',l:'6x'},{v:'avista',l:'À vista (desconto)'}].map(o => (
                        <label key={o.v} style={{ flex:1, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px',
                          padding:'8px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:600,
                          border: `1.5px solid ${form.tipoPagamento===o.v ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                          background: form.tipoPagamento===o.v ? 'rgba(249,115,22,0.08)' : 'transparent',
                          color: form.tipoPagamento===o.v ? '#f97316' : '#94a3b8' }}>
                          <input type="radio" name="pgto" value={o.v} checked={form.tipoPagamento===o.v}
                            onChange={()=>setForm(f=>({...f,tipoPagamento:o.v}))}
                            style={{ accentColor:'#f97316' }}/>
                          {o.l}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={back} style={{ padding:'13px 20px', background:'transparent', color:'#f1f5f9',
                    borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.08)', fontWeight:700, cursor:'pointer', fontSize:'14px' }}>← Voltar</button>
                  <button onClick={next} style={{ flex:1, padding:'14px', background:'#f97316', color:'#fff',
                    borderRadius:'10px', fontWeight:700, fontSize:'15px', border:'none', cursor:'pointer' }}>
                    Próximo: Confirmar →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: CONFIRMAR ── */}
            {step === 4 && !done && (
              <div>
                {/* Resumo */}
                <div style={{ background:'#232f4b', borderRadius:'12px', padding:'18px', marginBottom:'20px' }}>
                  <div style={{ fontWeight:800, marginBottom:'14px', fontSize:'14px', color:'#f1f5f9' }}>📋 Resumo do Cadastro</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px', fontSize:'13px' }}>
                    {[
                      ['Empresa',     form.razaoSocial || '—'],
                      ['E-mail corp.',  form.emailEmpresa || '—'],
                      ['Usuário mestre', `${form.nome} ${form.sobrenome}`.trim() || '—'],
                      ['Login',        form.email || '—'],
                      ['Cargo',        form.cargo],
                      ['Permissão',    '👑 Admin Master'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div style={{ fontSize:'11px', color:'#64748b' }}>{k}</div>
                        <div style={{ fontWeight:600, color: k==='Permissão' ? '#f97316' : '#f1f5f9' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:'14px', paddingTop:'12px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'4px' }}>Plano selecionado</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:800, color: planoSel.cor }}>{planoSel.nome}</span>
                      <span style={{ fontSize:'12px', color:'#94a3b8' }}>
                        {form.plano === 'trial' ? 'Grátis (trial 14 dias)' : `Parcelado ${form.tipoPagamento}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aceite */}
                <div style={{ marginBottom:'12px', display:'flex', alignItems:'flex-start', gap:'8px' }}>
                  <input type="checkbox" id="aceite" style={{ accentColor:'#f97316', width:'14px', height:'14px', marginTop:'2px' }}/>
                  <label htmlFor="aceite" style={{ fontSize:'11px', color:'#94a3b8', cursor:'pointer', lineHeight:1.5 }}>
                    Li e aceito os <Link to="/termos" style={{ color:'#f97316' }}>Termos de Uso</Link> e a{' '}
                    <Link to="/privacidade" style={{ color:'#f97316' }}>Política de Privacidade</Link> do Gestão PRO
                  </label>
                </div>

                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={back} style={{ padding:'13px 20px', background:'transparent', color:'#f1f5f9',
                    borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.08)', fontWeight:700, cursor:'pointer', fontSize:'14px' }}>← Voltar</button>
                  <button onClick={finalizar} disabled={loading}
                    style={{ flex:1, padding:'14px', background: loading ? '#64748b' : '#f97316', color:'#fff',
                      borderRadius:'10px', fontWeight:700, fontSize:'15px', border:'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? '⏳ Criando conta...' : '🚀 Criar Minha Conta'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop:'20px', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.06)',
              textAlign:'center', fontSize:'13px', color:'#94a3b8' }}>
              Já tem uma conta?{' '}
              <Link to="/login" style={{ color:'#f97316', fontWeight:700, textDecoration:'none' }}>Fazer login →</Link>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign:'center', padding:'20px', fontSize:'11px', color:'#64748b', position:'relative', zIndex:1 }}>
        &copy; 2026 Gestão PRO · ERP para Construção Civil
      </footer>
    </div>
  )
}
