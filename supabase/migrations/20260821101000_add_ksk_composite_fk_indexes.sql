-- KSK One - Chi muc bao phu cac khoa ngoai ghep (family_id, member/task id).

create index ksk_tasks_family_created_by_idx
  on public.ksk_tasks (family_id, created_by);

create index ksk_tasks_family_verified_by_idx
  on public.ksk_tasks (family_id, verified_by);

create index ksk_events_family_created_by_idx
  on public.ksk_events (family_id, created_by);

create index ksk_stars_family_task_idx
  on public.ksk_stars (family_id, task_id);

create index ksk_stars_family_awarded_by_idx
  on public.ksk_stars (family_id, awarded_by);

create index ksk_inbox_family_child_idx
  on public.ksk_inbox (family_id, child_id);

create index ksk_inbox_family_created_by_idx
  on public.ksk_inbox (family_id, created_by);
