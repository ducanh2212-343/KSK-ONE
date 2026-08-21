import type {
  ChildDashboardData,
  ChildSlug,
  DashboardData,
  DisplayFeedItem,
  EventDraft,
  KskTask,
  StarDraft,
  TaskDraft,
  TaskStatus,
} from '../domain/ksk'

export interface KskRepository {
  readonly mode: 'demo' | 'supabase'
  loadDashboard(): Promise<DashboardData>
  loadChild(slug: ChildSlug): Promise<ChildDashboardData>
  loadDisplay(): Promise<DisplayFeedItem[]>
  saveTask(draft: TaskDraft): Promise<void>
  saveEvent(draft: EventDraft): Promise<void>
  updateTaskStatus(taskId: string, status: Extract<TaskStatus, 'in_progress' | 'child_reported_done'>): Promise<void>
  verifyTask(task: KskTask): Promise<void>
  cancelTask(taskId: string): Promise<void>
  awardStars(draft: StarDraft): Promise<void>
  subscribe(onChange: () => void): () => void
}

