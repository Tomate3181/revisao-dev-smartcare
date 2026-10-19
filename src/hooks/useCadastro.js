import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Liga um serviço de CRUD ao cache do TanStack Query (RNF02).
 * `afeta`: outras listas que mudam junto (ex.: salvar um leito altera a contagem das alas).
 */
export function useCadastro(chave, service, { afeta = [] } = {}) {
  const queryClient = useQueryClient()
  const consulta = useQuery({ queryKey: [chave], queryFn: service.listar })

  const invalidar = () => [chave, ...afeta].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }))

  const salvar = useMutation({ mutationFn: service.salvar, onSuccess: invalidar })
  const excluir = useMutation({ mutationFn: service.excluir, onSuccess: invalidar })

  return { consulta, salvar, excluir }
}
