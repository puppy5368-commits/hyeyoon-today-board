-- Literacy V2 family progress sync.
-- Applied to the heeyoon-learning Supabase project.
begin;
create table if not exists public.literacy_progress (
  user_id uuid not null references auth.users(id) on delete restrict,
  session_key text not null check (session_key ~ '^week:([1-9]|1[0-2]):[AB]$'),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  revision bigint not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_key)
);
create or replace function public.heeyoon_literacy_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.revision <> OLD.revision + 1 then raise exception 'Literacy revision conflict'; end if;
    if NEW.user_id <> OLD.user_id or NEW.session_key <> OLD.session_key then raise exception 'Literacy identity is immutable'; end if;
    NEW.created_at := OLD.created_at;
  elsif NEW.revision <> 1 then
    raise exception 'Literacy initial revision must be 1';
  end if;
  NEW.updated_at := now(); return NEW;
end;
$$;
drop trigger if exists literacy_progress_revision on public.literacy_progress;
create trigger literacy_progress_revision before insert or update on public.literacy_progress
for each row execute function public.heeyoon_literacy_revision();
alter table public.literacy_progress enable row level security;
revoke all on public.literacy_progress from public, anon, authenticated;
grant select, insert, update on public.literacy_progress to authenticated;
drop policy if exists literacy_family_fence on public.literacy_progress;
create policy literacy_family_fence on public.literacy_progress as restrictive for all to authenticated
using (user_id = (select public.heeyoon_family_owner()))
with check (user_id = (select public.heeyoon_family_owner()));
drop policy if exists literacy_family_read on public.literacy_progress;
create policy literacy_family_read on public.literacy_progress for select to authenticated
using (user_id = (select public.heeyoon_family_owner()));
drop policy if exists literacy_family_insert on public.literacy_progress;
create policy literacy_family_insert on public.literacy_progress for insert to authenticated
with check (user_id = (select public.heeyoon_family_owner()));
drop policy if exists literacy_family_update on public.literacy_progress;
create policy literacy_family_update on public.literacy_progress for update to authenticated
using (user_id = (select public.heeyoon_family_owner()))
with check (user_id = (select public.heeyoon_family_owner()));
commit;
