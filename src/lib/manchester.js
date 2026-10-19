/**
 * Protocolo de Triagem de Manchester — Motor Local de Decisão (RF05, RNF06).
 *
 * Funciona 100% OFFLINE, sem dependência de internet ou APIs de IA.
 * Avalia os discriminadores clínicos estruturados a partir dos sinais vitais,
 * idade, sintomas e queixa do paciente, determinando:
 *   - Cor e prioridade clínica
 *   - Tempo limite máximo para primeiro atendimento médico
 *   - Justificativa técnica rastreável dos discriminadores acionados
 *   - Especialidade médica recomendada para o encaminhamento
 */

export const TEMPOS_MANCHESTER = {
  vermelho: 0,
  laranja: 10,
  amarelo: 60,
  verde: 120,
  azul: 240,
}

export const DADOS_MANCHESTER = {
  vermelho: {
    rotulo: 'Vermelho',
    nivel: 'Emergência',
    tempoLimite: 0,
    tempoTexto: 'Imediato (0 min)',
    estilo: 'bg-[var(--manchester-vermelho)] text-[var(--manchester-vermelho-texto)] border-[var(--manchester-vermelho)]',
  },
  laranja: {
    rotulo: 'Laranja',
    nivel: 'Muito urgente',
    tempoLimite: 10,
    tempoTexto: '10 min',
    estilo: 'bg-[var(--manchester-laranja)] text-[var(--manchester-laranja-texto)] border-[var(--manchester-laranja)]',
  },
  amarelo: {
    rotulo: 'Amarelo',
    nivel: 'Urgente',
    tempoLimite: 60,
    tempoTexto: '60 min',
    estilo: 'bg-[var(--manchester-amarelo)] text-[var(--manchester-amarelo-texto)] border-[var(--manchester-amarelo)]',
  },
  verde: {
    rotulo: 'Verde',
    nivel: 'Pouco urgente',
    tempoLimite: 120,
    tempoTexto: '120 min',
    estilo: 'bg-[var(--manchester-verde)] text-[var(--manchester-verde-texto)] border-[var(--manchester-verde)]',
  },
  azul: {
    rotulo: 'Azul',
    nivel: 'Não urgente',
    tempoLimite: 240,
    tempoTexto: '240 min',
    estilo: 'bg-[var(--manchester-azul)] text-[var(--manchester-azul-texto)] border-[var(--manchester-azul)]',
  },
}


/**
 * Classifica um atendimento com base nos sinais vitais e queixas do paciente.
 *
 * @param {Object} params
 * @param {string} params.queixa - Queixa principal relatada
 * @param {string[]} [params.sintomas] - Array de sintomas e queixas associadas
 * @param {Object} [params.sinaisVitais] - Sinais vitais aferidos (PA, FC, FR, Temp, SpO2, Dor, Glasgow)
 * @param {number} [params.idade] - Idade do paciente em anos
 * @returns {Object} { cor, prioridade, tempoLimiteMin, justificativa, discriminadores, especialidade }
 */
export function classificarManchester({
  queixa = '',
  sintomas = [],
  sinaisVitais = {},
  idade = null,
}) {
  const qTexto = (queixa || '').toLowerCase()
  const sint = (sintomas || []).map((s) => s.toLowerCase())
  const sv = sinaisVitais || {}

  const paSis = sv.pa_sistolica !== null && sv.pa_sistolica !== undefined ? Number(sv.pa_sistolica) : null
  const paDia = sv.pa_diastolica !== null && sv.pa_diastolica !== undefined ? Number(sv.pa_diastolica) : null
  const fc = sv.frequencia_cardiaca !== null && sv.frequencia_cardiaca !== undefined ? Number(sv.frequencia_cardiaca) : null
  const fr = sv.frequencia_respiratoria !== null && sv.frequencia_respiratoria !== undefined ? Number(sv.frequencia_respiratoria) : null
  const temp = sv.temperatura !== null && sv.temperatura !== undefined ? Number(sv.temperatura) : null
  const sat = sv.saturacao !== null && sv.saturacao !== undefined ? Number(sv.saturacao) : null
  const dor = sv.dor !== null && sv.dor !== undefined ? Number(sv.dor) : null
  const glasgow = sv.glasgow !== null && sv.glasgow !== undefined ? Number(sv.glasgow) : null

  const ehCrianca = idade !== null && idade < 12

  // ---------- 1. DISCRIMINADORES VERMELHOS (EMERGÊNCIA · 0 MIN) ----------
  const discVermelho = []

  if (sat !== null && sat < 89) {
    discVermelho.push(`Saturação crítica de oxigênio (${sat}% < 89%): hipoxemia severa com risco de parada`)
  }
  if (glasgow !== null && glasgow <= 8) {
    discVermelho.push(`Escala de coma de Glasgow severamente rebaixada (${glasgow}/15): perda da capacidade de proteção de vias aéreas`)
  }
  if (qTexto.includes('inconsciente') || qTexto.includes('parada') || qTexto.includes('rebaixamento') || sint.includes('alteracao_consciencia')) {
    discVermelho.push('Alteração grave do nível de consciência ou ausência de resposta verbal')
  }
  if (qTexto.includes('lábios arroxeados') || qTexto.includes('cianose') || sint.includes('cianose') || (qTexto.includes('falta de ar intensa') && sat && sat < 90)) {
    discVermelho.push('Insuficiência respiratória aguda e cianose central evidente')
  }
  if (paSis !== null && paSis < 85 && (fc && fc > 120 || qTexto.includes('suor frio') || sint.includes('sudorese'))) {
    discVermelho.push(`Choque hemodinâmico: hipotensão grave (PAS ${paSis} mmHg) associada a sinais de má perfusão`)
  }
  if ((qTexto.includes('dor no peito') || sint.includes('dor_toracica')) && paSis && paSis < 90) {
    discVermelho.push('Dor torácica associada a colapso hemodinâmico ou choque cardiogênico')
  }

  if (discVermelho.length > 0) {
    return {
      cor: 'vermelho',
      prioridade: 'vermelho',
      tempoLimiteMin: TEMPOS_MANCHESTER.vermelho,
      justificativa: discVermelho.join('; '),
      discriminadores: discVermelho,
      especialidade: ehCrianca ? 'Pediatria' : (qTexto.includes('peito') || qTexto.includes('cardio') ? 'Cardiologia' : 'Medicina Intensiva'),
    }
  }

  // ---------- 2. DISCRIMINADORES LARANJAS (MUITO URGENTE · 10 MIN) ----------
  const discLaranja = []

  if (sat !== null && sat >= 89 && sat <= 92) {
    discLaranja.push(`Saturação comprometida (${sat}%): hipoxemia moderada com necessidade de oxigenoterapia imediata`)
  }
  if (dor !== null && dor >= 8) {
    discLaranja.push(`Dor severa/intensa relatada (escala ${dor}/10)`)
  }
  if (glasgow !== null && glasgow >= 9 && glasgow <= 13) {
    discLaranja.push(`Glasgow moderado (${glasgow}/15): sonolência excessiva ou confusão mental aguda`)
  }
  if (qTexto.includes('dor no peito') || sint.includes('dor_toracica')) {
    discLaranja.push('Dor torácica em aperto sugestiva de Síndrome Coronariana Aguda (SCA)')
  }
  if (qTexto.includes('falta de ar') || qTexto.includes('chiado no peito') || sint.includes('dispneia') || sint.includes('sibilancia')) {
    discLaranja.push('Desconforto respiratório agudo / crise de broncoespasmo em andamento')
  }
  if (ehCrianca && temp !== null && temp >= 39.5) {
    discLaranja.push(`Febre muito alta em criança (${temp}°C): risco iminente de crise febril ou infecção bacteriana grave`)
  }
  if (fc !== null && (fc > 130 || (!ehCrianca && fc < 45))) {
    discLaranja.push(`Frequência cardíaca crítica (${fc} bpm): taquiarritmia ou bradicardia sintomática`)
  }
  if (fr !== null && (fr > 30 || fr < 10)) {
    discLaranja.push(`Frequência respiratória alterada (${fr} rpm): taquipneia severa ou bradipneia`)
  }
  if ((paSis !== null && paSis >= 200) || (paDia !== null && paDia >= 120)) {
    discLaranja.push(`Emergência hipertensiva em potencial (PA ${paSis ?? '—'}/${paDia ?? '—'} mmHg)`)
  }
  if (qTexto.includes('fratura exposta') || qTexto.includes('hemorragia') || sint.includes('sangramento')) {
    discLaranja.push('Trauma com sangramento ativo importante ou suspeita de lesão estrutural exposta')
  }

  if (discLaranja.length > 0) {
    return {
      cor: 'laranja',
      prioridade: 'laranja',
      tempoLimiteMin: TEMPOS_MANCHESTER.laranja,
      justificativa: discLaranja.join('; '),
      discriminadores: discLaranja,
      especialidade: ehCrianca ? 'Pediatria' : (qTexto.includes('peito') || qTexto.includes('cardio') ? 'Cardiologia' : (qTexto.includes('fratura') || qTexto.includes('queda') ? 'Ortopedia' : 'Clínica Geral')),
    }
  }

  // ---------- 3. DISCRIMINADORES AMARELOS (URGENTE · 60 MIN) ----------
  const discAmarelo = []

  if (sat !== null && sat >= 93 && sat <= 95) {
    discAmarelo.push(`Saturação limítrofe (${sat}%): monitoramento ventilatório necessário`)
  }
  if (dor !== null && dor >= 5 && dor <= 7) {
    discAmarelo.push(`Dor moderada (escala ${dor}/10) requerendo investigação clínica e analgesia`)
  }
  if (temp !== null && temp >= 38.5 && temp < 39.5) {
    discAmarelo.push(`Febre moderada a alta aferida (${temp}°C)`)
  }
  if (fc !== null && fc >= 100 && fc <= 130) {
    discAmarelo.push(`Taquicardia moderada (${fc} bpm)`)
  }
  if (fr !== null && fr >= 22 && fr <= 30) {
    discAmarelo.push(`Taquipneia leve a moderada (${fr} rpm)`)
  }
  if ((paSis !== null && paSis >= 160 && paSis < 200) || (paDia !== null && paDia >= 100 && paDia < 120)) {
    discAmarelo.push(`Hipertensão estágio 2 ou sintomática (PA ${paSis ?? '—'}/${paDia ?? '—'} mmHg)`)
  }
  if (qTexto.includes('vômitos persistentes') || qTexto.includes('vomito') || sint.includes('desidratacao')) {
    discAmarelo.push('Vômitos frequentes ou risco de desidratação hidroelétrica')
  }
  if (qTexto.includes('entorse') || qTexto.includes('deformidade') || (qTexto.includes('trauma') && dor && dor >= 5)) {
    discAmarelo.push('Trauma osteoarticular com dor moderada e deformidade ou limitação funcional')
  }
  if (qTexto.includes('dor abdominal') || sint.includes('dor_abdominal')) {
    discAmarelo.push('Dor abdominal aguda com necessidade de palpação e investigação')
  }

  if (discAmarelo.length > 0) {
    return {
      cor: 'amarelo',
      prioridade: 'amarelo',
      tempoLimiteMin: TEMPOS_MANCHESTER.amarelo,
      justificativa: discAmarelo.join('; '),
      discriminadores: discAmarelo,
      especialidade: ehCrianca ? 'Pediatria' : (qTexto.includes('entorse') || qTexto.includes('trauma') ? 'Ortopedia' : (paSis && paSis >= 180 ? 'Cardiologia' : 'Clínica Geral')),
    }
  }

  // ---------- 4. DISCRIMINADORES VERDES (POUCO URGENTE · 120 MIN) ----------
  const discVerde = []

  if (temp !== null && temp >= 37.5 && temp < 38.5) {
    discVerde.push(`Febre baixa / estado subfebril (${temp}°C)`)
  }
  if (dor !== null && dor >= 3 && dor <= 4) {
    discVerde.push(`Dor leve a tolerável (escala ${dor}/10)`)
  }
  if (
    qTexto.includes('garganta') ||
    qTexto.includes('tosse') ||
    qTexto.includes('coriza') ||
    qTexto.includes('resfriado') ||
    sint.includes('tosse') ||
    sint.includes('coriza') ||
    sint.includes('odinofagia')
  ) {
    discVerde.push('Infecção de vias aéreas superiores / quadro respiratório sem sinais de alerta')
  }
  if (qTexto.includes('lombar') || qTexto.includes('esforço') || sint.includes('dor_leve')) {
    discVerde.push('Lombalgia ou queixa osteomuscular mecânica recente sem trauma agudo maior')
  }
  if (qTexto.includes('diarreia') && !qTexto.includes('desidratação')) {
    discVerde.push('Gastroenterite com diarreia sem sinais aparentes de desidratação')
  }

  // ---------- 5. DISCRIMINADORES AZUIS (NÃO URGENTE · 240 MIN) ----------
  const ehAzulExplicito =
    qTexto.includes('renovação de receita') ||
    qTexto.includes('renovacao de receita') ||
    qTexto.includes('receita') ||
    qTexto.includes('exames') ||
    qTexto.includes('resultado de exame') ||
    qTexto.includes('curativo') ||
    qTexto.includes('pontos') ||
    (dor !== null && dor <= 2 && (!temp || temp < 37.5) && (!sat || sat >= 96) && qTexto.includes('semanas'))

  if (ehAzulExplicito && discVerde.length === 0) {
    return {
      cor: 'azul',
      prioridade: 'azul',
      tempoLimiteMin: TEMPOS_MANCHESTER.azul,
      justificativa: 'Procedimento ambulatorial ou queixa crônica sem agudização (não urgente)',
      discriminadores: ['Condição clínica estável e parâmetros vitais dentro da normalidade'],
      especialidade: 'Clínica Geral',
    }
  }

  // Caso padrão: Verde (Pouco urgente)
  const justificativasVerde = discVerde.length > 0
    ? discVerde.join('; ')
    : 'Quadro estável sem discriminadores de gravidade imediata ou risco à vida'

  return {
    cor: 'verde',
    prioridade: 'verde',
    tempoLimiteMin: TEMPOS_MANCHESTER.verde,
    justificativa: justificativasVerde,
    discriminadores: discVerde.length > 0 ? discVerde : ['Sinais vitais estáveis e sintomas controlados'],
    especialidade: ehCrianca ? 'Pediatria' : (qTexto.includes('lombar') || qTexto.includes('joelho') ? 'Ortopedia' : 'Clínica Geral'),
  }
}
