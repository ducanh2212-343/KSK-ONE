import type {
  DashboardData,
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

type Actor = { id: string; family_id: string; role: string }

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
    .select('id, family_id, role')
    .eq('auth_user_id', authData.user.id)
    .single()

  if (error || !data) throw new Error('Tài khoản chưa được gắn với gia đình KSK One.')
  if (data.role !== 'parent') throw new Error('Màn hình này chỉ dành cho bố mẹ.')
  return data as Actor
}

function raise(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export class SupabaseRepository implements KskRepository {
  readonly mode = 'supabase' as const

  async loadDashboard(): Promise<DashboardData> {
    const client = requireClient()
    await currentActor()

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

  async saveTask(draft: TaskDraft) {
    const client = requireClient()
    const actor = await currentActor()
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
    const actor = await currentActor()
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
    const actor = await currentActor()
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
    await currentActor()
    const { error } = await client
      .from('ksk_tasks')
      .update({ status: 'cancelled', verified_at: null, verified_by: null })
      .eq('id', taskId)
    raise(error)
  }

  async awardStars(draft: StarDraft) {
    const client = requireClient()
    const actor = await currentActor()
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

