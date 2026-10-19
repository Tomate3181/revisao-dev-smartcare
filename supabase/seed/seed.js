// =====================================================================================
// Smart Care · seed de dados de demonstração
//
//   npm run seed
//
// Usa a service_role (ignora a RLS), por isso roda SÓ localmente, lendo .env.seed.
// O script APAGA os dados atuais e recria tudo:
//   - 4 usuários de teste (um por perfil)
//   - 5 alas e 36 leitos/consultórios posicionados na planta
//   - 15 profissionais (alguns com registro vencendo/vencido)
//   - ~90 dias de atendimentos concluídos, com sazonalidade semanal, horários de pico e
//     um surto respiratório crescente nas últimas semanas
//   - uma fila "viva" de hoje em todas as etapas, com casos de prazo estourado
// A geração é determinística (semente fixa): rodar de novo gera os mesmos dados.
// =====================================================================================
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  ALAS, ALERGIAS, COMORBIDADES, CONDUTAS, CONVENIOS, EQUIPAMENTOS, NOMES_F, NOMES_M,
  PESO_PRIORIDADE, PROFISSIONAIS, QUADROS, SOBRENOMES, TEMPO_LIMITE, USUARIOS,
} from './dados.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENHA = process.env.SEED_SENHA || 'SmartCare@2026'
const DIAS_HISTORICO = 90

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltam variáveis. Preencha SUPABASE_SERVICE_ROLE_KEY no .env.seed (a URL pode vir do .env).')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

// ---------- Aleatoriedade reproduzível ----------
function mulberry32(semente) {
  return () => {
    semente |= 0
    semente = (semente + 0x6d2b79f5) | 0
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(2026)
const inteiro = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const real = (min, max, casas = 1) => Number((rand() * (max - min) + min).toFixed(casas))
const sortear = (lista) => lista[Math.floor(rand() * lista.length)]
const chance = (p) => rand() < p
const faixa = ([min, max], casas = 0) => (casas ? real(min, max, casas) : inteiro(min, max))
function sortearPeso(pesos) {
  // pesos: { chave: peso } → chave sorteada proporcionalmente ao peso
  const total = Object.values(pesos).reduce((s, p) => s + p, 0)
  let r = rand() * total
  for (const [chave, peso] of Object.entries(pesos)) if ((r -= peso) < 0) return chave
  return Object.keys(pesos).at(-1)
}
const amostra = (lista, max) => [...lista].sort(() => rand() - 0.5).slice(0, inteiro(0, max))

// ---------- Datas ----------
const AGORA = new Date()
const MIN = 60_000
const minutosAtras = (m) => new Date(AGORA.getTime() - m * MIN)
const somaMin = (data, m) => new Date(data.getTime() + m * MIN)
const iso = (d) => d?.toISOString() ?? null
const diaISO = (d) => d.toISOString().slice(0, 10)
const emDias = (n) => diaISO(new Date(AGORA.getTime() + n * 86_400_000))

// ---------- Utilidades de banco ----------
async function inserir(tabela, linhas, lote = 500) {
  for (let i = 0; i < linhas.length; i += lote) {
    const { error } = await db.from(tabela).insert(linhas.slice(i, i + lote))
    if (error) throw new Error(`${tabela}: ${error.message}`)
  }
}

async function contar(tabela) {
  const { count, error } = await db.from(tabela).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${tabela}: ${error.message}`)
  return count
}

function etapa(msg) {
  process.stdout.write(`• ${msg}... `)
  const t = Date.now()
  return () => console.log(`ok (${((Date.now() - t) / 1000).toFixed(1)} s)`)
}

// =====================================================================================
// 1. LIMPEZA
// =====================================================================================
async function limpar() {
  const fim = etapa('Limpando dados anteriores')
  // ordem respeita as chaves estrangeiras
  const porUuid = ['alertas', 'anexos', 'desfechos', 'sinais_vitais', 'atendimentos', 'pacientes']
  await apagarTudo('notificacoes_log', 'id', 'bigint')
  for (const t of porUuid) await apagarTudo(t)

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const emails = new Set(USUARIOS.map((u) => u.email))
  for (const u of data.users.filter((u) => emails.has(u.email))) {
    const { error: e } = await db.auth.admin.deleteUser(u.id)
    if (e) throw e
  }
  for (const t of ['profissionais', 'leitos', 'alas']) await apagarTudo(t)
  await apagarTudo('audit_log', 'id', 'bigint') // a carga inicial não precisa de trilha antiga
  fim()
}

async function apagarTudo(tabela, coluna = 'id', tipo = 'uuid') {
  const q = db.from(tabela).delete()
  const { error } = tipo === 'bigint' ? await q.gte(coluna, 0) : await q.not(coluna, 'is', null)
  if (error) throw new Error(`limpar ${tabela}: ${error.message}`)
}

// =====================================================================================
// 2. USUÁRIOS
// =====================================================================================
async function criarUsuarios() {
  const fim = etapa('Criando 4 usuários de teste')
  const ids = {}
  for (const u of USUARIOS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: SENHA,
      email_confirm: true,
      user_metadata: { nome: u.nome },
      // perfil e registro no app_metadata: o trigger handle_new_user só confia neste campo
      app_metadata: { perfil: u.perfil, registro: u.registro ?? null },
    })
    if (error) throw new Error(`usuário ${u.email}: ${error.message}`)
    ids[u.perfil] = data.user.id
  }
  fim()
  return ids
}

// =====================================================================================
// 3. INFRAESTRUTURA
// =====================================================================================
// Situação dos leitos "agora" que não depende de paciente (o resto vem da fila viva).
const LEITOS_ESPECIAIS = {
  'OBS-07': { status: 'higienizacao', desdeMin: 95 }, // higienização longa → alerta RF11
  'CG-03': { status: 'higienizacao', desdeMin: 8 },
  'OBS-10': { status: 'manutencao', desdeMin: 600, manutencaoDias: 0 },
  'ISO-04': { status: 'manutencao', desdeMin: 1500, manutencaoDias: 1 },
  'UTI-03': { manutencaoDias: 3 }, // manutenção preventiva próxima → alerta RF11
  'OBS-02': { manutencaoDias: 5 },
}

function montarInfra() {
  const alas = []
  const leitos = []
  for (const a of ALAS) {
    const lista = a.leitos ?? Array.from({ length: a.quantidade }, (_, i) => ({
      codigo: `${a.prefixo}-${String(i + 1).padStart(2, '0')}`,
      tipo: a.tipo,
    }))
    const ala = {
      id: randomUUID(),
      nome: a.nome,
      descricao: a.descricao,
      andar: a.andar,
      planta_colunas: a.colunas,
      planta_linhas: Math.ceil(lista.length / a.colunas),
    }
    alas.push(ala)
    lista.forEach((l, i) => {
      const esp = LEITOS_ESPECIAIS[l.codigo] ?? {}
      leitos.push({
        id: randomUUID(),
        codigo: l.codigo,
        ala_id: ala.id,
        tipo: l.tipo,
        especialidade: l.especialidade ?? null,
        equipamentos: EQUIPAMENTOS[l.tipo],
        status: esp.status ?? 'livre',
        status_desde: iso(minutosAtras(esp.desdeMin ?? inteiro(30, 600))),
        proxima_manutencao: emDias(esp.manutencaoDias ?? inteiro(20, 200)),
        pos_x: i % a.colunas,
        pos_y: Math.floor(i / a.colunas),
      })
    })
  }
  return { alas, leitos }
}

function montarProfissionais(alas, leitos) {
  return PROFISSIONAIS.map((p) => ({
    id: randomUUID(),
    nome: p.nome,
    tipo_registro: p.tipo,
    registro: p.registro,
    registro_uf: 'SP',
    registro_validade: emDias(p.validadeDias ?? inteiro(120, 900)),
    especialidade: p.especialidade,
    email: `${p.nome.split(' ').slice(1).join('.').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@smartcare.test`,
    telefone: `(12) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}`,
    turno: p.turno,
    ala_id: alas.find((a) => a.nome === (p.ala ?? 'Pronto Atendimento')).id,
    consultorio_id: p.consultorio ? leitos.find((l) => l.codigo === p.consultorio).id : null,
    _usuario: p.usuario,
  }))
}

// =====================================================================================
// 4. PACIENTES
// =====================================================================================
function gerarCpf(usados) {
  for (;;) {
    const n = Array.from({ length: 9 }, () => inteiro(0, 9))
    const dv = (base) => {
      const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0)
      const r = (soma * 10) % 11
      return r === 10 ? 0 : r
    }
    n.push(dv(n))
    n.push(dv(n))
    const cpf = n.join('')
    if (!usados.has(cpf) && !/^(\d)\1+$/.test(cpf)) {
      usados.add(cpf)
      return cpf
    }
  }
}

function gerarPacientes(qtd, criadoPor) {
  const cpfs = new Set()
  const adultos = []
  const criancas = []
  for (let i = 0; i < qtd; i++) {
    const crianca = chance(0.18)
    const idade = crianca ? inteiro(0, 11) : Math.min(95, inteiro(12, 60) + (chance(0.35) ? inteiro(0, 35) : 0))
    const feminino = chance(0.53)
    const nascimento = new Date(AGORA.getFullYear() - idade - 1, inteiro(0, 11), inteiro(1, 28))
    const convenio = sortearPeso(Object.fromEntries(CONVENIOS.map((c) => [c.nome, c.peso])))
    const comorbidades = idade > 45 ? amostra(COMORBIDADES, idade > 65 ? 3 : 2) : chance(0.15) ? ['Asma'] : []
    const p = {
      id: randomUUID(),
      nome: `${sortear(feminino ? NOMES_F : NOMES_M)} ${sortear(SOBRENOMES)} ${sortear(SOBRENOMES)}`,
      cpf: gerarCpf(cpfs),
      data_nascimento: diaISO(nascimento),
      sexo: feminino ? 'F' : 'M',
      telefone: `(12) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}`,
      convenio,
      numero_carteirinha: convenio === 'SUS' ? null : String(inteiro(100000000, 999999999)),
      alergias: chance(0.3) ? amostra(ALERGIAS, 2).slice(0, Math.max(1, inteiro(1, 2))) : [],
      comorbidades,
      created_by: criadoPor,
    }
    ;(crianca ? criancas : adultos).push(p)
  }
  return { adultos, criancas, todos: [...adultos, ...criancas] }
}

// =====================================================================================
// 5. ATENDIMENTOS
// =====================================================================================
const ORDEM_CORES = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul']

// Volume por dia da semana (getDay: 0 = domingo). Segunda é o pico clássico de pronto atendimento.
const FATOR_DIA = [0.75, 1.3, 1.15, 1.05, 1.0, 1.05, 0.85]
// Distribuição das chegadas por hora: picos de manhã (9–11 h) e no fim da tarde (18–20 h).
const PESO_HORA = [1, 0.6, 0.4, 0.4, 0.4, 0.6, 1.2, 2.2, 3.2, 3.6, 3.4, 3, 2.6, 2.6, 2.8, 2.8, 2.6, 2.8, 3.2, 3.4, 3, 2.4, 1.8, 1.4]

function turnoCobre(turno, hora) {
  if (turno === 'plantao_12h' || turno === 'plantao_24h') return true
  if (turno === 'manha') return hora >= 7 && hora < 13
  if (turno === 'tarde') return hora >= 13 && hora < 19
  return hora >= 19 || hora < 7
}

function sortearQuadro(cor, fatorSurto) {
  // quadros respiratórios ganham peso durante o surto sazonal
  const lista = QUADROS[cor]
  const pesos = Object.fromEntries(lista.map((q, i) => [i, q.resp ? fatorSurto : 1]))
  return lista[Number(sortearPeso(pesos))]
}

function gerarSinais(quadro) {
  const s = quadro.sinais
  return {
    pa_sistolica: faixa(s.pas),
    pa_diastolica: faixa(s.pad),
    frequencia_cardiaca: faixa(s.fc),
    frequencia_respiratoria: faixa(s.fr),
    temperatura: faixa(s.temp, 1),
    saturacao: faixa(s.sat),
    glicemia: inteiro(80, 140),
    dor: faixa(s.dor),
    glasgow: faixa(s.glasgow),
  }
}

function criarContexto({ profissionais, leitos, pacientes, usuarios }) {
  const medicos = profissionais.filter((p) => p.tipo_registro === 'CRM')
  const leitosPor = (filtro) => leitos.filter(filtro)
  return {
    escolherMedico(especialidade, hora) {
      const da = medicos.filter((m) => m.especialidade === especialidade)
      const noTurno = da.filter((m) => turnoCobre(m.turno, hora))
      return sortear(noTurno.length ? noTurno : da)
    },
    escolherLeito(cor, quadro) {
      if (cor === 'vermelho' || quadro.especialidade === 'Medicina Intensiva') return sortear(leitosPor((l) => l.tipo === 'uti'))
      if (cor === 'laranja') return sortear(leitosPor((l) => l.codigo.startsWith(quadro.crianca ? 'OBP' : 'OBS')))
      return sortear(leitosPor((l) => l.especialidade === quadro.especialidade))
    },
    paciente: (quadro) => sortear(quadro.crianca ? pacientes.criancas : pacientes.adultos),
    leito: (codigo) => leitos.find((l) => l.codigo === codigo),
    medicoPorNome: (trecho) => medicos.find((m) => m.nome.includes(trecho)),
    usuarios,
  }
}

/**
 * Monta um atendimento completo (atendimento + sinais + desfecho) a partir dos instantes de
 * cada etapa. Etapas sem instante ficam nulas, o que define o status do paciente.
 */
function montarAtendimento(ctx, { cor, quadro, chegada, triagem, inicio, medicacao, alta, status, medico, leito, sinaisExtras = [] }) {
  const id = randomUUID()
  const paciente = ctx.paciente(quadro)
  const triado = Boolean(triagem)

  // Origem da classificação: na maioria das vezes o enfermeiro confirma a sugestão;
  // em ~8% ele altera a cor sugerida e registra o motivo (exigido pelo banco).
  let sugerida = cor
  let origem = chance(0.75) ? 'motor_local' : 'ia'
  let motivo = null
  if (triado && chance(0.08)) {
    const i = ORDEM_CORES.indexOf(cor)
    sugerida = ORDEM_CORES[Math.min(4, i + 1)]
    if (sugerida !== cor) {
      origem = 'manual'
      motivo = 'Avaliação clínica indicou gravidade maior que a sugerida'
    }
  }

  const atendimento = {
    id,
    paciente_id: paciente.id,
    status,
    queixa_principal: quadro.queixa,
    sintomas: quadro.sintomas,
    origem: chance(0.1) ? 'csv' : 'manual',
    prioridade_sugerida: triado ? sugerida : null,
    prioridade: triado ? cor : null,
    classificacao_origem: triado ? origem : null,
    justificativa_triagem: triado ? `Discriminadores: ${quadro.sintomas.join(', ') || 'sem sinais de alerta'}` : null,
    motivo_alteracao: motivo,
    tempo_limite_min: triado ? TEMPO_LIMITE[cor] : null,
    prazo_em: triado ? iso(somaMin(triagem, TEMPO_LIMITE[cor])) : null,
    medico_id: medico?.id ?? null,
    leito_id: leito?.id ?? null,
    recepcionista_id: ctx.usuarios.recepcionista,
    enfermeiro_id: triado ? ctx.usuarios.enfermeiro : null,
    chegada_em: iso(chegada),
    triagem_em: iso(triagem),
    inicio_atendimento_em: iso(inicio),
    medicacao_em: iso(medicacao),
    alta_em: iso(alta),
  }

  const sinais = [
    { id: randomUUID(), atendimento_id: id, momento: 'recepcao', registrado_em: iso(chegada), registrado_por: ctx.usuarios.recepcionista, ...gerarSinais(quadro) },
    ...sinaisExtras.map((s) => ({ id: randomUUID(), atendimento_id: id, registrado_por: ctx.usuarios.enfermeiro, ...s })),
  ]

  let desfecho = null
  if (alta) {
    const tipo = sortearPeso(
      cor === 'vermelho' ? { internacao: 60, transferencia: 25, obito: 5, alta: 10 }
        : cor === 'laranja' ? { alta: 70, internacao: 25, transferencia: 5 }
        : { alta: 97, internacao: 3 },
    )
    desfecho = {
      id: randomUUID(),
      atendimento_id: id,
      medico_id: medico.id,
      registrado_por: medico._usuario ? ctx.usuarios.medico : null,
      tipo,
      cid_codigo: quadro.cid[0],
      cid_descricao: quadro.cid[1],
      evolucao: `Paciente com ${quadro.queixa.toLowerCase()}. Avaliado, sinais vitais monitorados e conduta instituída.`,
      conduta: sortear(CONDUTAS[cor]),
      prescricao: cor === 'azul' ? null : 'Conforme prescrição eletrônica anexa.',
      registrado_em: iso(alta),
    }
  }
  return { atendimento, sinais, desfecho }
}

// ---------- Histórico: ~90 dias de atendimentos concluídos ----------
function gerarHistorico(ctx) {
  const lista = []
  for (let d = DIAS_HISTORICO; d >= 0; d--) {
    const dia = new Date(AGORA)
    dia.setHours(0, 0, 0, 0)
    dia.setDate(dia.getDate() - d)

    // Surto respiratório: cresce nos últimos 30 dias (mais volume e mais quadros respiratórios).
    const progressoSurto = Math.max(0, (30 - d) / 30)
    const fatorSurto = 1 + 2 * progressoSurto
    let volume = Math.round(36 * FATOR_DIA[dia.getDay()] * (1 + 0.25 * progressoSurto) * real(0.88, 1.12, 2))
    if (d === 0) volume = Math.round(volume * (AGORA.getHours() / 24)) // hoje: só o que já passou

    for (let i = 0; i < volume; i++) {
      const hora = Number(sortearPeso(Object.fromEntries(PESO_HORA.map((p, h) => [h, p]))))
      const chegada = new Date(dia)
      chegada.setHours(hora, inteiro(0, 59), inteiro(0, 59))
      if (d === 0 && chegada > minutosAtras(300)) continue // hoje: concluídos só até 5 h atrás

      const cor = sortearPeso(PESO_PRIORIDADE)
      const quadro = sortearQuadro(cor, fatorSurto)
      const pico = (hora >= 18 && hora <= 21) || (hora >= 9 && hora <= 11)

      // Triagem leva mais tempo nos picos.
      const triagem = somaMin(chegada, inteiro(2, pico ? 25 : 12))

      // Espera pelo médico como fração do tempo-limite. A chance de estourar o prazo cresce
      // nos picos, às segundas e durante o surto → gargalos que o RF12 deve encontrar.
      const limite = TEMPO_LIMITE[cor]
      const pEstouro = 0.1 + (pico ? 0.15 : 0) + (dia.getDay() === 1 ? 0.08 : 0) + 0.1 * progressoSurto
      let espera
      if (cor === 'vermelho') espera = chance(0.9) ? 0 : inteiro(1, 4)
      else espera = Math.round(limite * (chance(pEstouro) ? real(1.05, 1.8, 2) : real(0.15, 0.95, 2)))
      const inicio = somaMin(triagem, espera)

      const medicacao = ['vermelho', 'laranja', 'amarelo'].includes(cor) && chance(0.7) ? somaMin(inicio, inteiro(10, 30)) : null
      const permanencia = { vermelho: [120, 600], laranja: [90, 360], amarelo: [45, 180], verde: [15, 60], azul: [10, 30] }[cor]
      const alta = somaMin(inicio, inteiro(...permanencia))
      if (alta > AGORA) continue

      lista.push(montarAtendimento(ctx, {
        cor, quadro, chegada, triagem, inicio, medicacao, alta,
        status: 'alta',
        medico: ctx.escolherMedico(quadro.especialidade, hora),
        leito: ctx.escolherLeito(cor, quadro),
      }))
    }
  }
  return lista
}

// ---------- Fila viva de hoje ----------
// Pacientes em todas as etapas, com casos pensados para as demonstrações:
// prazo estourado, prazo quase vencendo, sinais piorando (RF09) e UTI acima de 90% (RF11).
function gerarFilaViva(ctx) {
  const lista = []
  const q = (cor, i) => QUADROS[cor][i]
  const h = AGORA.getHours()

  // Aguardando triagem (sem cor ainda)
  for (const [cor, i, min] of [['vermelho', 0, 4], ['verde', 1, 12], ['amarelo', 0, 22], ['azul', 0, 35]]) {
    lista.push(montarAtendimento(ctx, { cor, quadro: q(cor, i), chegada: minutosAtras(min), status: 'aguardando_triagem' }))
  }

  // Aguardando médico: [cor, quadro, chegada (min atrás), triagem (min atrás)]
  const aguardando = [
    ['laranja', 0, 28, 22], // prazo de 10 min estourado há 12 min
    ['laranja', 1, 18, 13], // criança com febre alta: prazo estourado há 3 min e sinais piorando
    ['amarelo', 2, 62, 55], // vence em 5 min
    ['amarelo', 1, 30, 24],
    ['verde', 2, 80, 70],
    ['verde', 0, 40, 33],
    ['azul', 1, 130, 120],
  ]
  for (const [cor, i, cheg, tri] of aguardando) {
    const quadro = q(cor, i)
    const medico = ctx.escolherMedico(quadro.especialidade, h)
    const piorando = cor === 'laranja' && i === 1
    lista.push(montarAtendimento(ctx, {
      cor, quadro, status: 'aguardando_medico',
      chegada: minutosAtras(cheg), triagem: minutosAtras(tri),
      // aguarda na fila do consultório da especialidade
      medico, leito: ctx.escolherLeito('verde', quadro),
      sinaisExtras: piorando
        ? [{ momento: 'reavaliacao', registrado_em: iso(minutosAtras(2)), temperatura: 40.4, frequencia_cardiaca: 158, saturacao: 91, frequencia_respiratoria: 34, dor: 6, glasgow: 14 }]
        : [],
    }))
  }

  // Em atendimento nos consultórios
  const emAtendimento = [
    ['verde', 4, 'CG-01', 'Rafael', 50, 44, 10],
    ['amarelo', 1, 'CAR-01', 'Patrícia', 70, 62, 20],
    ['verde', 3, 'PED-01', 'Fernanda', 45, 40, 8],
  ]
  for (const [cor, i, codigo, medico, cheg, tri, ini] of emAtendimento) {
    lista.push(montarAtendimento(ctx, {
      cor, quadro: q(cor, i), status: 'em_atendimento',
      chegada: minutosAtras(cheg), triagem: minutosAtras(tri), inicio: minutosAtras(ini),
      medico: ctx.medicoPorNome(medico), leito: ctx.leito(codigo),
    }))
  }

  // Em medicação/observação: ocupam leitos de observação, UTI (11 de 12 → 91,7%) e isolamento
  const internados = [
    ...['OBS-01', 'OBS-03', 'OBS-04', 'OBS-05', 'OBS-06', 'OBS-08'].map((c, k) => [c, k % 2 ? 'amarelo' : 'laranja', k % 2 ? 0 : 2, inteiro(120, 480), 'Clínica Geral']),
    ...Array.from({ length: 11 }, (_, k) => [`UTI-${String(k + 1).padStart(2, '0')}`, k % 3 ? 'vermelho' : 'laranja', k % 3 ? k % 3 : 0, inteiro(1440, 7200), 'Medicina Intensiva']),
    ['ISO-01', 'amarelo', 2, 1800, 'Clínica Geral'],
    ['ISO-02', 'amarelo', 2, 2600, 'Clínica Geral'],
    ['OBP-01', 'laranja', 1, 240, 'Pediatria'],
    ['OBP-02', 'laranja', 1, 330, 'Pediatria'],
  ]
  for (const [codigo, cor, i, cheg, esp] of internados) {
    const quadro = q(cor, Math.min(i, QUADROS[cor].length - 1))
    const chegada = minutosAtras(cheg)
    const triagem = somaMin(chegada, inteiro(2, 8))
    const inicio = somaMin(triagem, cor === 'vermelho' ? 0 : inteiro(3, TEMPO_LIMITE[cor]))
    lista.push(montarAtendimento(ctx, {
      cor, quadro, status: 'em_medicacao',
      chegada, triagem, inicio, medicacao: somaMin(inicio, inteiro(10, 30)),
      medico: ctx.escolherMedico(esp, h), leito: ctx.leito(codigo),
    }))
  }
  return lista
}

// =====================================================================================
// EXECUÇÃO
// =====================================================================================
async function main() {
  console.log(`Seed Smart Care → ${SUPABASE_URL}\n`)
  await limpar()
  const usuarios = await criarUsuarios()

  let fim = etapa('Alas, leitos e profissionais')
  const { alas, leitos } = montarInfra()
  const profissionais = montarProfissionais(alas, leitos)
  await inserir('alas', alas)
  // os leitos ocupados pela fila viva são marcados depois que a fila é gerada
  const pacientes = gerarPacientes(1600, usuarios.recepcionista)
  const ctx = criarContexto({ profissionais, leitos, pacientes, usuarios })
  const historico = gerarHistorico(ctx)
  const fila = gerarFilaViva(ctx)
  const ocupados = new Set(fila.filter((f) => ['em_atendimento', 'em_medicacao'].includes(f.atendimento.status)).map((f) => f.atendimento.leito_id))
  for (const l of leitos) {
    if (ocupados.has(l.id)) {
      l.status = 'ocupado'
      l.status_desde = fila.find((f) => f.atendimento.leito_id === l.id && f.atendimento.inicio_atendimento_em).atendimento.inicio_atendimento_em
    }
  }
  await inserir('leitos', leitos)
  await inserir('profissionais', profissionais.map(({ _usuario, ...p }) => p))
  // liga os usuários médico e enfermeiro ao seu cadastro profissional
  for (const p of profissionais.filter((p) => p._usuario)) {
    const perfil = USUARIOS.find((u) => u.email === p._usuario).perfil
    const { error } = await db.from('profiles').update({ profissional_id: p.id }).eq('id', usuarios[perfil])
    if (error) throw error
  }
  fim()

  fim = etapa(`Pacientes (${pacientes.todos.length})`)
  await inserir('pacientes', pacientes.todos)
  fim()

  const todos = [...historico, ...fila]
  fim = etapa(`Atendimentos (${historico.length} históricos + ${fila.length} na fila de hoje)`)
  await inserir('atendimentos', todos.map((t) => t.atendimento))
  fim()

  fim = etapa('Sinais vitais e desfechos')
  await inserir('sinais_vitais', todos.flatMap((t) => t.sinais), 1000)
  await inserir('desfechos', todos.map((t) => t.desfecho).filter(Boolean))
  fim()

  console.log('\nConferência (linhas no banco):')
  for (const t of ['profiles', 'alas', 'leitos', 'profissionais', 'pacientes', 'atendimentos', 'sinais_vitais', 'desfechos']) {
    console.log(`  ${t.padEnd(15)} ${await contar(t)}`)
  }
  console.log(`\nUsuários de teste (senha: ${SENHA}):`)
  for (const u of USUARIOS) console.log(`  ${u.perfil.padEnd(14)} ${u.email}${u.registro ? `  (registro ${u.registro})` : ''}`)
}

main().catch((e) => {
  console.error('\nFalhou:', e.message)
  process.exit(1)
})
