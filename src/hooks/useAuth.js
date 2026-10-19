import { useContext } from 'react'
import { AuthContext } from './authContext'

/** Usuário logado: { sessao, profile, carregando }. profile.perfil define o que ele acessa. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
