import { criarCrud } from './crud'

// RF02 — alas, com a contagem de leitos de cada uma
export const alasService = criarCrud('alas', {
  colunas: '*, leitos(count)',
  ordem: [['andar'], ['nome']],
})

// RF02 — leitos e consultórios, com o nome da ala
export const leitosService = criarCrud('leitos', {
  colunas: '*, ala:alas(id, nome, planta_colunas, planta_linhas)',
  ordem: [['codigo']],
})

// RF03 — corpo clínico, com ala e consultório vinculados
export const profissionaisService = criarCrud('profissionais', {
  colunas: '*, ala:alas(nome), consultorio:leitos(codigo)',
  ordem: [['nome']],
})
