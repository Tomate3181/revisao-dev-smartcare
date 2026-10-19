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
