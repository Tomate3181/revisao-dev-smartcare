-- =====================================================================================
-- Smart Care · 02_rls.sql
-- Row Level Security (RNF01 / RNF08): o banco decide o que cada perfil pode ver e alterar.
-- Mesmo que alguém use a anon key fora do app, só consegue o que estas políticas permitem.
--
-- Matriz de acesso (resumo):
--   tabela           | admin        | médico       | enfermeiro   | recepção
--   alas/leitos      | tudo         | ler + status | ler + status | ler
--   profissionais    | tudo         | ler          | ler          | ler
--   pacientes        | —  (só views anonimizadas)  | ler/editar   | ler/editar   | ler/criar/editar
--   atendimentos     | ler          | ler/editar   | ler/editar   | ler/criar (antes da triagem)
--   sinais_vitais    | —            | ler/criar    | ler/criar    | ler/criar
--   desfechos/anexos | —            | ler/criar    | ler          | —
--   alertas          | ler/resolver | ler/resolver | ler/resolver | ler/resolver
--   logs/auditoria   | ler          | —            | —            | —
-- Usuário sem login (anon) não tem nenhuma política → não vê nada.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- Perfil do usuário logado. SECURITY DEFINER para poder ler profiles sem cair na própria
-- RLS (evita recursão). Retorna NULL para anon ou usuário desativado → nenhuma permissão.
-- -------------------------------------------------------------------------------------
create or replace function public.meu_perfil()
returns public.perfil
language sql
stable
security definer
set search_path = ''
as $$
  select p.perfil
  from public.profiles p
  where p.id = auth.uid() and p.ativo
$$;

-- Atalho legível para as políticas: tem_perfil('medico','enfermeiro')
create or replace function public.tem_perfil(variadic perfis public.perfil[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.meu_perfil() = any (perfis), false)
$$;


-- -------------------------------------------------------------------------------------
-- Liga a RLS em todas as tabelas
-- -------------------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.alas             enable row level security;
alter table public.leitos           enable row level security;
alter table public.profissionais    enable row level security;
alter table public.pacientes        enable row level security;
alter table public.atendimentos     enable row level security;
alter table public.sinais_vitais    enable row level security;
alter table public.desfechos        enable row level security;
alter table public.anexos           enable row level security;
alter table public.alertas          enable row level security;
alter table public.notificacoes_log enable row level security;
alter table public.audit_log        enable row level security;


-- ---------- profiles ----------
-- Todos da equipe veem nomes/perfis (para exibir "triado por", "médico responsável").
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.meu_perfil() is not null or id = auth.uid());

-- Cada um edita o próprio cadastro; o admin edita qualquer um.
-- Trocar perfil/ativo/registro é bloqueado por trigger para quem não é admin (abaixo).
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.tem_perfil('admin'))
  with check (id = auth.uid() or public.tem_perfil('admin'));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.tem_perfil('admin'));
-- INSERT: só pelo trigger de signup (03_functions.sql), nunca direto pelo app.

-- Impede escalada de privilégio: só admin muda perfil, status ou registro profissional.
create or replace function public.profiles_protege_campos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() nulo = chamada do servidor (service_role / SQL Editor): liberado
  if auth.uid() is not null and not public.tem_perfil('admin') then
    if new.perfil is distinct from old.perfil
       or new.ativo is distinct from old.ativo
       or new.registro is distinct from old.registro
       or new.profissional_id is distinct from old.profissional_id then
      raise exception 'Somente o administrador pode alterar perfil, status ou registro do usuário'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_protege_campos
  before update on public.profiles
  for each row execute function public.profiles_protege_campos();


-- ---------- alas ----------
create policy alas_select on public.alas
  for select to authenticated using (public.meu_perfil() is not null);
create policy alas_admin on public.alas
  for all to authenticated
  using (public.tem_perfil('admin')) with check (public.tem_perfil('admin'));


-- ---------- leitos ----------
create policy leitos_select on public.leitos
  for select to authenticated using (public.meu_perfil() is not null);

create policy leitos_insert on public.leitos
  for insert to authenticated with check (public.tem_perfil('admin'));
create policy leitos_delete on public.leitos
  for delete to authenticated using (public.tem_perfil('admin'));

-- Médico e enfermeiro mudam o status do leito no fluxo (ocupar na triagem, liberar na alta).
-- A recepção não altera leitos.
create policy leitos_update on public.leitos
  for update to authenticated
  using (public.tem_perfil('admin', 'medico', 'enfermeiro'))
  with check (public.tem_perfil('admin', 'medico', 'enfermeiro'));

-- ...mas só o admin altera o cadastro (código, ala, tipo, equipamentos, planta...).
create or replace function public.leitos_protege_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.tem_perfil('admin') then
    if (to_jsonb(new) - array['status', 'status_desde', 'updated_at'])
       is distinct from (to_jsonb(old) - array['status', 'status_desde', 'updated_at']) then
      raise exception 'Somente o administrador pode alterar o cadastro do leito; equipe clínica altera apenas o status'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_leitos_protege_cadastro
  before update on public.leitos
  for each row execute function public.leitos_protege_cadastro();


-- ---------- profissionais ----------
create policy profissionais_select on public.profissionais
  for select to authenticated using (public.meu_perfil() is not null);
create policy profissionais_admin on public.profissionais
  for all to authenticated
  using (public.tem_perfil('admin')) with check (public.tem_perfil('admin'));


-- ---------- pacientes (dado pessoal sensível) ----------
-- O gestor (admin) não acessa a identidade dos pacientes: trabalha com as views anonimizadas.
create policy pacientes_select on public.pacientes
  for select to authenticated
  using (public.tem_perfil('recepcionista', 'enfermeiro', 'medico'));

create policy pacientes_insert on public.pacientes
  for insert to authenticated
  with check (public.tem_perfil('recepcionista', 'enfermeiro'));

create policy pacientes_update on public.pacientes
  for update to authenticated
  using (public.tem_perfil('recepcionista', 'enfermeiro', 'medico'))
  with check (public.tem_perfil('recepcionista', 'enfermeiro', 'medico'));
-- DELETE: ninguém pelo app. Prontuário não se apaga (guarda legal); só via servidor.


-- ---------- atendimentos ----------
-- Admin lê para a gestão operacional (mapa, fila), sem acesso à identidade (pacientes).
create policy atendimentos_select on public.atendimentos
  for select to authenticated
  using (public.meu_perfil() is not null);

create policy atendimentos_insert on public.atendimentos
  for insert to authenticated
  with check (
    public.tem_perfil('recepcionista', 'enfermeiro')
    and status = 'aguardando_triagem'
  );

-- Enfermeiro e médico conduzem o fluxo (triagem → atendimento → alta).
create policy atendimentos_update_clinico on public.atendimentos
  for update to authenticated
  using (public.tem_perfil('enfermeiro', 'medico'))
  with check (public.tem_perfil('enfermeiro', 'medico'));

-- A recepção só corrige a ficha enquanto o paciente ainda não foi triado.
create policy atendimentos_update_recepcao on public.atendimentos
  for update to authenticated
  using (public.tem_perfil('recepcionista') and status = 'aguardando_triagem')
  with check (public.tem_perfil('recepcionista') and status = 'aguardando_triagem');


-- ---------- sinais_vitais ----------
-- Registro clínico imutável: cria-se uma nova medição, nunca se edita a anterior.
create policy sinais_select on public.sinais_vitais
  for select to authenticated
  using (public.tem_perfil('recepcionista', 'enfermeiro', 'medico'));
create policy sinais_insert on public.sinais_vitais
  for insert to authenticated
  with check (public.tem_perfil('recepcionista', 'enfermeiro', 'medico'));


-- ---------- desfechos (prontuário) ----------
create policy desfechos_select on public.desfechos
  for select to authenticated
  using (public.tem_perfil('medico', 'enfermeiro'));
create policy desfechos_insert on public.desfechos
  for insert to authenticated
  with check (public.tem_perfil('medico'));


-- ---------- anexos ----------
create policy anexos_select on public.anexos
  for select to authenticated
  using (public.tem_perfil('medico', 'enfermeiro'));
create policy anexos_insert on public.anexos
  for insert to authenticated
  with check (public.tem_perfil('medico', 'enfermeiro'));


-- ---------- alertas ----------
-- Todos da equipe veem e resolvem alertas. Criação: o cron (servidor) e o RF09 (equipe clínica).
create policy alertas_select on public.alertas
  for select to authenticated using (public.meu_perfil() is not null);
create policy alertas_insert on public.alertas
  for insert to authenticated with check (public.tem_perfil('admin', 'medico', 'enfermeiro'));
create policy alertas_update on public.alertas
  for update to authenticated
  using (public.meu_perfil() is not null)
  with check (public.meu_perfil() is not null);


-- ---------- notificacoes_log e audit_log ----------
-- Somente leitura e somente para o admin. A escrita é feita por triggers/servidor.
create policy notificacoes_select on public.notificacoes_log
  for select to authenticated using (public.tem_perfil('admin'));
create policy audit_select on public.audit_log
  for select to authenticated using (public.tem_perfil('admin'));
