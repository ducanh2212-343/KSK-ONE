import type {
  DashboardData,
  EventDraft,
  KskTask,
  StarDraft,
  TaskDraft,
} from '../domain/ksk'

export interface KskRepository {
  readonly mode: 'demo' | 'supabase'
  loadDashboard(): Promise<DashboardData>
  saveTask(draft: TaskDraft): Promise<void>
  saveEvent(draft: EventDraft): Promise<void>
  verifyTask(task: KskTask): Promise<void>
  cancelTask(taskId: string): Promise<void>
  awardStars(draft: StarDraft): Promise<void>
  subscribe(onChange: () => void): () => void
}

