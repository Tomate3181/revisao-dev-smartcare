// Perfis de acesso (RF01) e o painel inicial de cada um.
// Os valores batem com o enum public.perfil do banco.

export const PERFIS = ['admin', 'medico', 'enfermeiro', 'recepcionista']

export const ROTULO_PERFIL = {
  admin: 'Administrador',
  medico: 'Médico',
  enfermeiro: 'Enfermeiro de triagem',
  recepcionista: 'Recepcionista',
}

// Após o login, cada perfil cai direto na tela onde trabalha.
export const PAINEL_POR_PERFIL = {
  admin: '/admin',
  medico: '/medico',
  enfermeiro: '/triagem',
  recepcionista: '/recepcao',
}
