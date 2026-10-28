-- Additive migration. Never updates or deletes existing task/subject records.
create table public.math_assignments (
 user_id uuid not null references auth.users(id) on delete restrict,
 assignment_id text not null check (assignment_id in ('didimdol-4-2-u1-p6-9','didimdol-4-2-u1-p10-13','didimdol-4-2-u1-p14-17','didimdol-4-2-u1-p18-21','didimdol-4-2-u1-p22-24','didimdol-4-2-u1-p25-26','didimdol-4-2-u1-p27-28','didimdol-4-2-u1-p29-31','didimdol-4-2-u1-p32-34','didimdol-4-2-u1-p36-39','didimdol-4-2-u2-p40-43','didimdol-4-2-u2-p44-45','didimdol-4-2-u2-p46-48','didimdol-4-2-u2-p49-51','didimdol-4-2-u2-p52-55','didimdol-4-2-u2-p56-58','didimdol-4-2-u2-p59-61','didimdol-4-2-u3-p64-67','didimdol-4-2-u3-p68-71','didimdol-4-2-u3-p72-75','didimdol-4-2-u3-p76-77','didimdol-4-2-u3-p78-79','didimdol-4-2-u3-p80-81','didimdol-4-2-u3-p82-83','didimdol-4-2-u3-p84-85','didimdol-4-2-u3-p86-88','didimdol-4-2-u3-p89-90','didimdol-4-2-u3-p91-92','didimdol-4-2-u3-p93-95','didimdol-4-2-u3-p96-98','didimdol-4-2-u4-p100-103','didimdol-4-2-u4-p104-107','didimdol-4-2-u4-p108-111','didimdol-4-2-u4-p112-113','didimdol-4-2-u4-p114-115','didimdol-4-2-u4-p116-117','didimdol-4-2-u4-p118-119','didimdol-4-2-u4-p120-121','didimdol-4-2-u4-p122-123','didimdol-4-2-u4-p124-125','didimdol-4-2-u4-p126-128','didimdol-4-2-u4-p129-131','didimdol-4-2-u5-p134-135','didimdol-4-2-u5-p136-137','didimdol-4-2-u5-p138-139','didimdol-4-2-u5-p140-142','didimdol-4-2-u5-p143-144','didimdol-4-2-u5-p145-147','didimdol-4-2-u5-p148-149','didimdol-4-2-u5-p150-152','didimdol-4-2-u5-p153-155','didimdol-4-2-u5-p156-158','didimdol-4-2-u6-p160-163','didimdol-4-2-u6-p164-165','didimdol-4-2-u6-p166-168','didimdol-4-2-u6-p169-171','didimdol-4-2-u6-p172-174','didimdol-4-2-u6-p175-177','didimdol-4-2-u6-p178-180','didimdol-4-2-u6-p181-183')),
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
('didimdol-4-2-u1-p6-9',DATE '2026-10-28'),
('didimdol-4-2-u1-p10-13',NULL),
('didimdol-4-2-u1-p14-17',NULL),
('didimdol-4-2-u1-p18-21',NULL),
('didimdol-4-2-u1-p22-24',NULL),
('didimdol-4-2-u1-p25-26',NULL),
('didimdol-4-2-u1-p27-28',NULL),
('didimdol-4-2-u1-p29-31',NULL),
('didimdol-4-2-u1-p32-34',NULL),
('didimdol-4-2-u1-p36-39',NULL),
('didimdol-4-2-u2-p40-43',NULL),
('didimdol-4-2-u2-p44-45',NULL),
('didimdol-4-2-u2-p46-48',NULL),
('didimdol-4-2-u2-p49-51',NULL),
('didimdol-4-2-u2-p52-55',NULL),
('didimdol-4-2-u2-p56-58',NULL),
('didimdol-4-2-u2-p59-61',NULL),
('didimdol-4-2-u3-p64-67',NULL),
('didimdol-4-2-u3-p68-71',NULL),
('didimdol-4-2-u3-p72-75',NULL),
('didimdol-4-2-u3-p76-77',NULL),
('didimdol-4-2-u3-p78-79',NULL),
('didimdol-4-2-u3-p80-81',NULL),
('didimdol-4-2-u3-p82-83',NULL),
('didimdol-4-2-u3-p84-85',NULL),
('didimdol-4-2-u3-p86-88',NULL),
('didimdol-4-2-u3-p89-90',NULL),
('didimdol-4-2-u3-p91-92',NULL),
('didimdol-4-2-u3-p93-95',NULL),
('didimdol-4-2-u3-p96-98',NULL),
('didimdol-4-2-u4-p100-103',DATE '2026-10-19'),
('didimdol-4-2-u4-p104-107',DATE '2026-10-21'),
('didimdol-4-2-u4-p108-111',DATE '2026-10-23'),
('didimdol-4-2-u4-p112-113',DATE '2026-10-26'),
('didimdol-4-2-u4-p114-115',NULL),
('didimdol-4-2-u4-p116-117',DATE '2026-10-30'),
('didimdol-4-2-u4-p118-119',DATE '2026-11-02'),
('didimdol-4-2-u4-p120-121',DATE '2026-11-04'),
('didimdol-4-2-u4-p122-123',DATE '2026-11-06'),
('didimdol-4-2-u4-p124-125',DATE '2026-11-09'),
('didimdol-4-2-u4-p126-128',DATE '2026-11-11'),
('didimdol-4-2-u4-p129-131',DATE '2026-11-13'),
('didimdol-4-2-u5-p134-135',NULL),
('didimdol-4-2-u5-p136-137',NULL),
('didimdol-4-2-u5-p138-139',NULL),
('didimdol-4-2-u5-p140-142',NULL),
('didimdol-4-2-u5-p143-144',NULL),
('didimdol-4-2-u5-p145-147',NULL),
('didimdol-4-2-u5-p148-149',NULL),
('didimdol-4-2-u5-p150-152',NULL),
('didimdol-4-2-u5-p153-155',NULL),
('didimdol-4-2-u5-p156-158',NULL),
('didimdol-4-2-u6-p160-163',NULL),
('didimdol-4-2-u6-p164-165',NULL),
('didimdol-4-2-u6-p166-168',NULL),
('didimdol-4-2-u6-p169-171',NULL),
('didimdol-4-2-u6-p172-174',NULL),
('didimdol-4-2-u6-p175-177',NULL),
('didimdol-4-2-u6-p178-180',NULL),
('didimdol-4-2-u6-p181-183',NULL)
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
