import { supabase } from '@/lib/supabase'

export const triagemService = {
  /**
   * Lista todos os pacientes na fila aguardando triagem pelo enfermeiro.
   */
  async listarFila() {
    const { data, error } = await supabase
      .from('atendimentos')
      .select(`
        id,
        status,
        queixa_principal,
        sintomas,
        origem,
        chegada_em,
        paciente:pacientes(
          id,
          nome,
          cpf,
          data_nascimento,
          sexo,
          telefone,
          convenio,
          alergias,
          comorbidades
        ),
        sinais_vitais(
          id,
          momento,
          pa_sistolica,
          pa_diastolica,
          frequencia_cardiaca,
          frequencia_respiratoria,
          temperatura,
          saturacao,
          glicemia,
          dor,
          glasgow,
          registrado_em
        )
      `)
      .eq('status', 'aguardando_triagem')
      .order('chegada_em', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  /**
   * Busca médicos, leitos e atendimentos ativos para alimentar o motor de alocação automática.
   */
  async buscarRecursosAlocacao() {
    const [resProfissionais, resLeitos, resAtendimentos] = await Promise.all([
      supabase
        .from('profissionais')
        .select('id, nome, tipo_registro, especialidade, turno, ala_id, consultorio_id, ativo')
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('leitos')
        .select('id, codigo, tipo, especialidade, status, ala_id, ala:alas(nome)')
        .order('codigo'),
      supabase
        .from('atendimentos')
        .select('id, medico_id, leito_id, status')
        .in('status', ['aguardando_medico', 'em_atendimento', 'em_medicacao']),
    ])

    if (resProfissionais.error) throw resProfissionais.error
    if (resLeitos.error) throw resLeitos.error
    if (resAtendimentos.error) throw resAtendimentos.error

    return {
      profissionais: resProfissionais.data ?? [],
      leitos: resLeitos.data ?? [],
      atendimentosAtivos: resAtendimentos.data ?? [],
    }
  },

  /**
   * Conclui a classificação de risco de Manchester e a alocação clínica do atendimento.
   */
  async concluirTriagem({
    atendimentoId,
    prioridadeSugerida,
    prioridadeFinal,
    classificacaoOrigem = 'motor_local',
    justificativaTriagem,
    motivoAlteracao = null,
    tempoLimiteMin,
    medicoId = null,
    leitoId = null,
    sinaisVitais = {},
    enfermeiroId,
  }) {
    const agora = new Date()
    const prazoEm = new Date(agora.getTime() + tempoLimiteMin * 60_000).toISOString()

    // 1. Registra os sinais vitais aferidos na triagem
    const temSinais = sinaisVitais && Object.values(sinaisVitais).some((v) => v !== null && v !== undefined && v !== '')
    if (temSinais) {
      const { error: erroSinais } = await supabase.from('sinais_vitais').insert({
        atendimento_id: atendimentoId,
        momento: 'triagem',
        pa_sistolica: sinaisVitais.pa_sistolica ? Number(sinaisVitais.pa_sistolica) : null,
        pa_diastolica: sinaisVitais.pa_diastolica ? Number(sinaisVitais.pa_diastolica) : null,
        temperatura: sinaisVitais.temperatura ? Number(sinaisVitais.temperatura) : null,
        frequencia_cardiaca: sinaisVitais.frequencia_cardiaca ? Number(sinaisVitais.frequencia_cardiaca) : null,
        frequencia_respiratoria: sinaisVitais.frequencia_respiratoria ? Number(sinaisVitais.frequencia_respiratoria) : null,
        saturacao: sinaisVitais.saturacao ? Number(sinaisVitais.saturacao) : null,
        dor: sinaisVitais.dor !== null && sinaisVitais.dor !== undefined && sinaisVitais.dor !== '' ? Number(sinaisVitais.dor) : null,
        glicemia: sinaisVitais.glicemia ? Number(sinaisVitais.glicemia) : null,
        glasgow: sinaisVitais.glasgow ? Number(sinaisVitais.glasgow) : 15,
        registrado_por: enfermeiroId || null,
      })
      if (erroSinais) throw erroSinais
    }

    // 2. Atualiza o atendimento com a classificação e alocação clínica
    const foiAlterado = prioridadeFinal !== prioridadeSugerida
    const origemFinal = foiAlterado ? 'manual' : classificacaoOrigem

    const { error: erroAtend } = await supabase
      .from('atendimentos')
      .update({
        status: 'aguardando_medico',
        prioridade_sugerida: prioridadeSugerida,
        prioridade: prioridadeFinal,
        classificacao_origem: origemFinal,
        justificativa_triagem: justificativaTriagem,
        motivo_alteracao: foiAlterado ? motivoAlteracao?.trim() : null,
        tempo_limite_min: tempoLimiteMin,
        prazo_em: prazoEm,
        triagem_em: agora.toISOString(),
        enfermeiro_id: enfermeiroId || null,
        medico_id: medicoId || null,
        leito_id: leitoId || null,
      })
      .eq('id', atendimentoId)

    if (erroAtend) throw erroAtend

    // 3. Se um leito foi selecionado, marca-o como 'ocupado'
    if (leitoId) {
      const { error: erroLeito } = await supabase
        .from('leitos')
        .update({
          status: 'ocupado',
          status_desde: agora.toISOString(),
        })
        .eq('id', leitoId)
        .eq('status', 'livre')

      // Ignora erro se o leito já estiver em outro status
      if (erroLeito) console.warn('Aviso ao atualizar status do leito:', erroLeito.message)
    }

    return true
  },

  /**
   * Lista os últimos atendimentos triados pelo setor de triagem.
   */
  async listarTriadosRecentes() {
    const { data, error } = await supabase
      .from('atendimentos')
      .select(`
        id,
        status,
        prioridade,
        prioridade_sugerida,
        classificacao_origem,
        tempo_limite_min,
        prazo_em,
        triagem_em,
        paciente:pacientes(nome, cpf, data_nascimento, sexo),
        medico:profissionais(nome, especialidade),
        leito:leitos(codigo, tipo)
      `)
      .not('triagem_em', 'is', null)
      .order('triagem_em', { ascending: false })
      .limit(20)

    if (error) throw error
    return data ?? []
  },
}
