// Traduz erros do Postgres/Supabase para mensagens que ajudam o usuário a resolver,
// sem expor detalhes técnicos. Códigos: https://www.postgresql.org/docs/current/errcodes-appendix.html

export function mensagemErro(erro, contexto = {}) {
  const codigo = erro?.code
  const detalhe = `${erro?.message ?? ''} ${erro?.details ?? ''}`

  if (codigo === '23505') {
    if (detalhe.includes('pos_x')) return 'Já existe um leito nessa posição da planta. Escolha outra célula.'
    return contexto.duplicado ?? 'Já existe um cadastro com esses dados.'
  }
  if (codigo === '23503') return contexto.emUso ?? 'Este item está em uso por outros cadastros e não pode ser excluído.'
  if (codigo === '23514') return 'Algum valor está fora do permitido. Revise os campos e tente de novo.'
  if (codigo === '42501' || erro?.status === 403) return 'Seu perfil não tem permissão para esta ação.'
  if (erro?.message?.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  return 'Não foi possível concluir. Tente de novo em instantes.'
}
