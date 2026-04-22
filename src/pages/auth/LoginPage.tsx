import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail]     = useState('')
  const [pwd, setPwd]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pwd) { setError('Preencha e-mail e senha.'); return }
    setError(''); setLoading(true)
    try {
      await signIn(email, pwd)
      navigate('/dashboard')
    } catch {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotSent(true)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f1729', display:'flex', flexDirection:'column' }}>
      {/* Glow BG */}
      <div style={{ position:'fixed', top:'-200px', left:'-200px', width:'600px', height:'600px',
        background:'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }}/>

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
            <div style={{ fontSize:'10px', color:'#f97316', fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase' }}>ERP Construção Civil</div>
          </div>
        </div>
        <Link to="/register" style={{ padding:'9px 20px', background:'#f97316', color:'#fff',
          borderRadius:'8px', fontWeight:700, fontSize:'13px', textDecoration:'none',
          boxShadow:'0 4px 14px rgba(249,115,22,0.3)' }}>
          Criar conta grátis
        </Link>
      </header>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'100px 20px 60px', position:'relative', zIndex:1 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', maxWidth:'900px', width:'100%',
          background:'#1a2540', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px',
          overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' }}>

          {/* HERO */}
          <div style={{ background:'linear-gradient(145deg, #1a2c50 0%, #0f1f3d 100%)',
            padding:'48px 40px', display:'flex', flexDirection:'column', justifyContent:'space-between',
            position:'relative', overflow:'hidden' }}>
            <div>
              <div style={{ marginBottom:'36px' }}>
                <div style={{ fontSize:'28px', fontWeight:800, lineHeight:1.2, marginBottom:'12px', color:'#f1f5f9' }}>
                  O ERP que sua<br/><span style={{ color:'#f97316' }}>construtora precisa</span>
                </div>
                <div style={{ fontSize:'14px', color:'#94a3b8', lineHeight:1.6 }}>
                  Gerencie obras, orçamentos, equipes e finanças em um só lugar.
                </div>
              </div>
              {[
                ['🏗','Gestão de Obras', 'Diário, equipe, % execução'],
                ['📋','Orçamentos', 'Com SINAPI, FDE, ORSE e mais'],
                ['💰','Financeiro', 'Conta gerencial + provisões'],
                ['📊','Relatórios', 'DRE por obra, fluxo de caixa'],
                ['🔒','Multi-empresa', 'Dados isolados e seguros'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', fontSize:'13px', color:'#94a3b8' }}>
                  <div style={{ width:'26px', height:'26px', borderRadius:'7px', background:'rgba(249,115,22,0.15)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{icon}</div>
                  <div><strong style={{ color:'#f1f5f9' }}>{title}</strong> — {desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'32px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'8px' }}>Planos disponíveis:</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {['🆓 Trial grátis', 'Starter R$797/ano', '⭐ Pro R$1.597/ano', 'Enterprise'].map(p => (
                  <span key={p} style={{ padding:'4px 10px', borderRadius:'99px', fontSize:'10px',
                    fontWeight:700, border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* FORM */}
          <div style={{ padding:'48px 44px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#f1f5f9', marginBottom:'6px' }}>🔐 Bem-vindo de volta</div>
              <div style={{ fontSize:'13px', color:'#94a3b8' }}>Entre com seu e-mail e senha para acessar o sistema</div>
            </div>

            {error && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#fca5a5', marginBottom:'16px' }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#94a3b8',
                  marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.3px' }}>E-mail</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'15px', pointerEvents:'none' }}>✉️</span>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="seu@email.com" autoComplete="email"
                    style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
                      color:'#f1f5f9', borderRadius:'10px', padding:'12px 14px 12px 40px', fontSize:'14px' }}/>
                </div>
              </div>

              {/* Senha */}
              <div style={{ marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'7px' }}>
                  <label style={{ fontSize:'12px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.3px' }}>Senha</label>
                  <button type="button" onClick={()=>setShowForgot(!showForgot)}
                    style={{ background:'none', border:'none', color:'#f97316', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
                    Esqueci minha senha
                  </button>
                </div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'15px', pointerEvents:'none' }}>🔑</span>
                  <input type={showPwd?'text':'password'} value={pwd} onChange={e=>setPwd(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
                      color:'#f1f5f9', borderRadius:'10px', padding:'12px 40px 12px 40px', fontSize:'14px' }}/>
                  <button type="button" onClick={()=>setShowPwd(!showPwd)}
                    style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'14px' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Lembrar */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'22px' }}>
                <input type="checkbox" id="remember" checked={remember} onChange={e=>setRemember(e.target.checked)}
                  style={{ accentColor:'#f97316', width:'14px', height:'14px' }}/>
                <label htmlFor="remember" style={{ fontSize:'11px', color:'#94a3b8', cursor:'pointer' }}>
                  Manter conectado por 30 dias
                </label>
              </div>

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'14px', background: loading ? '#64748b' : '#f97316',
                  color:'#fff', borderRadius:'10px', fontWeight:700, fontSize:'15px', border:'none',
                  cursor: loading ? 'not-allowed' : 'pointer', boxShadow:'0 4px 14px rgba(249,115,22,0.3)',
                  transition:'all .18s' }}>
                {loading ? '⏳ Verificando...' : '🚀 Acessar o Sistema'}
              </button>
            </form>

            {/* Recuperar senha */}
            {showForgot && !forgotSent && (
              <div style={{ marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:'13px', fontWeight:700, marginBottom:'12px', color:'#f1f5f9' }}>🔑 Recuperar senha</div>
                <form onSubmit={handleForgot}>
                  <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{ width:'100%', background:'#232f4b', border:'1.5px solid rgba(255,255,255,0.08)',
                      color:'#f1f5f9', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', marginBottom:'10px' }}/>
                  <button type="submit"
                    style={{ width:'100%', padding:'10px', background:'transparent', color:'#f1f5f9',
                      borderRadius:'8px', border:'1.5px solid rgba(255,255,255,0.08)', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>
                    Enviar link de recuperação
                  </button>
                </form>
              </div>
            )}
            {showForgot && forgotSent && (
              <div style={{ marginTop:'16px', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
                borderRadius:'10px', padding:'12px', fontSize:'12px', color:'#86efac', textAlign:'center' }}>
                ✅ Link enviado! Verifique seu e-mail.
              </div>
            )}

            <div style={{ marginTop:'24px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.06)',
              textAlign:'center', fontSize:'13px', color:'#94a3b8' }}>
              Não tem conta?{' '}
              <Link to="/register" style={{ color:'#f97316', fontWeight:700, textDecoration:'none' }}>
                Criar conta grátis →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign:'center', padding:'24px', fontSize:'11px', color:'#64748b', position:'relative', zIndex:1 }}>
        &copy; 2026 Gestão PRO · ERP para Construção Civil
      </footer>
    </div>
  )
}
