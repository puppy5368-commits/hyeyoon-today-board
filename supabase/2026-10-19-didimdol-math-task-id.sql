-- Apply ONCE in the existing Supabase SQL Editor BEFORE deploying the
-- Didimdol math board update. No existing task rows are changed or deleted.
-- Math reuses task_records.start_at as "problem solving + grading checked"
-- and task_records.done_at as "same-day error review checked".
begin;

alter table public.task_records
  drop constraint if exists task_records_task_id_check;
alter table public.task_records
  add constraint task_records_task_id_check check (task_id in (
    'gumonKorean', 'gumonHanja', 'qt', 'awana', 'reading',
    'history', 'english', 'englishVideo', 'literacy', 'didimdolMath'
  ));

alter table public.task_schedules
  drop constraint if exists task_schedules_task_id_check;
alter table public.task_schedules
  add constraint task_schedules_task_id_check check (task_id in (
    'gumonKorean', 'gumonHanja', 'qt', 'awana', 'reading',
    'history', 'english', 'englishVideo', 'literacy', 'didimdolMath'
  ));

commit;
