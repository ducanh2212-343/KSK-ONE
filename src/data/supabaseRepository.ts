import type {
  ChildDashboardData,
  ChildSlug,
  DashboardData,
  DisplayFeedItem,
  EventDraft,
  KskEvent,
  KskTask,
  Member,
  StarDraft,
  StarEntry,
  TaskDraft,
  TaskStatus,
} from '../domain/ksk'
import { supabase } from '../lib/supabase'
import type { KskRepository } from './kskRepository'

type Actor = { id: string; family_id: string; role: string; child_slug: ChildSlug | null }

function requireClient() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.')
  return supabase
}

async function currentActor(): Promise<Actor> {
  const client = requireClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Phiên đăng nhập không còn hiệu lực.')

  const { data, error } = await client
    .from('ksk_members')
    .select('id, family_id, role, child_slug')
    .eq('auth_user_id', authData.user.id)
    .single()

  if (error || !data) throw new Error('Tài khoản chưa được gắn với gia đình KSK One.')
  return data as Actor
}

async function parentActor() {
  const actor = await currentActor()
  if (actor.role !== 'parent') throw new Error('Màn hình này chỉ dành cho bố mẹ.')
  return actor
}

function raise(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export class SupabaseRepository implements KskRepository {
  readonly mode = 'supabase' as const

  async loadDashboard(): Promise<DashboardData> {
    const client = requireClient()
    await parentActor()

    const [membersResult, tasksResult, eventsResult, starsResult] = await Promise.all([
      client
        .from('ksk_members')
        .select('id, child_slug, display_name, full_name, color')
        .eq('role', 'child')
        .eq('is_active', true),
      client
        .from('ksk_tasks')
        .select('id, child_id, title, description, due_at, status, created_at, updated_at')
        .order('created_at', { ascending: false }),
      client
        .from('ksk_events')
        .select('id, child_id, title, description, location, starts_at, ends_at')
        .order('starts_at', { ascending: true }),
      client
        .from('ksk_stars')
        .select('id, child_id, task_id, amount, reason, created_at')
        .order('created_at', { ascending: false }),
    ])

    raise(membersResult.error)
    raise(tasksResult.error)
    raise(eventsResult.error)
    raise(starsResult.error)

    return {
      members: (membersResult.data ?? []).map(
        (row): Member => ({
          id: row.id,
          slug: row.child_slug as Member['slug'],
          displayName: row.display_name,
          fullName: row.full_name ?? row.display_name,
          color: row.color,
        }),
      ),
      tasks: (tasksResult.data ?? []).map(
        (row): KskTask => ({
          id: row.id,
          childId: row.child_id,
          title: row.title,
          description: row.description,
          dueAt: row.due_at,
          status: row.status as TaskStatus,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      ),
      events: (eventsResult.data ?? []).map(
        (row): KskEvent => ({
          id: row.id,
          childId: row.child_id,
          title: row.title,
          description: row.description,
          location: row.location,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
        }),
      ),
      stars: (starsResult.data ?? []).map(
        (row): StarEntry => ({
          id: row.id,
          childId: row.child_id,
          taskId: row.task_id,
          amount: row.amount,
          reason: row.reason,
          createdAt: row.created_at,
        }),
      ),
    }
  }

  async loadChild(slug: ChildSlug): Promise<ChildDashboardData> {
    const client = requireClient()
    const actor = await currentActor()
    if (actor.role !== 'child' || actor.child_slug !== slug) {
      throw new Error('Tài khoản này không có quyền xem màn hình của con đã chọn.')
    }

    const [memberResult, tasksResult, eventsResult, starsResult] = await Promise.all([
      client
        .from('ksk_members')
        .select('id, child_slug, display_name, full_name, color')
        .eq('id', actor.id)
        .single(),
      client
        .from('ksk_tasks')
        .select('id, child_id, title, description, due_at, status, created_at, updated_at')
        .order('due_at', { ascending: true, nullsFirst: false }),
      client
        .from('ksk_events')
        .select('id, child_id, title, description, location, starts_at, ends_at')
        .order('starts_at', { ascending: true }),
      client
        .from('ksk_stars')
        .select('id, child_id, task_id, amount, reason, created_at')
        .order('created_at', { ascending: false }),
    ])

    raise(memberResult.error)
    raise(tasksResult.error)
    raise(eventsResult.error)
    raise(starsResult.error)
    if (!memberResult.data) throw new Error('Không tìm thấy hồ sơ của con.')

    return {
      member: {
        id: memberResult.data.id,
        slug: memberResult.data.child_slug as ChildSlug,
        displayName: memberResult.data.display_name,
        fullName: memberResult.data.full_name ?? memberResult.data.display_name,
        color: memberResult.data.color,
      },
      tasks: (tasksResult.data ?? []).map(
        (row): KskTask => ({
          id: row.id,
          childId: row.child_id,
          title: row.title,
          description: row.description,
          dueAt: row.due_at,
          status: row.status as TaskStatus,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      ),
      events: (eventsResult.data ?? []).map(
        (row): KskEvent => ({
          id: row.id,
          childId: row.child_id,
          title: row.title,
          description: row.description,
          location: row.location,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
        }),
      ),
      stars: (starsResult.data ?? []).map(
        (row): StarEntry => ({
          id: row.id,
          childId: row.child_id,
          taskId: row.task_id,
          amount: row.amount,
          reason: row.reason,
          createdAt: row.created_at,
        }),
      ),
    }
  }

  async loadDisplay(): Promise<DisplayFeedItem[]> {
    const client = requireClient()
    const { data, error } = await client.rpc('ksk_get_display_feed')
    raise(error)
    const colors: Record<ChildSlug, string> = {
      khoai: '#f97316',
      san: '#0f9f78',
      kem: '#6d5bd0',
    }

    return (data ?? []).map((row: {
      member_id: string
      child_slug: string
      display_name: string
      current_activity: string | null
      current_starts_at: string | null
      current_ends_at: string | null
      next_activity: string | null
      next_starts_at: string | null
      unfinished_tasks: number | string
      generated_at: string
    }): DisplayFeedItem => {
      const slug = row.child_slug as ChildSlug
      return {
        memberId: row.member_id,
        slug,
        displayName: row.display_name,
        color: colors[slug],
        currentActivity: row.current_activity,
        currentStartsAt: row.current_starts_at,
        currentEndsAt: row.current_ends_at,
        nextActivity: row.next_activity,
        nextStartsAt: row.next_starts_at,
        unfinishedTasks: Number(row.unfinished_tasks),
        generatedAt: row.generated_at,
      }
    })
  }

  async saveTask(draft: TaskDraft) {
    const client = requireClient()
    const actor = await parentActor()
    const payload = {
      child_id: draft.childId,
      title: draft.title,
      description: draft.description,
      due_at: draft.dueAt,
    }

    if (draft.id) {
      const { error } = await client.from('ksk_tasks').update(payload).eq('id', draft.id)
      raise(error)
      return
    }

    const { error } = await client.from('ksk_tasks').insert({
      ...payload,
      family_id: actor.family_id,
      created_by: actor.id,
    })
    raise(error)
  }

  async saveEvent(draft: EventDraft) {
    const client = requireClient()
    const actor = await parentActor()
    const payload = {
      child_id: draft.childId,
      title: draft.title,
      description: draft.description,
      location: draft.location,
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
    }

    if (draft.id) {
      const { error } = await client.from('ksk_events').update(payload).eq('id', draft.id)
      raise(error)
      return
    }

    const { error } = await client.from('ksk_events').insert({
      ...payload,
      family_id: actor.family_id,
      created_by: actor.id,
    })
    raise(error)
  }

  async verifyTask(task: KskTask) {
    const client = requireClient()
    const actor = await parentActor()
    const { error } = await client
      .from('ksk_tasks')
      .update({
        status: 'verified',
        verified_by: actor.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', task.id)
    raise(error)
  }

  async cancelTask(taskId: string) {
    const client = requireClient()
    await parentActor()
    const { error } = await client
      .from('ksk_tasks')
      .update({ status: 'cancelled', verified_at: null, verified_by: null })
      .eq('id', taskId)
    raise(error)
  }

  async awardStars(draft: StarDraft) {
    const client = requireClient()
    const actor = await parentActor()
    const { error } = await client.from('ksk_stars').insert({
      family_id: actor.family_id,
      child_id: draft.childId,
      task_id: draft.taskId ?? null,
      amount: draft.amount,
      reason: draft.reason,
      awarded_by: actor.id,
    })
    raise(error)
  }

  async updateTaskStatus(
    taskId: string,
    status: Extract<TaskStatus, 'in_progress' | 'child_reported_done'>,
  ) {
    const client = requireClient()
    const actor = await currentActor()
    if (actor.role !== 'child') throw new Error('Chỉ tài khoản của con mới được cập nhật bước thực hiện.')

    const { data, error } = await client
      .from('ksk_tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('child_id', actor.id)
      .select('id')
      .single()
    raise(error)
    if (!data) throw new Error('Nhiệm vụ không được cập nhật. Vui lòng tải lại trang.')
  }

  subscribe(onChange: () => void) {
    const client = requireClient()
    const channel = client
      .channel('ksk-parent-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ksk_tasks' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ksk_events' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ksk_stars' }, onChange)
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }
}

