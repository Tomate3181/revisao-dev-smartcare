import { supabase } from '@/lib/supabase'
import { ROTULO_PERFIL } from '@/lib/perfis'

// Erro com mensagem já pronta para o usuário (sem detalhes técnicos).
export class ErroLogin extends Error {}

/**
 * Login do RF01: e-mail OU registro profissional (CRM/COREN) + senha + perfil.
 *
 * O Supabase Auth só autentica por e-mail. Quando o usuário digita um registro, a RPC
 * email_por_registro (03_functions.sql) devolve o e-mail daquele registro naquele perfil.
 * Depois do login conferimos se o perfil escolhido é mesmo o do usuário; se não for,
 * a sessão é encerrada na hora.
 */
export async function entrar({ identificador, senha, perfil }) {
  const valor = identificador.trim()
  let email = valor

  if (!valor.includes('@')) {
    const { data, error } = await supabase.rpc('email_por_registro', { p_registro: valor, p_perfil: perfil })
    if (error) throw new ErroLogin('Não foi possível conectar ao servidor. Verifique a internet e tente novamente.')
    // mesma mensagem de senha errada: não revelamos se o registro existe
    if (!data) throw new ErroLogin('Registro, senha ou perfil não conferem. Confira os dados e tente de novo.')
    email = data
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) {
    if (error.status === 400 || error.code === 'invalid_credentials') {
      throw new ErroLogin('E-mail/registro ou senha não conferem. Confira os dados e tente de novo.')
    }
    throw new ErroLogin('Não foi possível conectar ao servidor. Verifique a internet e tente novamente.')
  }

  const profile = await buscarProfile(data.user.id)
  if (!profile?.ativo) {
    await supabase.auth.signOut()
    throw new ErroLogin('Seu cadastro ainda não foi ativado. Peça ao administrador do sistema para liberar o acesso.')
  }
  if (profile.perfil !== perfil) {
    await supabase.auth.signOut()
    throw new ErroLogin(`Este usuário não tem o perfil "${ROTULO_PERFIL[perfil]}". Selecione o perfil correto.`)
  }
  return profile
}

export async function sair() {
  await supabase.auth.signOut()
}

export async function buscarProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, perfil, registro, ativo, profissional_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
