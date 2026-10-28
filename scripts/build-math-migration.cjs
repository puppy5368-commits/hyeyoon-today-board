const fs=require('fs');const {items}=require('../math-schedule.js');
const values=items.map(x=>`('${x.id}',${x.date?"DATE '"+x.date+"'":'NULL'})`).join(',\n');
const sql=`-- Additive migration. Never updates or deletes existing task/subject records.
create table public.math_assignments (
 user_id uuid not null references auth.users(id) on delete restrict,
 assignment_id text not null check (assignment_id in (${items.map(x=>"'"+x.id+"'").join(',')})),
 assigned_date date,
 start_at timestamptz,
 done_at timestamptz,
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id,assignment_id),
 check (done_at is null or start_at is not null)
);
alter table public.math_assignments enable row level security;
revoke all on public.math_assignments from public, anon, authenticated;
grant select,insert,update on public.math_assignments to authenticated;
create policy family_read on public.math_assignments for select to authenticated using (user_id=(select public.heeyoon_family_owner()));
create policy family_insert on public.math_assignments for insert to authenticated with check (user_id=(select public.heeyoon_family_owner()));
create policy family_update on public.math_assignments for update to authenticated using (user_id=(select public.heeyoon_family_owner())) with check (user_id=(select public.heeyoon_family_owner()));
create trigger learning_guard_write_trigger before insert or update on public.math_assignments for each row execute function public.learning_guard_write();
create function public.math_guard_assignment_id() returns trigger language plpgsql set search_path='' as $guard$
begin
 if new.assignment_id is distinct from old.assignment_id then raise exception 'Assignment ID is immutable' using errcode='23514'; end if;
 return new;
end;
$guard$;
revoke all on function public.math_guard_assignment_id() from public, anon, authenticated;
create trigger math_guard_id before update on public.math_assignments for each row execute function public.math_guard_assignment_id();
-- Explicit canonical family only. Repeat-safe inserts; no overwrite of newer edits.
with catalog(assignment_id,assigned_date) as (values
${values}
)
insert into public.math_assignments(user_id,assignment_id,assigned_date,start_at,done_at)
select public.heeyoon_family_owner(),c.assignment_id,c.assigned_date,
 coalesce(r.start_at,r.done_at),r.done_at
from catalog c
left join public.task_records r on r.user_id=public.heeyoon_family_owner()
 and r.task_id='didimdolMath' and r.record_date=c.assigned_date
 and c.assigned_date < date '2026-10-28'
where public.heeyoon_family_owner() is not null
on conflict (user_id,assignment_id) do nothing;
-- The old 2026-10-28 task_records row remains untouched as an archive.
`;
fs.writeFileSync('supabase/migrations/20261028113741_math_assignments_v2.sql',sql);
