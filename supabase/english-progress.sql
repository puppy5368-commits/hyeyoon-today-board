-- Run manually after anonymous-family.sql. Adds only the English V2 table.
begin;
create table if not exists public.english_progress (
  user_id uuid not null references auth.users(id) on delete restrict,
  session_key text not null check (session_key ~ '^week:([1-9]|1[0-2]):[ABC]$'),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  revision bigint not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_key)
);
create or replace function public.heeyoon_english_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.revision <> OLD.revision + 1 then raise exception 'English revision conflict'; end if;
    if NEW.user_id <> OLD.user_id or NEW.session_key <> OLD.session_key then raise exception 'English identity is immutable'; end if;
    NEW.created_at := OLD.created_at;
  elsif NEW.revision <> 1 then raise exception 'English initial revision must be 1';
  end if;
  NEW.updated_at := now(); return NEW;
end;
$$;
drop trigger if exists english_progress_revision on public.english_progress;
create trigger english_progress_revision before insert or update on public.english_progress
for each row execute function public.heeyoon_english_revision();
alter table public.english_progress enable row level security;
revoke all on public.english_progress from public, anon, authenticated;
grant select, insert, update on public.english_progress to authenticated;
drop policy if exists english_family_fence on public.english_progress;
create policy english_family_fence on public.english_progress as restrictive for all to authenticated
using (user_id = (select public.heeyoon_family_owner())) with check (user_id = (select public.heeyoon_family_owner()));
drop policy if exists english_family_read on public.english_progress;
create policy english_family_read on public.english_progress for select to authenticated using (user_id = (select public.heeyoon_family_owner()));
drop policy if exists english_family_insert on public.english_progress;
create policy english_family_insert on public.english_progress for insert to authenticated with check (user_id = (select public.heeyoon_family_owner()));
drop policy if exists english_family_update on public.english_progress;
create policy english_family_update on public.english_progress for update to authenticated using (user_id = (select public.heeyoon_family_owner())) with check (user_id = (select public.heeyoon_family_owner()));
commit;
