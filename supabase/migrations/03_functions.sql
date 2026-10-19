-- =====================================================================================
-- Smart Care · 03_functions.sql
-- Signup → profile, login por CRM/COREN, auditoria LGPD, views anonimizadas,
-- bucket de anexos e Realtime.
-- =====================================================================================


-- =====================================================================================
-- 1. SIGNUP: todo usuário do Auth ganha um profile
--
-- Segurança: perfil e registro vêm de raw_APP_meta_data, que só o servidor (service_role)
-- consegue gravar. O raw_user_meta_data é editável pelo próprio usuário no signUp, então
-- dele só aproveitamos o nome. Quem se cadastra sozinho entra INATIVO e sem acesso,
-- até um administrador ativar e definir o perfil (RF01).
-- =====================================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfil;
begin
  begin
    v_perfil := (new.raw_app_meta_data ->> 'perfil')::public.perfil;
  exception when invalid_text_representation then
    v_perfil := null;
  end;

  insert into public.profiles (id, nome, email, perfil, registro, ativo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(v_perfil, 'recepcionista'),
    nullif(trim(new.raw_app_meta_data ->> 'registro'), ''),
    v_perfil is not null  -- só nasce ativo quem foi criado pelo servidor com perfil definido
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O Auth do Supabase (admin.createUser / updateUserById) grava o app_metadata DEPOIS do insert.
-- Por isso sincronizamos perfil e registro também quando esse campo muda. Continua seguro:
-- app_metadata só é gravável com a service_role.
create or replace function public.sync_app_metadata_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfil;
begin
  begin
    v_perfil := (new.raw_app_meta_data ->> 'perfil')::public.perfil;
  exception when invalid_text_representation then
    return new;
  end;
  if v_perfil is null then
    return new;
  end if;

  update public.profiles
     set perfil   = v_perfil,
         registro = coalesce(nullif(trim(new.raw_app_meta_data ->> 'registro'), ''), registro),
         ativo    = true
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_app_metadata on auth.users;
create trigger on_auth_user_app_metadata
  after update of raw_app_meta_data on auth.users
  for each row
  when (new.raw_app_meta_data is distinct from old.raw_app_meta_data)
  execute function public.sync_app_metadata_perfil();


-- =====================================================================================
-- 2. LOGIN POR REGISTRO PROFISSIONAL (RF01: "e-mail ou registro profissional")
--
-- O Supabase Auth autentica por e-mail. Esta RPC traduz CRM/COREN + perfil no e-mail
-- e o app então chama signInWithPassword normalmente. A senha nunca passa por aqui.
-- Exige o perfil junto para não virar uma consulta aberta de e-mails por número de registro.
-- =====================================================================================
create or replace function public.email_por_registro(p_registro text, p_perfil public.perfil)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.email
  from public.profiles p
  where upper(p.registro) = upper(trim(p_registro))
    and p.perfil = p_perfil
    and p.ativo
  limit 1
$$;

revoke all on function public.email_por_registro(text, public.perfil) from public;
grant execute on function public.email_por_registro(text, public.perfil) to anon, authenticated;


-- =====================================================================================
-- 3. AUDITORIA (RNF08 · LGPD)
-- Grava antes/depois de toda alteração em dados pessoais, clínicos e de infraestrutura,
-- com o usuário responsável. Ninguém escreve no audit_log pelo app (só leitura do admin).
-- =====================================================================================
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes  jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  -- UPDATE que não mudou nada não polui a trilha
  if tg_op = 'UPDATE' and v_antes - 'updated_at' = v_depois - 'updated_at' then
    return new;
  end if;

  insert into public.audit_log (tabela, registro_id, acao, usuario_id, dados_antes, dados_depois)
  values (
    tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id')::uuid,
    tg_op,
    auth.uid(),
    v_antes,
    v_depois
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'alas', 'leitos', 'profissionais', 'pacientes',
    'atendimentos', 'sinais_vitais', 'desfechos', 'anexos'
  ] loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I
         for each row execute function public.registrar_auditoria()', t);
  end loop;
end;
$$;


-- =====================================================================================
-- 4. LOG DE NOTIFICAÇÕES (RF11): criação e resolução de alertas ficam registradas
-- =====================================================================================
create or replace function public.alertas_registrar_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notificacoes_log (alerta_id, canal, evento, usuario_id)
    values (new.id, 'painel', 'criado', auth.uid());
  elsif new.resolvido_em is not null and old.resolvido_em is null then
    -- quem resolveu e quando são preenchidos aqui, não confiamos no que veio do cliente
    insert into public.notificacoes_log (alerta_id, canal, evento, usuario_id, detalhe)
    values (new.id, 'painel', 'resolvido', auth.uid(), jsonb_build_object('obs', new.resolucao_obs));
  end if;
  return new;
end;
$$;

create or replace function public.alertas_carimbar_resolucao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.resolvido_em is not null and old.resolvido_em is null then
    new.resolvido_em := now();
    new.resolvido_por := coalesce(auth.uid(), new.resolvido_por);
  elsif old.resolvido_em is not null then
    -- alerta resolvido não volta a ficar aberto nem troca de autor
    new.resolvido_em := old.resolvido_em;
    new.resolvido_por := old.resolvido_por;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_alertas_carimbo on public.alertas;
create trigger trg_alertas_carimbo
  before update on public.alertas
  for each row execute function public.alertas_carimbar_resolucao();

drop trigger if exists trg_alertas_log on public.alertas;
create trigger trg_alertas_log
  after insert or update of resolvido_em on public.alertas
  for each row execute function public.alertas_registrar_log();


-- =====================================================================================
-- 5. VIEWS ANONIMIZADAS (RNF08) — base do dashboard (RF10), da previsão (RF08)
--    e de tudo que for enviado à IA (RF12/RF13).
--
-- Sem nome, CPF, telefone, data de nascimento exata nem texto livre (queixa/evolução podem
-- conter dados identificáveis). Idade vira faixa etária. As views rodam com o dono (bypass
-- da RLS) para o gestor ver os agregados; por isso o filtro meu_perfil() is not null
-- garante que só a equipe logada consegue consultá-las.
-- =====================================================================================
create or replace view public.vw_atendimentos_anon as
select
  a.id,
  case
    when age(a.chegada_em, pa.data_nascimento) < interval '12 years' then '0-11'
    when age(a.chegada_em, pa.data_nascimento) < interval '18 years' then '12-17'
    when age(a.chegada_em, pa.data_nascimento) < interval '40 years' then '18-39'
    when age(a.chegada_em, pa.data_nascimento) < interval '60 years' then '40-59'
    else '60+'
  end                                         as faixa_etaria,
  pa.sexo,
  pa.convenio,
  a.status,
  a.prioridade,
  a.prioridade_sugerida,
  a.classificacao_origem,
  a.origem,
  a.tempo_limite_min,
  a.risco_score,
  pr.especialidade,
  l.tipo                                      as tipo_leito,
  al.nome                                     as ala,
  d.cid_codigo,
  d.tipo                                      as tipo_desfecho,
  a.chegada_em,
  a.triagem_em,
  a.inicio_atendimento_em,
  a.alta_em,
  -- TME: da chegada até o início do atendimento médico
  round(extract(epoch from (a.inicio_atendimento_em - a.chegada_em)) / 60)::int  as espera_min,
  -- permanência: da chegada até a alta
  round(extract(epoch from (a.alta_em - a.chegada_em)) / 60)::int                as permanencia_min,
  -- dentro do prazo de Manchester: atendido até o prazo calculado na triagem
  case
    when a.prazo_em is null or a.inicio_atendimento_em is null then null
    else a.inicio_atendimento_em <= a.prazo_em
  end                                         as dentro_prazo,
  extract(isodow from a.chegada_em)::int      as dia_semana,
  extract(hour from a.chegada_em)::int        as hora_chegada
from public.atendimentos a
join public.pacientes pa      on pa.id = a.paciente_id
left join public.profissionais pr on pr.id = a.medico_id
left join public.leitos l     on l.id = a.leito_id
left join public.alas al      on al.id = l.ala_id
left join public.desfechos d  on d.atendimento_id = a.id
where public.meu_perfil() is not null;

-- Ocupação por ala (RF06, RF10, alerta de 90% do RF11). Consultórios não contam como leito.
create or replace view public.vw_ocupacao_alas as
select
  al.id                                                     as ala_id,
  al.nome                                                   as ala,
  count(l.id)                                               as total,
  count(l.id) filter (where l.status = 'livre')             as livres,
  count(l.id) filter (where l.status = 'ocupado')           as ocupados,
  count(l.id) filter (where l.status = 'higienizacao')      as em_higienizacao,
  count(l.id) filter (where l.status = 'manutencao')        as em_manutencao,
  round(
    100.0 * count(l.id) filter (where l.status = 'ocupado')
    / nullif(count(l.id) filter (where l.status <> 'manutencao'), 0), 1
  )                                                         as taxa_ocupacao
from public.alas al
left join public.leitos l on l.ala_id = al.id and l.tipo <> 'consultorio'
where public.meu_perfil() is not null
group by al.id, al.nome;

revoke all on public.vw_atendimentos_anon, public.vw_ocupacao_alas from anon, public;
grant select on public.vw_atendimentos_anon, public.vw_ocupacao_alas to authenticated;


-- =====================================================================================
-- 6. STORAGE: bucket privado "anexos" (RF07) — receitas, atestados, exames e assinaturas
-- Caminho dos arquivos: <atendimento_id>/<arquivo>. Acesso só por URL assinada.
-- =====================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos', 'anexos', false, 10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists anexos_storage_select on storage.objects;
create policy anexos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.tem_perfil('medico', 'enfermeiro'));

drop policy if exists anexos_storage_insert on storage.objects;
create policy anexos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.tem_perfil('medico', 'enfermeiro'));
-- Sem update/delete: documento anexado ao prontuário não é substituído nem apagado.


-- =====================================================================================
-- 7. REALTIME (RNF04): mapa de leitos, fila e sino de alertas atualizam sozinhos.
-- O Realtime respeita a RLS: cada perfil só recebe eventos das linhas que pode ler.
-- =====================================================================================
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publicação supabase_realtime não encontrada; Realtime não configurado';
    return;
  end if;
  foreach t in array array['leitos', 'atendimentos', 'alertas'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
