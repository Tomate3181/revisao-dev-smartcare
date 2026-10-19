/**
 * Motor de Alocação de Recursos Clínicos (RF05, parte 1).
 *
 * Seleciona o melhor médico e leito/sala para o paciente com base em:
 * 1. Compatibilidade de especialidade médica
 * 2. Menor fila de pacientes em espera para o profissional
 * 3. Adequação da prioridade clínica ao tipo de leito (UTI, Observação, Consultório)
 * 4. Disponibilidade do leito (status === 'livre')
 */

/**
 * Recomenda médico e leito ideais para um atendimento triado.
 *
 * @param {Object} params
 * @param {'vermelho'|'laranja'|'amarelo'|'verde'|'azul'} params.prioridade - Prioridade Manchester
 * @param {string} [params.especialidade] - Especialidade recomendada
 * @param {Array} params.profissionais - Lista de profissionais cadastrados
 * @param {Array} params.leitos - Lista de leitos e consultórios cadastrados
 * @param {Array} [params.atendimentosAtivos] - Lista de atendimentos em andamento para calcular a fila de cada médico
 * @returns {Object} { medicoId, medico, leitoId, leito, justificativa }
 */
export function recomendarAlocacao({
  prioridade = 'verde',
  especialidade = 'Clínica Geral',
  profissionais = [],
  leitos = [],
  atendimentosAtivos = [],
}) {
  // 1. Filtrar médicos ativos (com CRM)
  const medicosAtivos = profissionais.filter(
    (p) => p.ativo && (p.tipo_registro === 'CRM' || p.tipo === 'CRM'),
  )

  if (medicosAtivos.length === 0) {
    return {
      medicoId: null,
      medico: null,
      leitoId: null,
      leito: null,
      justificativa: 'Nenhum médico com CRM ativo cadastrado no sistema.',
    }
  }

  // 2. Contar fila atual de cada médico (quantos pacientes já estão alocados a ele aguardando ou em atendimento)
  const filaPorMedico = {}
  medicosAtivos.forEach((m) => {
    filaPorMedico[m.id] = 0
  })

  atendimentosAtivos.forEach((a) => {
    if (a.medico_id && filaPorMedico[a.medico_id] !== undefined) {
      if (['aguardando_medico', 'em_atendimento', 'em_medicacao'].includes(a.status)) {
        filaPorMedico[a.medico_id]++
      }
    }
  })

  // 3. Escolher o melhor médico por especialidade e menor fila
  const especialistas = medicosAtivos.filter(
    (m) => m.especialidade?.toLowerCase() === especialidade?.toLowerCase(),
  )

  const candidatosMedicos = especialistas.length > 0 ? especialistas : medicosAtivos

  // Ordena pelo menor tamanho de fila
  candidatosMedicos.sort((a, b) => {
    const filaA = filaPorMedico[a.id] ?? 0
    const filaB = filaPorMedico[b.id] ?? 0
    return filaA - filaB
  })

  const medicoEscolhido = candidatosMedicos[0]
  const filaDoEscolhido = filaPorMedico[medicoEscolhido.id] ?? 0

  // 4. Escolher o leito/sala adequado para a prioridade clínica
  let leitoEscolhido = null

  const leitosLivres = leitos.filter((l) => l.status === 'livre')

  if (prioridade === 'vermelho') {
    // Emergência: prioridade para leito de UTI ou Isolamento livre
    leitoEscolhido =
      leitosLivres.find((l) => l.tipo === 'uti') ||
      leitosLivres.find((l) => l.tipo === 'observacao') ||
      null
  } else if (prioridade === 'laranja') {
    // Muito urgente: leito de Observação ou UTI
    leitoEscolhido =
      leitosLivres.find((l) => l.tipo === 'observacao') ||
      leitosLivres.find((l) => l.tipo === 'uti') ||
      null
  } else if (prioridade === 'amarelo') {
    // Urgente: leito de Observação livre ou consultório do médico
    leitoEscolhido =
      leitosLivres.find((l) => l.tipo === 'observacao') ||
      leitosLivres.find((l) => l.id === medicoEscolhido.consultorio_id) ||
      leitosLivres.find((l) => l.tipo === 'consultorio') ||
      null
  } else {
    // Verde / Azul: Consultório médico do profissional ou consultório livre
    if (medicoEscolhido.consultorio_id) {
      leitoEscolhido = leitosLivres.find((l) => l.id === medicoEscolhido.consultorio_id) || null
    }
    if (!leitoEscolhido) {
      leitoEscolhido =
        leitosLivres.find(
          (l) => l.tipo === 'consultorio' && l.especialidade === medicoEscolhido.especialidade,
        ) ||
        leitosLivres.find((l) => l.tipo === 'consultorio') ||
        null
    }
  }

  // 5. Montar justificativa explicativa
  const motivoEspecialidade =
    especialistas.length > 0
      ? `especialidade ${especialidade}`
      : `sem ${especialidade} disponível, alocado para ${medicoEscolhido.especialidade}`

  const motivoFila = `menor fila atual (${filaDoEscolhido} paciente${filaDoEscolhido === 1 ? '' : 's'} em espera)`

  const motivoLeito = leitoEscolhido
    ? `no leito/sala ${leitoEscolhido.codigo} (${leitoEscolhido.tipo}) livre`
    : 'sem leito livre no momento (aguarda no acolhimento)'

  const justificativa = `Encaminhado ao ${medicoEscolhido.nome} (${motivoEspecialidade}, ${motivoFila}) ${motivoLeito}.`

  return {
    medicoId: medicoEscolhido.id,
    medico: medicoEscolhido,
    leitoId: leitoEscolhido?.id ?? null,
    leito: leitoEscolhido,
    justificativa,
  }
}
