import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buscarProfile } from '@/services/auth'
import { AuthContext } from '@/hooks/authContext'

export function AuthProvider({ children }) {
  // undefined = ainda verificando; null = sem sessão
  const [sessao, setSessao] = useState(undefined)
  // perfil carregado + de qual usuário ele é (evita mostrar o perfil de uma sessão anterior)
  const [carregado, setCarregado] = useState({ userId: null, profile: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    // Só guardamos a sessão aqui: chamar o Supabase dentro deste callback pode travar o cliente.
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao))
    return () => data.subscription.unsubscribe()
  }, [])

  // Depende só do id do usuário: a renovação automática do token troca o objeto da sessão,
  // mas não deve recarregar o perfil nem piscar a tela de carregamento.
  const userId = sessao?.user?.id ?? null
  useEffect(() => {
    if (!userId) return
    let ativo = true
    buscarProfile(userId)
      .then((p) => ativo && setCarregado({ userId, profile: p?.ativo ? p : null }))
      .catch(() => ativo && setCarregado({ userId, profile: null }))
    return () => {
      ativo = false
    }
  }, [userId])

  const valor = useMemo(() => {
    const perfilAtual = userId && carregado.userId === userId
    return {
      sessao: sessao ?? null,
      profile: perfilAtual ? carregado.profile : null,
      carregando: sessao === undefined || (Boolean(userId) && !perfilAtual),
    }
  }, [sessao, userId, carregado])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
