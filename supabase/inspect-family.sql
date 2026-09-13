-- Read-only preflight. Run in the Supabase SQL editor before the migration.
select 'board_preferences' as table_name, user_id, count(*) as rows from public.board_preferences group by user_id
union all select 'task_schedules', user_id, count(*) from public.task_schedules group by user_id
union all select 'daily_plans', user_id, count(*) from public.daily_plans group by user_id
union all select 'task_records', user_id, count(*) from public.task_records group by user_id;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
and tablename in ('board_preferences','task_schedules','daily_plans','task_records');

select c.relname, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('board_preferences','task_schedules','daily_plans','task_records');

select c.relname, t.tgname, pg_get_triggerdef(t.oid), pg_get_functiondef(t.tgfoid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and n.nspname='public'
and c.relname in ('board_preferences','task_schedules','daily_plans','task_records');
