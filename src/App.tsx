import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/layout/PrivateRoute'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientesPage from './pages/clientes/ClientesPage'
import ObrasPage from './pages/obras/ObrasPage'
import InsumosPage from './pages/insumos/InsumosPage'
import ComposicoesPage from './pages/insumos/ComposicoesPage'
import OrcamentosPage from './pages/orcamentos/OrcamentosPage'
import FinanceiroPage from './pages/financeiro/FinanceiroPage'
import ContasPage from './pages/financeiro/ContasPage'
import LancamentosPage from './pages/financeiro/LancamentosPage'
import ProvisoesPage from './pages/financeiro/ProvisoesPage'

// Página em branco para rotas ainda não implementadas
function EmBreve({ nome }: { nome: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 text-3xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-gray-700">{nome}</h2>
      <p className="text-gray-400 mt-2 text-sm">Módulo em desenvolvimento — disponível em breve</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Cadastros */}
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/fornecedores" element={<EmBreve nome="Fornecedores" />} />
              {/* Obras */}
              <Route path="/obras" element={<ObrasPage />} />
              <Route path="/obras/nova" element={<EmBreve nome="Nova Obra" />} />
              <Route path="/obras/:id" element={<EmBreve nome="Detalhe da Obra" />} />
              {/* Insumos */}
              <Route path="/insumos" element={<InsumosPage />} />
              <Route path="/composicoes" element={<ComposicoesPage />} />
              {/* Orçamentos */}
              <Route path="/orcamentos" element={<OrcamentosPage />} />
              <Route path="/orcamentos/novo" element={<EmBreve nome="Novo Orçamento" />} />
              <Route path="/orcamentos/:id" element={<EmBreve nome="Detalhe Orçamento" />} />
              {/* Financeiro */}
              <Route path="/financeiro" element={<FinanceiroPage />} />
              <Route path="/financeiro/contas" element={<ContasPage />} />
              <Route path="/financeiro/lancamentos" element={<LancamentosPage />} />
              <Route path="/financeiro/provisoes" element={<ProvisoesPage />} />
              <Route path="/financeiro/medicoes" element={<EmBreve nome="Medições" />} />
              {/* Outros */}
              <Route path="/relatorios" element={<EmBreve nome="Relatórios" />} />
              <Route path="/configuracoes" element={<EmBreve nome="Configurações" />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
