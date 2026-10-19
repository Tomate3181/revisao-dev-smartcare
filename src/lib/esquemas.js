import { z } from 'zod'
import { ROTULO_STATUS_LEITO, ROTULO_TIPO_LEITO, ROTULO_TURNO, TIPOS_REGISTRO, UFS } from './dominio'

// Validação no front com zod (RNF01). O banco repete as regras críticas em CHECK/UNIQUE,
// então nada passa mesmo que alguém pule o formulário.

// '' de um campo vazio vira null antes de validar
const vazioParaNull = (esquema) => z.preprocess((v) => (v === '' || v === undefined ? null : v), esquema.nullable())
const texto = (min, max, msg) => z.string().trim().min(min, msg).max(max, `Use no máximo ${max} caracteres`)
const inteiro = (min, max, rotulo) =>
  z.number({ error: `Informe ${rotulo}` }).int(`${rotulo} deve ser um número inteiro`).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`)
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida')

/** Converte o valor de <input type=number> para número (ou null se vazio). Usar no register. */
export const comoNumero = { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) }

// ---------- RF02: alas ----------
export const esquemaAla = z.object({
  nome: texto(2, 80, 'Informe o nome da ala'),
  descricao: vazioParaNull(z.string().trim().max(300, 'Use no máximo 300 caracteres')),
  andar: z.number().int('Andar deve ser inteiro').min(-5).max(50).nullable(),
  planta_colunas: inteiro(1, 20, 'o número de colunas'),
  planta_linhas: inteiro(1, 20, 'o número de linhas'),
})

// ---------- RF02: leitos e consultórios ----------
export const esquemaLeito = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Informe o código')
      .max(20, 'Use no máximo 20 caracteres')
      .regex(/^[A-Z0-9-]+$/, 'Use letras, números e hífen (ex.: UTI-01)'),
    ala_id: z.uuid({ error: 'Selecione a ala' }),
    tipo: z.enum(Object.keys(ROTULO_TIPO_LEITO), { error: 'Selecione o tipo' }),
    especialidade: vazioParaNull(z.string().trim().max(60)),
    equipamentos: z.array(z.string()).default([]),
    status: z.enum(Object.keys(ROTULO_STATUS_LEITO), { error: 'Selecione o status' }),
    proxima_manutencao: vazioParaNull(data),
    pos_x: z.number().int().min(0),
    pos_y: z.number().int().min(0),
    observacoes: vazioParaNull(z.string().trim().max(500, 'Use no máximo 500 caracteres')),
  })
  // Consultório atende uma especialidade: é o que a alocação automática (RF05) usa.
  .refine((l) => l.tipo !== 'consultorio' || l.especialidade, {
    path: ['especialidade'],
    message: 'Consultório precisa de uma especialidade',
  })

// ---------- RF03: profissionais de saúde ----------
export const esquemaProfissional = z.object({
  nome: texto(3, 120, 'Informe o nome completo'),
  tipo_registro: z.enum(TIPOS_REGISTRO, { error: 'Selecione CRM ou COREN' }),
  registro: z.string().trim().regex(/^[0-9]{3,10}$/, 'Só números, de 3 a 10 dígitos'),
  registro_uf: z.enum(UFS, { error: 'Selecione a UF' }),
  registro_validade: data,
  especialidade: texto(2, 60, 'Informe a especialidade'),
  email: vazioParaNull(z.email('Informe um e-mail válido')),
  telefone: vazioParaNull(z.string().trim().regex(/^[0-9()\s+-]{8,20}$/, 'Ex.: (12) 99999-0000')),
  turno: z.enum(Object.keys(ROTULO_TURNO), { error: 'Selecione o turno' }),
  ala_id: vazioParaNull(z.uuid()),
  consultorio_id: vazioParaNull(z.uuid()),
  ativo: z.boolean(),
})

// ---------- RF04: Recepção de Pacientes ----------

/** Validação algorítmica de CPF brasileiro (11 dígitos e dígitos verificadores) */
export function validarCpf(cpf) {
  if (!cpf) return false
  const limpo = String(cpf).replace(/\D/g, '')
  if (limpo.length !== 11) return false
  if (/^(\d)\1+$/.test(limpo)) return false
  const digitos = limpo.split('').map(Number)
  const dv = (base) => {
    const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return digitos[9] === dv(digitos.slice(0, 9)) && digitos[10] === dv(digitos.slice(0, 10))
}

export const esquemaRecepcao = z.object({
  // Identificação do Paciente
  nome: texto(3, 120, 'Informe o nome completo do paciente'),
  cpf: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 11, 'CPF deve ter 11 dígitos')
    .refine(validarCpf, 'CPF inválido (dígitos verificadores não conferem)'),
  data_nascimento: data.refine(
    (d) => {
      const hoje = new Date().toISOString().slice(0, 10)
      return d <= hoje
    },
    'A data de nascimento não pode ser no futuro',
  ),
  sexo: z.enum(['F', 'M', 'O'], { error: 'Selecione o sexo' }),
  telefone: vazioParaNull(z.string().trim().regex(/^[0-9()\s+-]{8,20}$/, 'Telefone inválido')),
  convenio: texto(2, 60, 'Informe o convênio'),
  numero_carteirinha: vazioParaNull(z.string().trim().max(40)),
  alergias: z.array(z.string()).default([]),
  comorbidades: z.array(z.string()).default([]),

  // Atendimento
  queixa_principal: texto(3, 500, 'Informe a queixa principal (mínimo 3 caracteres)'),

  // Sinais vitais iniciais (opcionais na recepção)
  pa_sistolica: vazioParaNull(z.number().int().min(40, 'Mínimo 40').max(300, 'Máximo 300')),
  pa_diastolica: vazioParaNull(z.number().int().min(20, 'Mínimo 20').max(200, 'Máximo 200')),
  temperatura: vazioParaNull(z.number().min(30, 'Mínimo 30°C').max(45, 'Máximo 45°C')),
  frequencia_cardiaca: vazioParaNull(z.number().int().min(20, 'Mínimo 20 bpm').max(250, 'Máximo 250 bpm')),
  frequencia_respiratoria: vazioParaNull(z.number().int().min(4, 'Mínimo 4 rpm').max(70, 'Máximo 70 rpm')),
  saturacao: vazioParaNull(z.number().int().min(40, 'Mínimo 40%').max(100, 'Máximo 100%')),
  dor: vazioParaNull(z.number().int().min(0, 'Mínimo 0').max(10, 'Máximo 10')),
  glicemia: vazioParaNull(z.number().int().min(10, 'Mínimo 10 mg/dL').max(1000, 'Máximo 1000 mg/dL')),
})

