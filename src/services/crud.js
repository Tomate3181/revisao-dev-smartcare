import { supabase } from '@/lib/supabase'

/**
 * Operações básicas de uma tabela. Cada serviço de domínio (alas, leitos...) monta o seu
 * a partir daqui e só define o que muda: colunas da listagem e ordenação.
 * Erros do Supabase são relançados como estão; quem exibe usa lib/erros.js.
 */
export function criarCrud(tabela, { colunas = '*', ordem = [] } = {}) {
  return {
    async listar() {
      let q = supabase.from(tabela).select(colunas)
      for (const [coluna, asc = true] of ordem) q = q.order(coluna, { ascending: asc, nullsFirst: false })
      const { data, error } = await q
      if (error) throw error
      return data
    },

    // Com id → atualiza; sem id → cria.
    async salvar({ id, ...dados }) {
      const q = id ? supabase.from(tabela).update(dados).eq('id', id) : supabase.from(tabela).insert(dados)
      const { data, error } = await q.select('id').single()
      if (error) throw error
      return data
    },

    async excluir(id) {
      // .select() faz o PostgREST devolver o que foi apagado: lista vazia = a RLS barrou
      const { data, error } = await supabase.from(tabela).delete().eq('id', id).select('id')
      if (error) throw error
      if (!data.length) throw Object.assign(new Error('Sem permissão'), { code: '42501' })
    },
  }
}
