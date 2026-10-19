// Rótulos e catálogos do domínio hospitalar. Os valores-chave batem com os enums do banco.

export const ROTULO_TIPO_LEITO = {
  consultorio: 'Consultório',
  observacao: 'Observação',
  uti: 'UTI',
  isolamento: 'Isolamento',
}

export const ROTULO_STATUS_LEITO = {
  livre: 'Livre',
  ocupado: 'Ocupado',
  higienizacao: 'Em higienização',
  manutencao: 'Em manutenção',
}

// Tons do Badge (NÃO são as cores de Manchester — essas são só para prioridade clínica).
export const TOM_STATUS_LEITO = {
  livre: 'ok',
  ocupado: 'marca',
  higienizacao: 'aviso',
  manutencao: 'neutro',
}

export const ROTULO_TURNO = {
  manha: 'Manhã (7h–13h)',
  tarde: 'Tarde (13h–19h)',
  noite: 'Noite (19h–7h)',
  plantao_12h: 'Plantão 12h',
  plantao_24h: 'Plantão 24h',
}

export const TIPOS_REGISTRO = ['CRM', 'COREN']

export const ESPECIALIDADES = [
  'Cardiologia',
  'Cirurgia Geral',
  'Clínica Geral',
  'Ginecologia e Obstetrícia',
  'Medicina Intensiva',
  'Neurologia',
  'Ortopedia',
  'Pediatria',
  'Enfermagem',
  'Enfermagem de Urgência',
  'Enfermagem Intensiva',
]

export const EQUIPAMENTOS = [
  'Maca',
  'Cama hospitalar',
  'Monitor multiparamétrico',
  'Oxigênio',
  'Bomba de infusão',
  'Ventilador mecânico',
  'Desfibrilador',
  'Pressão negativa',
  'Esfigmomanômetro',
  'Otoscópio',
  'Computador',
]

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']

// Antecedência dos avisos de vencimento (mesma regra que os alertas do RF11 vão usar)
export const DIAS_AVISO_REGISTRO = 30
export const DIAS_AVISO_MANUTENCAO = 7

/** Converte um mapa { chave: rótulo } em opções do <Select>. */
export const opcoes = (mapa) => Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }))
