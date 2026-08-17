import type {
  DashboardData,
  EventDraft,
  KskEvent,
  KskTask,
  Member,
  StarDraft,
  StarEntry,
  TaskDraft,
} from '../domain/ksk'
import type { KskRepository } from './kskRepository'

const storageKey = 'ksk-one-demo-v1'

const members: Member[] = [
  {
    id: 'child-khoai',
    slug: 'khoai',
    displayName: 'Khoai',
    fullName: 'Trần Lưu Trí Dương',
    color: '#f97316',
  },
  {
    id: 'child-san',
    slug: 'san',
    displayName: 'Sắn',
    fullName: 'Trần Lưu Quốc Bảo',
    color: '#0f9f78',
  },
  {
    id: 'child-kem',
    slug: 'kem',
    displayName: 'Kem',
    fullName: 'Trần Lưu Quốc Vũ',
    color: '#6d5bd0',
  },
]

function atTime(hours: number, minutes: number, dayOffset = 0) {
  const value = new Date()
  value.setDate(value.getDate() + dayOffset)
  value.setHours(hours, minutes, 0, 0)
  return value.toISOString()
}

function seedState(): DashboardData {
  const now = new Date().toISOString()
  return {
    members,
    tasks: [
      {
        id: 'task-1',
        childId: 'child-khoai',
        title: 'Hoàn thành bài Toán',
        description: 'Kiểm tra lại bài trước khi báo đã làm.',
        dueAt: atTime(19, 30),
        status: 'child_reported_done',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-2',
        childId: 'child-san',
        title: 'Đọc sách 20 phút',
        description: '',
        dueAt: atTime(20, 0),
        status: 'in_progress',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-3',
        childId: 'child-kem',
        title: 'Chuẩn bị đồ dùng ngày mai',
        description: '',
        dueAt: atTime(20, 30),
        status: 'todo',
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: 'event-1',
        childId: 'child-khoai',
        title: 'Học tiếng Anh',
        description: '',
        location: 'Tại nhà',
        startsAt: atTime(18, 0),
        endsAt: atTime(19, 0),
      },
      {
        id: 'event-2',
        childId: 'child-san',
        title: 'Luyện đàn',
        description: '',
        location: 'Phòng học',
        startsAt: atTime(19, 0),
        endsAt: atTime(19, 45),
      },
      {
        id: 'event-3',
        childId: 'child-kem',
        title: 'Đọc truyện cùng gia đình',
        description: '',
        location: 'Phòng khách',
        startsAt: atTime(20, 0),
        endsAt: atTime(20, 30),
      },
    ],
    stars: [
      {
        id: 'star-1',
        childId: 'child-khoai',
        taskId: null,
        amount: 5,
        reason: 'Chủ động hỗ trợ em',
        createdAt: now,
      },
      {
        id: 'star-2',
        childId: 'child-san',
        taskId: null,
        amount: 3,
        reason: 'Tập trung học tập',
        createdAt: now,
      },
    ],
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function makeId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `${prefix}-${suffix}`
}

export class DemoRepository implements KskRepository {
  readonly mode = 'demo' as const
  private state: DashboardData
  private listeners = new Set<() => void>()

  constructor() {
    const saved = globalThis.localStorage?.getItem(storageKey)
    this.state = saved ? (JSON.parse(saved) as DashboardData) : seedState()
  }

  async loadDashboard() {
    return clone(this.state)
  }

  async saveTask(draft: TaskDraft) {
    const now = new Date().toISOString()
    if (draft.id) {
      const current = this.state.tasks.find((task) => task.id === draft.id)
      if (!current) throw new Error('Không tìm thấy nhiệm vụ cần sửa.')
      Object.assign(current, {
        childId: draft.childId,
        title: draft.title,
        description: draft.description,
        dueAt: draft.dueAt,
        updatedAt: now,
      })
    } else {
      const task: KskTask = {
        id: makeId('task'),
        childId: draft.childId,
        title: draft.title,
        description: draft.description,
        dueAt: draft.dueAt,
        status: 'todo',
        createdAt: now,
        updatedAt: now,
      }
      this.state.tasks.unshift(task)
    }
    this.commit()
  }

  async saveEvent(draft: EventDraft) {
    if (draft.id) {
      const current = this.state.events.find((event) => event.id === draft.id)
      if (!current) throw new Error('Không tìm thấy sự kiện cần sửa.')
      Object.assign(current, draft)
    } else {
      const event: KskEvent = { ...draft, id: makeId('event') }
      this.state.events.push(event)
    }
    this.commit()
  }

  async verifyTask(task: KskTask) {
    const current = this.state.tasks.find((item) => item.id === task.id)
    if (!current) throw new Error('Không tìm thấy nhiệm vụ cần xác nhận.')
    current.status = 'verified'
    current.updatedAt = new Date().toISOString()
    this.commit()
  }

  async cancelTask(taskId: string) {
    const current = this.state.tasks.find((item) => item.id === taskId)
    if (!current) throw new Error('Không tìm thấy nhiệm vụ cần huỷ.')
    current.status = 'cancelled'
    current.updatedAt = new Date().toISOString()
    this.commit()
  }

  async awardStars(draft: StarDraft) {
    const entry: StarEntry = {
      id: makeId('star'),
      childId: draft.childId,
      taskId: draft.taskId ?? null,
      amount: draft.amount,
      reason: draft.reason,
      createdAt: new Date().toISOString(),
    }
    this.state.stars.unshift(entry)
    this.commit()
  }

  subscribe(onChange: () => void) {
    this.listeners.add(onChange)
    return () => this.listeners.delete(onChange)
  }

  private commit() {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(this.state))
    this.listeners.forEach((listener) => listener())
  }
}

