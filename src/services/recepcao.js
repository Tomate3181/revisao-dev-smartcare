import { supabase } from '@/lib/supabase'
import { validarCpf } from '@/lib/esquemas'

/**
 * RF04 — Recepção de pacientes.
 * Gerencia a fila de espera para triagem, cadastro de novas fichas (paciente + atendimento + sinais vitais)
 * e importação em lote via arquivo CSV.
 */
export const recepcaoService = {
  /**
   * Lista todos os pacientes que estão aguardando triagem (ordenados por horário de chegada).
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
          numero_carteirinha,
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
          registrado_em
        )
      `)
      .eq('status', 'aguardando_triagem')
      .order('chegada_em', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  /**
   * Cadastra nova ficha de paciente na recepção.
   * Cria ou atualiza o paciente pelo CPF, abre o atendimento em 'aguardando_triagem'
   * e, se informados, registra os sinais vitais iniciais do acolhimento.
   */
  async cadastrarFicha({ dadosPaciente, dadosAtendimento, sinaisVitais, recepcionistaId }) {
    const cpfLimpo = dadosPaciente.cpf.replace(/\D/g, '')

    // 1. Busca se o paciente já possui cadastro prévio pelo CPF
    const { data: pacienteExistente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    let pacienteId = pacienteExistente?.id

    if (pacienteId) {
      // Atualiza os dados de contato e convênio do paciente já existente
      const { error: erroUpdate } = await supabase
        .from('pacientes')
        .update({
          nome: dadosPaciente.nome.trim(),
          data_nascimento: dadosPaciente.data_nascimento,
          sexo: dadosPaciente.sexo,
          telefone: dadosPaciente.telefone || null,
          convenio: dadosPaciente.convenio || 'SUS',
          numero_carteirinha: dadosPaciente.numero_carteirinha || null,
          alergias: dadosPaciente.alergias ?? [],
          comorbidades: dadosPaciente.comorbidades ?? [],
        })
        .eq('id', pacienteId)

      if (erroUpdate) throw erroUpdate
    } else {
      // Insere novo paciente
      const { data: novoPaciente, error: erroInsert } = await supabase
        .from('pacientes')
        .insert({
          nome: dadosPaciente.nome.trim(),
          cpf: cpfLimpo,
          data_nascimento: dadosPaciente.data_nascimento,
          sexo: dadosPaciente.sexo,
          telefone: dadosPaciente.telefone || null,
          convenio: dadosPaciente.convenio || 'SUS',
          numero_carteirinha: dadosPaciente.numero_carteirinha || null,
          alergias: dadosPaciente.alergias ?? [],
          comorbidades: dadosPaciente.comorbidades ?? [],
          created_by: recepcionistaId || null,
        })
        .select('id')
        .single()

      if (erroInsert) throw erroInsert
      pacienteId = novoPaciente.id
    }

    // 2. Abre o atendimento hospitalar
    const { data: novoAtendimento, error: erroAtend } = await supabase
      .from('atendimentos')
      .insert({
        paciente_id: pacienteId,
        status: 'aguardando_triagem',
        queixa_principal: dadosAtendimento.queixa_principal.trim(),
        sintomas: dadosAtendimento.sintomas ?? [],
        origem: dadosAtendimento.origem ?? 'manual',
        recepcionista_id: recepcionistaId || null,
        chegada_em: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (erroAtend) throw erroAtend

    // 3. Se foram informados sinais vitais na recepção, insere o registro inicial
    const temSinais = sinaisVitais && Object.values(sinaisVitais).some((v) => v !== null && v !== undefined && v !== '')
    if (temSinais) {
      const { error: erroSinais } = await supabase
        .from('sinais_vitais')
        .insert({
          atendimento_id: novoAtendimento.id,
          momento: 'recepcao',
          pa_sistolica: sinaisVitais.pa_sistolica ? Number(sinaisVitais.pa_sistolica) : null,
          pa_diastolica: sinaisVitais.pa_diastolica ? Number(sinaisVitais.pa_diastolica) : null,
          temperatura: sinaisVitais.temperatura ? Number(sinaisVitais.temperatura) : null,
          frequencia_cardiaca: sinaisVitais.frequencia_cardiaca ? Number(sinaisVitais.frequencia_cardiaca) : null,
          frequencia_respiratoria: sinaisVitais.frequencia_respiratoria ? Number(sinaisVitais.frequencia_respiratoria) : null,
          saturacao: sinaisVitais.saturacao ? Number(sinaisVitais.saturacao) : null,
          dor: sinaisVitais.dor !== null && sinaisVitais.dor !== undefined && sinaisVitais.dor !== '' ? Number(sinaisVitais.dor) : null,
          glicemia: sinaisVitais.glicemia ? Number(sinaisVitais.glicemia) : null,
          registrado_por: recepcionistaId || null,
        })

      if (erroSinais) throw erroSinais
    }

    return novoAtendimento
  },

  /**
   * Importa linhas válidas do CSV para o banco.
   * Cria/atualiza o paciente, registra o atendimento com origem 'csv' e seus sinais vitais.
   */
  async importarLote(linhasValidas, recepcionistaId) {
    let sucessos = 0
    const erros = []

    for (const linha of linhasValidas) {
      try {
        await this.cadastrarFicha({
          dadosPaciente: {
            nome: linha.nome,
            cpf: linha.cpf,
            data_nascimento: linha.data_nascimento,
            sexo: linha.sexo,
            telefone: linha.telefone,
            convenio: linha.convenio || 'SUS',
            numero_carteirinha: linha.numero_carteirinha,
            alergias: linha.alergias,
            comorbidades: linha.comorbidades,
          },
          dadosAtendimento: {
            queixa_principal: linha.queixa_principal,
            origem: 'csv',
          },
          sinaisVitais: {
            pa_sistolica: linha.pa_sistolica,
            pa_diastolica: linha.pa_diastolica,
            temperatura: linha.temperatura,
            frequencia_cardiaca: linha.frequencia_cardiaca,
            frequencia_respiratoria: linha.frequencia_respiratoria,
            saturacao: linha.saturacao,
            dor: linha.dor,
            glicemia: linha.glicemia,
          },
          recepcionistaId,
        })
        sucessos++
      } catch (err) {
        erros.push({ linha: linha.numeroLinha, nome: linha.nome, erro: err.message })
      }
    }

    return { total: linhasValidas.length, sucessos, erros }
  },
}

/**
 * Validador de linha individual de CSV de pacientes.
 * Retorna { valida: boolean, erros: string[], formatado: object }
 */
export function validarLinhaCsv(linhaCrua, numeroLinha) {
  const erros = []

  const nome = (linhaCrua.nome ?? '').trim()
  if (!nome || nome.length < 3) {
    erros.push('Nome é obrigatório (mínimo 3 caracteres)')
  }

  const cpfLimpo = (linhaCrua.cpf ?? '').replace(/\D/g, '')
  if (!cpfLimpo || cpfLimpo.length !== 11) {
    erros.push('CPF deve conter exatamente 11 dígitos')
  } else if (!validarCpf(cpfLimpo)) {
    erros.push('CPF com dígitos verificadores inválidos')
  }

  const dataNasc = (linhaCrua.data_nascimento ?? '').trim()
  if (!dataNasc || !/^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
    erros.push('Data de nascimento inválida (use o formato AAAA-MM-DD)')
  } else {
    const hoje = new Date().toISOString().slice(0, 10)
    if (dataNasc > hoje) {
      erros.push(`Data de nascimento não pode ser no futuro (${dataNasc})`)
    }
  }

  const sexo = (linhaCrua.sexo ?? 'O').trim().toUpperCase()
  if (!['F', 'M', 'O'].includes(sexo)) {
    erros.push('Sexo deve ser F, M ou O')
  }

  const queixa = (linhaCrua.queixa_principal ?? '').trim()
  if (!queixa || queixa.length < 3) {
    erros.push('Queixa principal é obrigatória (mínimo 3 caracteres)')
  }

  // Validação de sinais vitais caso preenchidos
  const numOuNull = (val) => (val !== undefined && val !== null && String(val).trim() !== '' ? Number(val) : null)

  const paSis = numOuNull(linhaCrua.pa_sistolica)
  if (paSis !== null && (isNaN(paSis) || paSis < 40 || paSis > 300)) {
    erros.push(`PA Sistólica fora da faixa válida 40–300 (${paSis})`)
  }

  const paDia = numOuNull(linhaCrua.pa_diastolica)
  if (paDia !== null && (isNaN(paDia) || paDia < 20 || paDia > 200)) {
    erros.push(`PA Diastólica fora da faixa válida 20–200 (${paDia})`)
  }

  const temp = numOuNull(linhaCrua.temperatura)
  if (temp !== null && (isNaN(temp) || temp < 30 || temp > 45)) {
    erros.push(`Temperatura fora da faixa válida 30°C–45°C (${temp})`)
  }

  const fc = numOuNull(linhaCrua.frequencia_cardiaca)
  if (fc !== null && (isNaN(fc) || fc < 20 || fc > 250)) {
    erros.push(`Freq. Cardíaca fora da faixa válida 20–250 bpm (${fc})`)
  }

  const fr = numOuNull(linhaCrua.frequencia_respiratoria)
  if (fr !== null && (isNaN(fr) || fr < 4 || fr > 70)) {
    erros.push(`Freq. Respiratória fora da faixa válida 4–70 rpm (${fr})`)
  }

  const sat = numOuNull(linhaCrua.saturacao)
  if (sat !== null && (isNaN(sat) || sat < 40 || sat > 100)) {
    erros.push(`Saturação de O₂ fora da faixa válida 40%–100% (${sat})`)
  }

  const dor = numOuNull(linhaCrua.dor)
  if (dor !== null && (isNaN(dor) || dor < 0 || dor > 10)) {
    erros.push(`Escala de dor fora da faixa válida 0–10 (${dor})`)
  }

  const parseLista = (campo) => {
    if (!campo) return []
    if (Array.isArray(campo)) return campo
    return String(campo)
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return {
    numeroLinha,
    valida: erros.length === 0,
    erros,
    dados: {
      numeroLinha,
      nome,
      cpf: cpfLimpo,
      data_nascimento: dataNasc,
      sexo,
      telefone: (linhaCrua.telefone ?? '').trim() || null,
      convenio: (linhaCrua.convenio ?? 'SUS').trim(),
      numero_carteirinha: (linhaCrua.numero_carteirinha ?? '').trim() || null,
      queixa_principal: queixa,
      alergias: parseLista(linhaCrua.alergias),
      comorbidades: parseLista(linhaCrua.comorbidades),
      pa_sistolica: paSis,
      pa_diastolica: paDia,
      temperatura: temp,
      frequencia_cardiaca: fc,
      frequencia_respiratoria: fr,
      saturacao: sat,
      dor,
      glicemia: numOuNull(linhaCrua.glicemia),
    },
  }
}
