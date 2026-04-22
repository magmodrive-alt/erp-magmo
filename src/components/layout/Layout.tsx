import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText, Package2,
  Banknote, BarChart3, Settings, LogOut, Menu, X,
  ChevronDown, Bell, HardHat, Layers, ArrowLeftRight,
  BookOpen, ChevronRight
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  label: string
  icon: React.ReactNode
  href?: string
  children?: { label: string; href: string; icon?: React.ReactNode }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
  {
    label: 'Cadastros',
    icon: <Users size={20} />,
    children: [
      { label: 'Clientes', href: '/clientes', icon: <Users size={16} /> },
      { label: 'Fornecedores', href: '/fornecedores', icon: <Package2 size={16} /> },
    ]
  },
  { label: 'Obras', icon: <HardHat size={20} />, href: '/obras' },
  {
    label: 'Insumos & Composições',
    icon: <Layers size={20} />,
    children: [
      { label: 'Banco de Insumos', href: '/insumos', icon: <BookOpen size={16} /> },
      { label: 'Composições', href: '/composicoes', icon: <Layers size={16} /> },
    ]
  },
  { label: 'Orçamentos', icon: <FileText size={20} />, href: '/orcamentos' },
  {
    label: 'Financeiro',
    icon: <Banknote size={20} />,
    children: [
      { label: 'Visão Geral', href: '/financeiro', icon: <LayoutDashboard size={16} /> },
      { label: 'Contas', href: '/financeiro/contas', icon: <Building2 size={16} /> },
      { label: 'Lançamentos', href: '/financeiro/lancamentos', icon: <ArrowLeftRight size={16} /> },
      { label: 'Provisões', href: '/financeiro/provisoes', icon: <Banknote size={16} /> },
      { label: 'Medições', href: '/financeiro/medicoes', icon: <FileText size={16} /> },
    ]
  },
  { label: 'Relatórios', icon: <BarChart3 size={20} />, href: '/relatorios' },
  { label: 'Configurações', icon: <Settings size={20} />, href: '/configuracoes' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Financeiro'])
  const location = useLocation()
  const navigate = useNavigate()
  const { perfil, empresa, signOut } = useAuth()

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    )
  }

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-[#0f1729] text-white transition-all duration-300 relative z-20',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <HardHat size={18} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="font-bold text-sm leading-tight truncate">ERP MAGMO</p>
                <p className="text-xs text-white/50 truncate">{empresa?.nome || 'Carregando...'}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-white/50 hover:text-white flex-shrink-0"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-orange-500 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown
                          size={14}
                          className={cn('transition-transform', expandedItems.includes(item.label) ? 'rotate-180' : '')}
                        />
                      </>
                    )}
                  </button>
                  {sidebarOpen && expandedItems.includes(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children?.map(child => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
                            isActive(child.href)
                              ? 'bg-orange-500/20 text-orange-400 font-medium'
                              : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                          )}
                        >
                          {child.icon}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
              {perfil?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{perfil?.nome || 'Usuário'}</p>
                <p className="text-xs text-white/40 truncate capitalize">{perfil?.role}</p>
              </div>
            )}
            <button onClick={handleSignOut} className="text-white/40 hover:text-red-400 flex-shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-gray-500 flex-1">
            <span className="text-orange-500 font-medium">ERP MAGMO</span>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">
              {navItems.find(n => n.href && location.pathname.startsWith(n.href))?.label ||
               navItems.flatMap(n => n.children || []).find(c => location.pathname.startsWith(c.href))?.label ||
               'Dashboard'}
            </span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {perfil?.nome?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{perfil?.nome}</p>
                <p className="text-xs text-gray-400">{empresa?.nome}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
