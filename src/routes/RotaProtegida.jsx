import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import AcessoNegado from '@/pages/AcessoNegado'

/**
 * Sem login → vai para /login (lembrando de onde veio).
 * Logado, mas com outro perfil → tela de acesso negado (RF01: acesso conforme o perfil).
 */
export function RotaProtegida({ perfis }) {
  const { sessao, profile, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner rotulo="Verificando acesso" />
      </div>
    )
  }
  if (!sessao || !profile) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  if (perfis && !perfis.includes(profile.perfil)) return <AcessoNegado />
  return <Outlet />
}
