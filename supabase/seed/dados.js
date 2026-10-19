// Catálogos fictícios usados pelo seed. Nenhum dado aqui é de pessoa real.

// ---------- Usuários de teste (um por perfil) ----------
// O perfil vai no app_metadata: só o servidor grava esse campo (ver handle_new_user em 03_functions.sql).
export const USUARIOS = [
  { email: 'admin@smartcare.test', nome: 'Helena Prado', perfil: 'admin' },
  { email: 'medico@smartcare.test', nome: 'Dr. Rafael Souza', perfil: 'medico', registro: '123456' },
  { email: 'enfermeiro@smartcare.test', nome: 'Enf. Larissa Mendes', perfil: 'enfermeiro', registro: '654321' },
  { email: 'recepcao@smartcare.test', nome: 'Paula Ribeiro', perfil: 'recepcionista' },
]

// ---------- Infraestrutura ----------
// prefixo + quantidade geram os códigos (UTI-01, UTI-02...). colunas = largura da grade da planta.
export const ALAS = [
  {
    nome: 'Pronto Atendimento',
    descricao: 'Consultórios de atendimento médico',
    andar: 0,
    colunas: 6,
    leitos: [
      { codigo: 'CG-01', tipo: 'consultorio', especialidade: 'Clínica Geral' },
      { codigo: 'CG-02', tipo: 'consultorio', especialidade: 'Clínica Geral' },
      { codigo: 'CG-03', tipo: 'consultorio', especialidade: 'Clínica Geral' },
      { codigo: 'PED-01', tipo: 'consultorio', especialidade: 'Pediatria' },
      { codigo: 'ORT-01', tipo: 'consultorio', especialidade: 'Ortopedia' },
      { codigo: 'CAR-01', tipo: 'consultorio', especialidade: 'Cardiologia' },
    ],
  },
  { nome: 'Observação Adulto', descricao: 'Leitos de observação e medicação', andar: 0, colunas: 5, prefixo: 'OBS', quantidade: 10, tipo: 'observacao' },
  { nome: 'UTI Adulto', descricao: 'Terapia intensiva', andar: 2, colunas: 6, prefixo: 'UTI', quantidade: 12, tipo: 'uti' },
  { nome: 'Isolamento', descricao: 'Leitos com pressão negativa para doenças infecciosas', andar: 1, colunas: 4, prefixo: 'ISO', quantidade: 4, tipo: 'isolamento' },
  { nome: 'Observação Pediátrica', descricao: 'Observação de crianças', andar: 1, colunas: 4, prefixo: 'OBP', quantidade: 4, tipo: 'observacao' },
]

export const EQUIPAMENTOS = {
  consultorio: ['Maca', 'Esfigmomanômetro', 'Otoscópio', 'Computador'],
  observacao: ['Cama hospitalar', 'Monitor multiparamétrico', 'Bomba de infusão', 'Oxigênio'],
  uti: ['Ventilador mecânico', 'Monitor multiparamétrico', 'Bomba de infusão', 'Desfibrilador', 'Oxigênio'],
  isolamento: ['Cama hospitalar', 'Pressão negativa', 'Monitor multiparamétrico', 'Oxigênio'],
}

// ---------- Corpo clínico ----------
// validadeDias: dias até o registro vencer (negativo = já vencido) → alimenta o alerta do RF11.
export const PROFISSIONAIS = [
  { nome: 'Dr. Rafael Souza', tipo: 'CRM', registro: '123456', especialidade: 'Clínica Geral', turno: 'manha', consultorio: 'CG-01', usuario: 'medico@smartcare.test' },
  { nome: 'Dra. Camila Rocha', tipo: 'CRM', registro: '223344', especialidade: 'Clínica Geral', turno: 'tarde', consultorio: 'CG-02' },
  { nome: 'Dr. Bruno Lima', tipo: 'CRM', registro: '334455', especialidade: 'Clínica Geral', turno: 'noite', consultorio: 'CG-03', validadeDias: 12 },
  { nome: 'Dra. Juliana Alves', tipo: 'CRM', registro: '445566', especialidade: 'Clínica Geral', turno: 'plantao_12h', consultorio: 'CG-01' },
  { nome: 'Dra. Fernanda Costa', tipo: 'CRM', registro: '556677', especialidade: 'Pediatria', turno: 'manha', consultorio: 'PED-01' },
  { nome: 'Dr. Gustavo Pereira', tipo: 'CRM', registro: '667788', especialidade: 'Pediatria', turno: 'noite', consultorio: 'PED-01' },
  { nome: 'Dr. Marcelo Teixeira', tipo: 'CRM', registro: '778899', especialidade: 'Ortopedia', turno: 'tarde', consultorio: 'ORT-01' },
  { nome: 'Dra. Patrícia Gomes', tipo: 'CRM', registro: '889900', especialidade: 'Cardiologia', turno: 'manha', consultorio: 'CAR-01' },
  { nome: 'Dr. Ricardo Martins', tipo: 'CRM', registro: '990011', especialidade: 'Cardiologia', turno: 'noite', consultorio: 'CAR-01', validadeDias: -3 },
  { nome: 'Dr. André Carvalho', tipo: 'CRM', registro: '101112', especialidade: 'Medicina Intensiva', turno: 'plantao_24h', ala: 'UTI Adulto' },
  { nome: 'Dra. Beatriz Nunes', tipo: 'CRM', registro: '121314', especialidade: 'Medicina Intensiva', turno: 'plantao_12h', ala: 'UTI Adulto' },
  { nome: 'Enf. Larissa Mendes', tipo: 'COREN', registro: '654321', especialidade: 'Enfermagem de Urgência', turno: 'manha', ala: 'Pronto Atendimento', usuario: 'enfermeiro@smartcare.test' },
  { nome: 'Enf. Thiago Barbosa', tipo: 'COREN', registro: '765432', especialidade: 'Enfermagem de Urgência', turno: 'tarde', ala: 'Pronto Atendimento' },
  { nome: 'Enf. Aline Freitas', tipo: 'COREN', registro: '876543', especialidade: 'Enfermagem Intensiva', turno: 'noite', ala: 'UTI Adulto', validadeDias: 25 },
  { nome: 'Enf. Diego Ramos', tipo: 'COREN', registro: '987654', especialidade: 'Enfermagem', turno: 'plantao_12h', ala: 'Observação Adulto' },
]

// ---------- Pacientes ----------
export const NOMES_F = ['Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline', 'Sandra', 'Camila', 'Amanda', 'Bruna', 'Jéssica', 'Letícia', 'Júlia', 'Luciana', 'Vanessa', 'Mariana', 'Beatriz', 'Larissa', 'Sofia', 'Helena', 'Alice', 'Valentina', 'Laura', 'Isabela', 'Manuela', 'Lorena']
export const NOMES_M = ['José', 'João', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Luís', 'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Raimundo', 'Rodrigo', 'Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Davi', 'Théo', 'Lorenzo', 'Gustavo', 'Matheus', 'Vinícius']
export const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas']

// peso = probabilidade relativa
export const CONVENIOS = [
  { nome: 'SUS', peso: 60 },
  { nome: 'Unimed', peso: 15 },
  { nome: 'Bradesco Saúde', peso: 9 },
  { nome: 'SulAmérica', peso: 8 },
  { nome: 'Amil', peso: 8 },
]

export const ALERGIAS = ['Dipirona', 'Penicilina', 'Amoxicilina', 'AAS', 'Ibuprofeno', 'Látex', 'Iodo', 'Sulfa', 'Frutos do mar']
export const COMORBIDADES = ['Hipertensão', 'Diabetes tipo 2', 'Asma', 'DPOC', 'Insuficiência cardíaca', 'Obesidade', 'Doença renal crônica', 'Hipotireoidismo', 'Tabagismo']

// ---------- Protocolo de Manchester ----------
// Tempo-limite (min) de cada cor, conforme o PDF da prova.
export const TEMPO_LIMITE = { vermelho: 0, laranja: 10, amarelo: 60, verde: 120, azul: 240 }
export const PESO_PRIORIDADE = { vermelho: 3, laranja: 12, amarelo: 30, verde: 40, azul: 15 }

// Quadros clínicos por cor: queixa, sintomas (discriminadores), especialidade, CID do desfecho
// e faixas de sinais vitais coerentes com a gravidade. `resp` marca quadros respiratórios
// (crescem no surto sazonal das últimas semanas → aparecem na previsão do RF08).
// `crianca` sorteia paciente pediátrico.
const normais = { pas: [110, 135], pad: [70, 85], fc: [65, 95], fr: [14, 18], temp: [36.2, 37.2], sat: [96, 99], dor: [0, 2], glasgow: [15, 15] }
const sv = (ajustes) => ({ ...normais, ...ajustes })

export const QUADROS = {
  vermelho: [
    { queixa: 'Falta de ar intensa com lábios arroxeados', sintomas: ['dispneia_grave', 'cianose'], especialidade: 'Medicina Intensiva', cid: ['J96.0', 'Insuficiência respiratória aguda'], resp: true, sinais: sv({ sat: [80, 88], fr: [30, 40], fc: [120, 150] }) },
    { queixa: 'Dor no peito forte com suor frio', sintomas: ['dor_toracica', 'sudorese'], especialidade: 'Cardiologia', cid: ['I21.9', 'Infarto agudo do miocárdio'], sinais: sv({ pas: [80, 95], pad: [45, 60], fc: [110, 140], dor: [9, 10] }) },
    { queixa: 'Rebaixamento do nível de consciência', sintomas: ['alteracao_consciencia'], especialidade: 'Medicina Intensiva', cid: ['R40.2', 'Coma não especificado'], sinais: sv({ glasgow: [6, 9], fc: [50, 60] }) },
  ],
  laranja: [
    { queixa: 'Dor no peito em aperto', sintomas: ['dor_toracica'], especialidade: 'Cardiologia', cid: ['I20.0', 'Angina instável'], sinais: sv({ dor: [7, 9], fc: [95, 115], pas: [150, 175] }) },
    { queixa: 'Febre alta e prostração', sintomas: ['febre_alta', 'prostracao'], especialidade: 'Pediatria', cid: ['J18.9', 'Pneumonia não especificada'], resp: true, crianca: true, sinais: sv({ temp: [39.5, 40.5], fc: [120, 150], sat: [92, 95] }) },
    { queixa: 'Falta de ar e chiado no peito', sintomas: ['dispneia', 'sibilancia'], especialidade: 'Clínica Geral', cid: ['J45.9', 'Asma não especificada'], resp: true, sinais: sv({ sat: [89, 92], fr: [24, 30], fc: [100, 120] }) },
    { queixa: 'Fratura exposta na perna após queda', sintomas: ['trauma', 'sangramento'], especialidade: 'Ortopedia', cid: ['S82.2', 'Fratura da diáfise da tíbia'], sinais: sv({ dor: [8, 10], fc: [100, 120] }) },
  ],
  amarelo: [
    { queixa: 'Dor abdominal intensa e vômitos', sintomas: ['dor_abdominal', 'vomito'], especialidade: 'Clínica Geral', cid: ['R10.4', 'Dor abdominal não especificada'], sinais: sv({ dor: [5, 7], fc: [90, 105] }) },
    { queixa: 'Dor de cabeça forte e pressão alta', sintomas: ['cefaleia'], especialidade: 'Cardiologia', cid: ['I10', 'Hipertensão essencial'], sinais: sv({ pas: [180, 200], pad: [110, 120], dor: [5, 7] }) },
    { queixa: 'Febre e tosse há 3 dias', sintomas: ['febre', 'tosse'], especialidade: 'Clínica Geral', cid: ['J18.9', 'Pneumonia não especificada'], resp: true, sinais: sv({ temp: [38.5, 39.4], fc: [95, 110], sat: [93, 95] }) },
    { queixa: 'Entorse no tornozelo com deformidade', sintomas: ['trauma', 'dor_moderada'], especialidade: 'Ortopedia', cid: ['S93.4', 'Entorse do tornozelo'], sinais: sv({ dor: [5, 7] }) },
    { queixa: 'Vômitos persistentes', sintomas: ['vomito', 'desidratacao'], especialidade: 'Pediatria', cid: ['A09', 'Diarreia e gastroenterite infecciosa'], crianca: true, sinais: sv({ fc: [110, 130], temp: [37.5, 38.4] }) },
  ],
  verde: [
    { queixa: 'Dor de garganta', sintomas: ['odinofagia', 'febre_baixa'], especialidade: 'Clínica Geral', cid: ['J02.9', 'Faringite aguda'], resp: true, sinais: sv({ temp: [37.5, 38.0] }) },
    { queixa: 'Tosse e coriza', sintomas: ['tosse', 'coriza'], especialidade: 'Clínica Geral', cid: ['J06.9', 'Infecção aguda das vias aéreas superiores'], resp: true, sinais: sv({}) },
    { queixa: 'Dor lombar após esforço', sintomas: ['dor_leve'], especialidade: 'Ortopedia', cid: ['M54.5', 'Dor lombar baixa'], sinais: sv({ dor: [3, 5] }) },
    { queixa: 'Febre baixa e nariz entupido', sintomas: ['febre_baixa', 'coriza'], especialidade: 'Pediatria', cid: ['J06.9', 'Infecção aguda das vias aéreas superiores'], resp: true, crianca: true, sinais: sv({ temp: [37.5, 38.0], fc: [90, 115] }) },
    { queixa: 'Diarreia sem sinais de desidratação', sintomas: ['diarreia'], especialidade: 'Clínica Geral', cid: ['A09', 'Diarreia e gastroenterite infecciosa'], sinais: sv({}) },
  ],
  azul: [
    { queixa: 'Renovação de receita de uso contínuo', sintomas: [], especialidade: 'Clínica Geral', cid: ['Z76.0', 'Emissão de prescrição de repetição'], sinais: sv({}) },
    { queixa: 'Mostrar resultado de exames', sintomas: [], especialidade: 'Clínica Geral', cid: ['Z71.9', 'Aconselhamento não especificado'], sinais: sv({}) },
    { queixa: 'Dor leve no joelho há semanas', sintomas: ['dor_leve'], especialidade: 'Ortopedia', cid: ['M25.5', 'Dor articular'], sinais: sv({ dor: [1, 3] }) },
    { queixa: 'Troca de curativo', sintomas: ['curativo'], especialidade: 'Clínica Geral', cid: ['Z48.0', 'Cuidados de curativo'], sinais: sv({}) },
  ],
}

export const CONDUTAS = {
  vermelho: ['Estabilização em sala de emergência, monitorização contínua e transferência para UTI.', 'Suporte ventilatório, acesso venoso central e drogas vasoativas.'],
  laranja: ['Medicação endovenosa, monitorização e reavaliação em 1 hora.', 'Exames laboratoriais e de imagem; observação por 6 horas.'],
  amarelo: ['Analgesia, hidratação venosa e reavaliação.', 'Medicação sintomática e exames complementares.'],
  verde: ['Medicação sintomática e orientações de retorno.', 'Prescrição oral e repouso por 3 dias.'],
  azul: ['Orientações e encaminhamento para a atenção básica.', 'Renovação de prescrição e retorno ambulatorial.'],
}
