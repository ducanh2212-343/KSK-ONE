export type ChildSlug = 'khoai' | 'san' | 'kem'

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'child_reported_done'
  | 'verified'
  | 'cancelled'

export interface Member {
  id: string
  slug: ChildSlug
  displayName: string
  fullName: string
  color: string
}

export interface KskTask {
  id: string
  childId: string
  title: string
  description: string
  dueAt: string | null
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface KskEvent {
  id: string
  childId: string
  title: string
  description: string
  location: string
  startsAt: string
  endsAt: string
}

export interface StarEntry {
  id: string
  childId: string
  taskId: string | null
  amount: number
  reason: string
  createdAt: string
}

export interface DashboardData {
  members: Member[]
  tasks: KskTask[]
  events: KskEvent[]
  stars: StarEntry[]
}

export interface TaskDraft {
  id?: string
  childId: string
  title: string
  description: string
  dueAt: string | null
}

export interface EventDraft {
  id?: string
  childId: string
  title: string
  description: string
  location: string
  startsAt: string
  endsAt: string
}

export interface StarDraft {
  childId: string
  taskId?: string | null
  amount: number
  reason: string
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  child_reported_done: 'Con báo đã làm',
  verified: 'Đã xác nhận',
  cancelled: 'Đã huỷ',
}

export const childOrder: ChildSlug[] = ['khoai', 'san', 'kem']

