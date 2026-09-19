-- Reproducible schema record only.
-- The production project already has this change: do NOT run this file there
-- as part of this repository update. It is retained for a fresh environment
-- or for schema reconstruction.
begin;

alter table public.task_records
  drop constraint if exists task_records_task_id_check;
alter table public.task_records
  add constraint task_records_task_id_check check (task_id in (
    'gumonKorean', 'gumonHanja', 'qt', 'awana', 'reading',
    'history', 'english', 'englishVideo', 'literacy'
  ));

alter table public.task_schedules
  drop constraint if exists task_schedules_task_id_check;
alter table public.task_schedules
  add constraint task_schedules_task_id_check check (task_id in (
    'gumonKorean', 'gumonHanja', 'qt', 'awana', 'reading',
    'history', 'english', 'englishVideo', 'literacy'
  ));

commit;
