-- 아래 selected_owner의 값 한 곳만 Authentication > Users의 가족 계정 UID로 바꾸세요.
-- 단일 가족용 공개 공유: 익명 인증한 방문자는 지정 가족의 보드를 읽고 수정할 수 있습니다.
-- Anonymous Sign-Ins는 Supabase Authentication 설정에서 별도로 활성화하세요.
begin;

do $migration$
declare
  selected_owner uuid := '00000000-0000-0000-0000-000000000000'; -- 여기에 가족 계정 UID 입력
  saved_owner uuid;
  t text;
begin
  if selected_owner is null then
    raise exception 'Enter the family account UID in selected_owner before running this SQL.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = selected_owner and not coalesce(is_anonymous, false)
  ) then
    raise exception 'selected_owner must be an existing permanent family account in Authentication Users.';
  end if;

-- Freeze writes while selecting the canonical owner. Existing rows stay intact.
lock table public.board_preferences, public.task_schedules,
  public.daily_plans, public.task_records in share row exclusive mode;

create schema if not exists heeyoon_private;
revoke all on schema heeyoon_private from public, anon, authenticated;
create table if not exists heeyoon_private.family_board (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null references auth.users(id) on delete restrict
);
revoke all on heeyoon_private.family_board from public, anon, authenticated;
alter table heeyoon_private.family_board enable row level security;


-- 기존 행의 개수와 관계없이 명시한 UID를 사용합니다. 자동 추론은 하지 않습니다.
select owner_id into saved_owner
from heeyoon_private.family_board where singleton for update;
if saved_owner is not null and saved_owner <> selected_owner then
  raise exception 'Family owner is already fixed to another UID. Refusing to switch data sets.';
end if;
insert into heeyoon_private.family_board(singleton, owner_id)
values (true, selected_owner)
on conflict (singleton) do nothing;

-- 지정 UID의 기존 행은 그대로 공유됩니다. 빈 테이블도 정상 동작합니다.
-- 다른 user_id의 행은 보존하되 공유하지 않습니다. 소유자 강제 변경/자동 병합은 하지 않습니다.
-- 모든 DDL/권한 변경은 이 트랜잭션 안에서 수행되어 실패 시 일부만 적용되지 않습니다.
-- This function returns only the fixed UUID. It cannot read records, choose an
-- owner from user metadata, or mutate the mapping. The private table is not exposed.
create or replace function public.heeyoon_family_owner()
returns uuid language sql stable security definer set search_path = ''
as $owner$ select owner_id from heeyoon_private.family_board where singleton $owner$;
revoke all on function public.heeyoon_family_owner() from public, anon;
grant execute on function public.heeyoon_family_owner() to authenticated;

  foreach t in array array['board_preferences','task_schedules','daily_plans','task_records'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
    -- Preserve original owner policies. Restrictive fence prevents their OR
    -- semantics from exposing another owner. DELETE is independently forbidden.
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='heeyoon_family_fence') then
      execute format('create policy heeyoon_family_fence on public.%I as restrictive for all to authenticated using (user_id = (select public.heeyoon_family_owner())) with check (user_id = (select public.heeyoon_family_owner()))',t);
      execute format('create policy heeyoon_family_read on public.%I for select to authenticated using (user_id = (select public.heeyoon_family_owner()))',t);
      execute format('create policy heeyoon_family_insert on public.%I for insert to authenticated with check (user_id = (select public.heeyoon_family_owner()))',t);
      execute format('create policy heeyoon_family_update on public.%I for update to authenticated using (user_id = (select public.heeyoon_family_owner())) with check (user_id = (select public.heeyoon_family_owner()))',t);
      execute format('create policy heeyoon_family_no_delete on public.%I as restrictive for delete to authenticated using (false)',t);
    end if;
  end loop;
end $migration$;

commit;
