-- KSK One - Giai doan 1
-- Toan bo bang du lieu cua module co tien to ksk_ va bat RLS.

create type public.ksk_member_role as enum ('parent', 'child', 'display');
create type public.ksk_task_status as enum (
  'todo',
  'in_progress',
  'child_reported_done',
  'verified',
  'cancelled'
);

create schema if not exists ksk_private;
revoke all on schema ksk_private from public, anon, authenticated;

create table public.ksk_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  role public.ksk_member_role not null,
  child_slug text,
  display_name text not null check (char_length(display_name) between 1 and 60),
  full_name text check (full_name is null or char_length(full_name) between 1 and 120),
  color text not null default '#2563eb',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ksk_members_child_slug_check check (
    (role = 'child' and child_slug in ('khoai', 'san', 'kem'))
    or (role <> 'child' and child_slug is null)
  ),
  unique (family_id, child_slug)
);

create table public.ksk_tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null references public.ksk_members (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  due_at timestamptz,
  status public.ksk_task_status not null default 'todo',
  created_by uuid not null references public.ksk_members (id) on delete restrict,
  verified_by uuid references public.ksk_members (id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ksk_tasks_verified_check check (
    (status = 'verified' and verified_by is not null and verified_at is not null)
    or (status <> 'verified' and verified_by is null and verified_at is null)
  )
);

create table public.ksk_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null references public.ksk_members (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references public.ksk_members (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ksk_events_time_check check (ends_at > starts_at)
);

create table public.ksk_stars (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null references public.ksk_members (id) on delete restrict,
  task_id uuid references public.ksk_tasks (id) on delete set null,
  amount smallint not null check (amount between 1 and 100),
  reason text not null check (char_length(reason) between 1 and 240),
  awarded_by uuid not null references public.ksk_members (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.ksk_inbox (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid references public.ksk_members (id) on delete restrict,
  kind text not null default 'note' check (kind in ('note', 'task', 'event')),
  title text not null check (char_length(title) between 1 and 160),
  content text not null default '',
  processed_at timestamptz,
  created_by uuid not null references public.ksk_members (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index ksk_members_auth_user_id_idx on public.ksk_members (auth_user_id);
create index ksk_members_family_role_idx on public.ksk_members (family_id, role);
create index ksk_tasks_family_child_status_idx on public.ksk_tasks (family_id, child_id, status);
create index ksk_tasks_due_at_idx on public.ksk_tasks (due_at) where due_at is not null;
create index ksk_events_family_child_starts_idx on public.ksk_events (family_id, child_id, starts_at);
create index ksk_stars_family_child_created_idx on public.ksk_stars (family_id, child_id, created_at desc);
create index ksk_inbox_family_processed_idx on public.ksk_inbox (family_id, processed_at);

create function ksk_private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.ksk_members as m
  where (select auth.uid()) is not null
    and m.auth_user_id = (select auth.uid())
    and m.is_active
  limit 1
$$;

create function ksk_private.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.family_id
  from public.ksk_members as m
  where (select auth.uid()) is not null
    and m.auth_user_id = (select auth.uid())
    and m.is_active
  limit 1
$$;

create function ksk_private.current_role()
returns public.ksk_member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.ksk_members as m
  where (select auth.uid()) is not null
    and m.auth_user_id = (select auth.uid())
    and m.is_active
  limit 1
$$;

create function ksk_private.is_parent_of(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.ksk_members as m
      where m.auth_user_id = (select auth.uid())
        and m.family_id = target_family_id
        and m.role = 'parent'
        and m.is_active
    ),
    false
  )
$$;

revoke all on function ksk_private.current_member_id() from public, anon;
revoke all on function ksk_private.current_family_id() from public, anon;
revoke all on function ksk_private.current_role() from public, anon;
revoke all on function ksk_private.is_parent_of(uuid) from public, anon;
grant usage on schema ksk_private to authenticated;
grant execute on function ksk_private.current_member_id() to authenticated;
grant execute on function ksk_private.current_family_id() to authenticated;
grant execute on function ksk_private.current_role() to authenticated;
grant execute on function ksk_private.is_parent_of(uuid) to authenticated;

create function ksk_private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function ksk_private.guard_child_task_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_role public.ksk_member_role := ksk_private.current_role();
  actor_id uuid := ksk_private.current_member_id();
begin
  if actor_role = 'child' then
    if old.child_id <> actor_id then
      raise exception 'KSK_CHILD_TASK_NOT_OWNED' using errcode = '42501';
    end if;

    if old.status in ('verified', 'cancelled')
      or new.status not in ('in_progress', 'child_reported_done') then
      raise exception 'KSK_CHILD_STATUS_NOT_ALLOWED' using errcode = '42501';
    end if;

    if (to_jsonb(new) - array['status', 'updated_at']::text[])
      is distinct from
      (to_jsonb(old) - array['status', 'updated_at']::text[]) then
      raise exception 'KSK_CHILD_CAN_ONLY_CHANGE_STATUS' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function ksk_private.touch_updated_at() from public, anon;
revoke all on function ksk_private.guard_child_task_update() from public, anon;
grant execute on function ksk_private.touch_updated_at() to authenticated;
grant execute on function ksk_private.guard_child_task_update() to authenticated;

create trigger ksk_members_touch_updated_at
before update on public.ksk_members
for each row execute function ksk_private.touch_updated_at();

create trigger ksk_tasks_guard_child_update
before update on public.ksk_tasks
for each row execute function ksk_private.guard_child_task_update();

create trigger ksk_tasks_touch_updated_at
before update on public.ksk_tasks
for each row execute function ksk_private.touch_updated_at();

create trigger ksk_events_touch_updated_at
before update on public.ksk_events
for each row execute function ksk_private.touch_updated_at();

alter table public.ksk_members enable row level security;
alter table public.ksk_tasks enable row level security;
alter table public.ksk_events enable row level security;
alter table public.ksk_stars enable row level security;
alter table public.ksk_inbox enable row level security;

revoke all on table public.ksk_members from anon;
revoke all on table public.ksk_tasks from anon;
revoke all on table public.ksk_events from anon;
revoke all on table public.ksk_stars from anon;
revoke all on table public.ksk_inbox from anon;

grant select, insert, update, delete on table public.ksk_members to authenticated;
grant select, insert, update, delete on table public.ksk_tasks to authenticated;
grant select, insert, update, delete on table public.ksk_events to authenticated;
grant select, insert, update, delete on table public.ksk_stars to authenticated;
grant select, insert, update, delete on table public.ksk_inbox to authenticated;

create policy ksk_members_select
on public.ksk_members for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    id = (select ksk_private.current_member_id())
    or (select ksk_private.is_parent_of(family_id))
  )
);

create policy ksk_members_parent_insert
on public.ksk_members for insert
to authenticated
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_members_parent_update
on public.ksk_members for update
to authenticated
using ((select ksk_private.is_parent_of(family_id)))
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_members_parent_delete
on public.ksk_members for delete
to authenticated
using ((select ksk_private.is_parent_of(family_id)));

create policy ksk_tasks_select
on public.ksk_tasks for select
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
  )
);

create policy ksk_tasks_parent_insert
on public.ksk_tasks for insert
to authenticated
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_tasks_update
on public.ksk_tasks for update
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
    and status not in ('verified', 'cancelled')
  )
)
with check (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
    and status in ('in_progress', 'child_reported_done')
  )
);

create policy ksk_tasks_parent_delete
on public.ksk_tasks for delete
to authenticated
using ((select ksk_private.is_parent_of(family_id)));

create policy ksk_events_select
on public.ksk_events for select
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
  )
);

create policy ksk_events_parent_insert
on public.ksk_events for insert
to authenticated
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_events_parent_update
on public.ksk_events for update
to authenticated
using ((select ksk_private.is_parent_of(family_id)))
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_events_parent_delete
on public.ksk_events for delete
to authenticated
using ((select ksk_private.is_parent_of(family_id)));

create policy ksk_stars_select
on public.ksk_stars for select
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
  )
);

create policy ksk_stars_parent_insert
on public.ksk_stars for insert
to authenticated
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_stars_parent_update
on public.ksk_stars for update
to authenticated
using ((select ksk_private.is_parent_of(family_id)))
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_stars_parent_delete
on public.ksk_stars for delete
to authenticated
using ((select ksk_private.is_parent_of(family_id)));

create policy ksk_inbox_select
on public.ksk_inbox for select
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and child_id = (select ksk_private.current_member_id())
  )
);

create policy ksk_inbox_parent_insert
on public.ksk_inbox for insert
to authenticated
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_inbox_parent_update
on public.ksk_inbox for update
to authenticated
using ((select ksk_private.is_parent_of(family_id)))
with check ((select ksk_private.is_parent_of(family_id)));

create policy ksk_inbox_parent_delete
on public.ksk_inbox for delete
to authenticated
using ((select ksk_private.is_parent_of(family_id)));

-- TV khong duoc doc truc tiep cac bang goc. Ham nay chi tra ve truong da loai bo
-- mo ta, dia diem, ho ten day du va thong tin dang nhap.
create function ksk_private.get_display_feed()
returns table (
  member_id uuid,
  child_slug text,
  display_name text,
  current_activity text,
  current_starts_at timestamptz,
  current_ends_at timestamptz,
  next_activity text,
  next_starts_at timestamptz,
  unfinished_tasks bigint,
  generated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_family_id uuid;
begin
  if (select auth.uid()) is null or ksk_private.current_role() <> 'display' then
    raise exception 'KSK_DISPLAY_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  viewer_family_id := ksk_private.current_family_id();

  return query
  select
    child.id,
    child.child_slug,
    child.display_name,
    current_event.title,
    current_event.starts_at,
    current_event.ends_at,
    next_event.title,
    next_event.starts_at,
    coalesce(task_count.unfinished_tasks, 0),
    now()
  from public.ksk_members as child
  left join lateral (
    select e.title, e.starts_at, e.ends_at
    from public.ksk_events as e
    where e.family_id = viewer_family_id
      and e.child_id = child.id
      and now() >= e.starts_at
      and now() < e.ends_at
    order by e.starts_at desc
    limit 1
  ) as current_event on true
  left join lateral (
    select e.title, e.starts_at
    from public.ksk_events as e
    where e.family_id = viewer_family_id
      and e.child_id = child.id
      and e.starts_at > now()
    order by e.starts_at
    limit 1
  ) as next_event on true
  left join lateral (
    select count(*) as unfinished_tasks
    from public.ksk_tasks as t
    where t.family_id = viewer_family_id
      and t.child_id = child.id
      and t.status not in ('verified', 'cancelled')
  ) as task_count on true
  where child.family_id = viewer_family_id
    and child.role = 'child'
    and child.is_active
  order by case child.child_slug when 'khoai' then 1 when 'san' then 2 else 3 end;
end;
$$;

create function public.ksk_get_display_feed()
returns table (
  member_id uuid,
  child_slug text,
  display_name text,
  current_activity text,
  current_starts_at timestamptz,
  current_ends_at timestamptz,
  next_activity text,
  next_starts_at timestamptz,
  unfinished_tasks bigint,
  generated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from ksk_private.get_display_feed()
$$;

revoke all on function ksk_private.get_display_feed() from public, anon;
revoke all on function public.ksk_get_display_feed() from public, anon;
grant execute on function ksk_private.get_display_feed() to authenticated;
grant execute on function public.ksk_get_display_feed() to authenticated;

alter publication supabase_realtime add table public.ksk_tasks;
alter publication supabase_realtime add table public.ksk_events;
alter publication supabase_realtime add table public.ksk_stars;
