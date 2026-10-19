-- =====================================================================================
-- Smart Care · 01_schema.sql
-- Tipos, tabelas, índices e timestamps automáticos.
-- RLS, auditoria e funções ficam em 02_rls.sql e 03_functions.sql.
--
-- Rodar no Supabase → SQL Editor (uma vez). Para recriar do zero durante o desenvolvimento,
-- descomente o bloco "RESET" abaixo — ele APAGA todos os dados do schema public.
-- =====================================================================================

-- ---------- RESET (só em desenvolvimento) ----------
-- drop table if exists public.audit_log, public.notificacoes_log, public.alertas, public.anexos,
--   public.desfechos, public.sinais_vitais, public.atendimentos, public.pacientes,
--   public.profissionais, public.leitos, public.alas, public.profiles cascade;
-- drop type if exists public.perfil, public.tipo_leito, public.status_leito, public.status_atendimento,
--   public.prioridade, public.origem_classificacao, public.tipo_registro, public.turno,
--   public.tipo_desfecho, public.tipo_anexo, public.tipo_alerta, public.severidade_alerta,
--   public.momento_sinais cascade;


-- =====================================================================================
-- 1. TIPOS (enums)
-- Os valores seguem o PDF da prova para que tela, banco e relatórios falem a mesma língua.
-- =====================================================================================

-- RF01: os quatro perfis de acesso
create type public.perfil as enum ('admin', 'medico', 'enfermeiro', 'recepcionista');

-- RF02: tipos e status de leito/sala
create type public.tipo_leito as enum ('consultorio', 'observacao', 'uti', 'isolamento');
create type public.status_leito as enum ('livre', 'ocupado', 'higienizacao', 'manutencao');

-- RF06: jornada do paciente dentro da unidade, na ordem em que acontece
create type public.status_atendimento as enum (
  'aguardando_triagem',
  'aguardando_medico',
  'em_atendimento',
  'em_medicacao',
  'alta'
);

-- RF05: as cinco cores do Protocolo de Manchester (da mais grave para a menos grave)
create type public.prioridade as enum ('vermelho', 'laranja', 'amarelo', 'verde', 'azul');

-- Quem chegou na classificação final: o motor local, a IA ou o enfermeiro alterando a sugestão
create type public.origem_classificacao as enum ('motor_local', 'ia', 'manual');

-- RF03
create type public.tipo_registro as enum ('CRM', 'COREN');
create type public.turno as enum ('manha', 'tarde', 'noite', 'plantao_12h', 'plantao_24h');

-- RF07
create type public.tipo_desfecho as enum ('alta', 'internacao', 'transferencia', 'obito');
create type public.tipo_anexo as enum ('receita', 'atestado', 'exame', 'assinatura', 'outro');

-- RF11 (+ RF09 para risco de agravamento)
create type public.tipo_alerta as enum (
  'espera_excedida',
  'higienizacao_longa',
  'ocupacao_ala',
  'manutencao_proxima',
  'registro_vencendo',
  'risco_agravamento'
);
create type public.severidade_alerta as enum ('info', 'atencao', 'critico');

-- Em que momento os sinais vitais foram medidos (permite ver a tendência no RF09)
create type public.momento_sinais as enum ('recepcao', 'triagem', 'reavaliacao', 'atendimento');


-- =====================================================================================
-- 2. FUNÇÃO UTILITÁRIA: updated_at automático
-- =====================================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- =====================================================================================
-- 3. TABELAS
-- =====================================================================================

-- ---------- Infraestrutura (RF02) ----------

-- Alas/setores. linhas × colunas definem a grade da planta baixa do mapa (RF06).
create table public.alas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null unique check (length(trim(nome)) between 2 and 80),
  descricao       text,
  andar           smallint,
  planta_colunas  smallint not null default 6 check (planta_colunas between 1 and 20),
  planta_linhas   smallint not null default 4 check (planta_linhas between 1 and 20),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Leitos e consultórios. pos_x/pos_y = célula na grade da planta da ala.
create table public.leitos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique check (length(trim(codigo)) between 1 and 20),
  ala_id              uuid not null references public.alas (id) on delete restrict,
  tipo                public.tipo_leito not null,
  -- consultórios atendem uma especialidade; usado na alocação automática (RF05)
  especialidade       text,
  equipamentos        text[] not null default '{}',
  status              public.status_leito not null default 'livre',
  -- quando o status mudou: base do alerta de "higienização por tempo excessivo" (RF11)
  status_desde        timestamptz not null default now(),
  proxima_manutencao  date,
  pos_x               smallint not null default 0 check (pos_x >= 0),
  pos_y               smallint not null default 0 check (pos_y >= 0),
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- dois leitos não podem ocupar a mesma célula da planta
  unique (ala_id, pos_x, pos_y)
);

-- ---------- Pessoas ----------

-- Corpo clínico (RF03). Separado de profiles: nem todo profissional usa o sistema.
create table public.profissionais (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null check (length(trim(nome)) between 3 and 120),
  tipo_registro      public.tipo_registro not null,
  registro           text not null check (registro ~ '^[0-9]{3,10}$'),
  registro_uf        char(2) not null check (registro_uf ~ '^[A-Z]{2}$'),
  registro_validade  date not null,
  especialidade      text not null,
  email              text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefone           text,
  turno              public.turno not null,
  -- vínculo com uma ala e, opcionalmente, um consultório fixo
  ala_id             uuid references public.alas (id) on delete set null,
  consultorio_id     uuid references public.leitos (id) on delete set null,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tipo_registro, registro, registro_uf)
);

-- Usuários do sistema (RF01). 1:1 com auth.users do Supabase; a senha fica só no Auth.
-- `registro` permite o login por CRM/COREN além do e-mail.
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nome             text not null,
  email            text not null unique,
  perfil           public.perfil not null default 'recepcionista',
  registro         text unique,
  profissional_id  uuid unique references public.profissionais (id) on delete set null,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Pacientes (RF04). Dados pessoais e sensíveis: acesso controlado por RLS (RNF08).
create table public.pacientes (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null check (length(trim(nome)) between 3 and 120),
  cpf                  text unique check (cpf ~ '^[0-9]{11}$'),
  data_nascimento      date not null check (data_nascimento <= current_date),
  sexo                 char(1) check (sexo in ('F', 'M', 'O')),
  telefone             text,
  convenio             text not null default 'SUS',
  numero_carteirinha   text,
  alergias             text[] not null default '{}',
  comorbidades         text[] not null default '{}',
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------- Fluxo do atendimento ----------

-- Um atendimento = uma passagem do paciente pela unidade.
-- Cada etapa tem seu timestamp: são a base do TME, do % dentro do prazo e da permanência (RF10).
create table public.atendimentos (
  id                     uuid primary key default gen_random_uuid(),
  paciente_id            uuid not null references public.pacientes (id) on delete restrict,
  status                 public.status_atendimento not null default 'aguardando_triagem',
  queixa_principal       text not null check (length(trim(queixa_principal)) >= 3),
  sintomas               text[] not null default '{}',
  origem                 text not null default 'manual' check (origem in ('manual', 'csv')),

  -- Triagem (RF05): sugestão do sistema × decisão final do enfermeiro
  prioridade_sugerida    public.prioridade,
  prioridade             public.prioridade,
  classificacao_origem   public.origem_classificacao,
  justificativa_triagem  text,
  -- obrigatório quando o enfermeiro muda a cor sugerida (rastreabilidade clínica)
  motivo_alteracao       text,
  tempo_limite_min       smallint check (tempo_limite_min >= 0),
  -- prazo = triagem + tempo-limite de Manchester; gravado na triagem para consultas rápidas
  prazo_em               timestamptz,

  -- Alocação (RF05)
  medico_id              uuid references public.profissionais (id) on delete set null,
  leito_id               uuid references public.leitos (id) on delete set null,

  -- Responsáveis por etapa
  recepcionista_id       uuid references public.profiles (id) on delete set null,
  enfermeiro_id          uuid references public.profiles (id) on delete set null,

  -- RF09: último score de risco calculado (0–100)
  risco_score            smallint check (risco_score between 0 and 100),

  -- Timestamps de cada etapa
  chegada_em             timestamptz not null default now(),
  triagem_em             timestamptz,
  inicio_atendimento_em  timestamptz,
  medicacao_em           timestamptz,
  alta_em                timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- coerência mínima: depois da triagem precisa haver cor; a alteração da sugestão exige motivo
  constraint triagem_com_prioridade
    check (status = 'aguardando_triagem' or prioridade is not null),
  constraint alteracao_com_motivo
    check (prioridade is not distinct from prioridade_sugerida
           or prioridade is null
           or prioridade_sugerida is null
           or length(trim(coalesce(motivo_alteracao, ''))) >= 3),
  constraint etapas_em_ordem
    check (triagem_em is null or triagem_em >= chegada_em)
);

-- Sinais vitais (RF04/RF05). Vários registros por atendimento → tendência para o RF09.
-- Faixas largas: rejeitam erro de digitação sem barrar valores clínicos extremos reais.
create table public.sinais_vitais (
  id                       uuid primary key default gen_random_uuid(),
  atendimento_id           uuid not null references public.atendimentos (id) on delete cascade,
  momento                  public.momento_sinais not null default 'recepcao',
  pa_sistolica             smallint check (pa_sistolica between 40 and 300),
  pa_diastolica            smallint check (pa_diastolica between 20 and 200),
  frequencia_cardiaca      smallint check (frequencia_cardiaca between 20 and 250),
  frequencia_respiratoria  smallint check (frequencia_respiratoria between 4 and 70),
  temperatura              numeric(4, 1) check (temperatura between 30 and 45),
  saturacao                smallint check (saturacao between 40 and 100),
  glicemia                 smallint check (glicemia between 10 and 1000),
  dor                      smallint check (dor between 0 and 10),
  glasgow                  smallint check (glasgow between 3 and 15),
  registrado_por           uuid references public.profiles (id) on delete set null,
  registrado_em            timestamptz not null default now()
);

-- Desfecho clínico (RF07). Um por atendimento; data/hora e médico preenchidos automaticamente.
create table public.desfechos (
  id              uuid primary key default gen_random_uuid(),
  atendimento_id  uuid not null unique references public.atendimentos (id) on delete cascade,
  medico_id       uuid references public.profissionais (id) on delete set null,
  registrado_por  uuid references public.profiles (id) on delete set null,
  tipo            public.tipo_desfecho not null default 'alta',
  cid_codigo      text not null check (cid_codigo ~ '^[A-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$'),
  cid_descricao   text not null,
  evolucao        text not null check (length(trim(evolucao)) >= 10),
  conduta         text not null,
  prescricao      text,
  registrado_em   timestamptz not null default now()
);

-- Anexos do prontuário (RF07). O arquivo fica no Storage (bucket "anexos"); aqui só o caminho.
create table public.anexos (
  id              uuid primary key default gen_random_uuid(),
  atendimento_id  uuid not null references public.atendimentos (id) on delete cascade,
  desfecho_id     uuid references public.desfechos (id) on delete cascade,
  tipo            public.tipo_anexo not null,
  nome_arquivo    text not null,
  storage_path    text not null unique,
  mime_type       text,
  tamanho_bytes   integer check (tamanho_bytes between 0 and 10485760), -- até 10 MB
  enviado_por     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ---------- Alertas e auditoria ----------

-- Alertas automáticos (RF11). `chave` identifica o fato (ex.: "espera_excedida:<atendimento>")
-- para o job do cron não duplicar um alerta que ainda está aberto.
create table public.alertas (
  id                  uuid primary key default gen_random_uuid(),
  tipo                public.tipo_alerta not null,
  severidade          public.severidade_alerta not null default 'atencao',
  chave               text not null,
  titulo              text not null,
  mensagem            text not null,
  ala_id              uuid references public.alas (id) on delete set null,
  referencia_tabela   text,
  referencia_id       uuid,
  email_enviado       boolean not null default false,
  resolvido_em        timestamptz,
  resolvido_por       uuid references public.profiles (id) on delete set null,
  resolucao_obs       text,
  created_at          timestamptz not null default now()
);

-- Log de cada notificação: exibida no painel, e-mail enviado/falhou, resolução (RF11 passo 4).
create table public.notificacoes_log (
  id            bigint generated always as identity primary key,
  alerta_id     uuid references public.alertas (id) on delete cascade,
  canal         text not null check (canal in ('painel', 'email')),
  evento        text not null check (evento in ('criado', 'enviado', 'falhou', 'resolvido')),
  destinatario  text,
  detalhe       jsonb,
  usuario_id    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Trilha de auditoria (RNF08 · LGPD): quem alterou o quê e quando. Preenchida por triggers (03).
create table public.audit_log (
  id            bigint generated always as identity primary key,
  tabela        text not null,
  registro_id   uuid,
  acao          text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id    uuid,
  dados_antes   jsonb,
  dados_depois  jsonb,
  created_at    timestamptz not null default now()
);


-- =====================================================================================
-- 4. TRIGGERS DE updated_at
-- =====================================================================================
create trigger trg_alas_updated          before update on public.alas          for each row execute function public.set_updated_at();
create trigger trg_leitos_updated        before update on public.leitos        for each row execute function public.set_updated_at();
create trigger trg_profissionais_updated before update on public.profissionais for each row execute function public.set_updated_at();
create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_pacientes_updated     before update on public.pacientes     for each row execute function public.set_updated_at();
create trigger trg_atendimentos_updated  before update on public.atendimentos  for each row execute function public.set_updated_at();

-- Sempre que o status do leito muda, reinicia o relógio do status (base do alerta de higienização).
create or replace function public.leito_marca_status_desde()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_desde := now();
  end if;
  return new;
end;
$$;

create trigger trg_leitos_status_desde
  before update of status on public.leitos
  for each row execute function public.leito_marca_status_desde();


-- =====================================================================================
-- 5. ÍNDICES (RNF02) — cobrem as consultas da fila, do mapa, do dashboard e do cron
-- =====================================================================================
create index idx_leitos_ala_status          on public.leitos (ala_id, status);
create index idx_leitos_manutencao          on public.leitos (proxima_manutencao) where proxima_manutencao is not null;
create index idx_profissionais_validade     on public.profissionais (registro_validade) where ativo;
create index idx_profissionais_especialidade on public.profissionais (especialidade) where ativo;
create index idx_pacientes_nome             on public.pacientes (lower(nome));

-- fila "viva": tudo que ainda não teve alta
create index idx_atendimentos_ativos        on public.atendimentos (status, prioridade, chegada_em) where status <> 'alta';
create index idx_atendimentos_chegada       on public.atendimentos (chegada_em);
create index idx_atendimentos_paciente      on public.atendimentos (paciente_id);
create index idx_atendimentos_medico        on public.atendimentos (medico_id) where medico_id is not null;
create index idx_atendimentos_leito         on public.atendimentos (leito_id) where leito_id is not null;

create index idx_sinais_atendimento         on public.sinais_vitais (atendimento_id, registrado_em desc);
create index idx_anexos_atendimento         on public.anexos (atendimento_id);

-- um único alerta ABERTO por fato; depois de resolvido, o mesmo fato pode gerar um novo
create unique index uq_alertas_abertos      on public.alertas (chave) where resolvido_em is null;
create index idx_alertas_criados            on public.alertas (created_at desc);
create index idx_notificacoes_alerta        on public.notificacoes_log (alerta_id);
create index idx_audit_tabela_registro      on public.audit_log (tabela, registro_id);
create index idx_audit_criado               on public.audit_log (created_at desc);
