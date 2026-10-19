import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PAINEL_POR_PERFIL } from '@/lib/perfis'
import { Spinner } from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { RotaProtegida } from './RotaProtegida'
import { perfisDaTela } from './menu'

// Cada tela vira um arquivo JS separado, baixado só quando é aberta (RNF02).
const Login = lazy(() => import('@/pages/login/Login'))
const PainelAdmin = lazy(() => import('@/pages/admin/PainelAdmin'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const PainelRecepcao = lazy(() => import('@/pages/recepcao/PainelRecepcao'))
const PainelTriagem = lazy(() => import('@/pages/triagem/PainelTriagem'))
const PainelMedico = lazy(() => import('@/pages/medico/PainelMedico'))
const Monitor = lazy(() => import('@/pages/monitor/Monitor'))
const Ajuda = lazy(() => import('@/pages/ajuda/Ajuda'))
const NaoEncontrada = lazy(() => import('@/pages/NaoEncontrada'))

const telas = [
  ['/admin', PainelAdmin],
  ['/dashboard', Dashboard],
  ['/recepcao', PainelRecepcao],
  ['/triagem', PainelTriagem],
  ['/medico', PainelMedico],
  ['/monitor', Monitor],
  ['/ajuda', Ajuda],
]

function Inicio() {
  const { profile, carregando } = useAuth()
  if (carregando) return null
  return <Navigate to={profile ? PAINEL_POR_PERFIL[profile.perfil] : '/login'} replace />
}

const Carregando = () => (
  <div className="grid min-h-[50dvh] place-items-center">
    <Spinner />
  </div>
)

export function AppRoutes() {
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Inicio />} />

        <Route element={<RotaProtegida />}>
          <Route element={<Layout />}>
            {telas.map(([caminho, Tela]) => (
              <Route key={caminho} element={<RotaProtegida perfis={perfisDaTela(caminho)} />}>
                <Route path={caminho} element={<Tela />} />
              </Route>
            ))}
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
