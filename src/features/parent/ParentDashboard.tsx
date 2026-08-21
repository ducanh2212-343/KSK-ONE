import { useCallback, useEffect, useMemo, useState } from 'react'
import { EventEditor } from '../../components/EventEditor'
import { StarAward } from '../../components/StarAward'
import { TaskEditor } from '../../components/TaskEditor'
import { kskRepository } from '../../data'
import type {
  DashboardData,
  EventDraft,
  KskEvent,
  KskTask,
  Member,
  StarDraft,
  TaskDraft,
  TaskStatus,
} from '../../domain/ksk'
import { taskStatusLabels } from '../../domain/ksk'
import { supabase } from '../../lib/supabase'

type TaskFilter = 'open' | 'reported' | 'verified' | 'all'
type TaskEditorState = { mode: 'new' } | { mode: 'edit'; task: KskTask } | null
type EventEditorState = { mode: 'new' } | { mode: 'edit'; event: KskEvent } | null
type StarState = { member: Member; task?: KskTask | null } | null

const openStatuses: TaskStatus[] = ['todo', 'in_progress', 'child_reported_done']

function formatDay() {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function formatTime(value: string | null) {
  if (!value) return 'Không đặt hạn'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function isToday(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function memberById(data: DashboardData, id: string) {
  return data.members.find((member) => member.id === id)
}

export function ParentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [taskEditor, setTaskEditor] = useState<TaskEditorState>(null)
  const [eventEditor, setEventEditor] = useState<EventEditorState>(null)
  const [starState, setStarState] = useState<StarState>(null)
  const [busyTaskId, setBusyTaskId] = useState('')

  const refresh = useCallback(async () => {
    try {
      const nextData = await kskRepository.loadDashboard()
      setData(nextData)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu KSK One.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return kskRepository.subscribe(() => void refresh())
  }, [refresh])

  const filteredTasks = useMemo(() => {
    if (!data) return []
    return data.tasks.filter((task) => {
      if (memberFilter !== 'all' && task.childId !== memberFilter) return false
      if (taskFilter === 'open') return openStatuses.includes(task.status)
      if (taskFilter === 'reported') return task.status === 'child_reported_done'
      if (taskFilter === 'verified') return task.status === 'verified'
      return true
    })
  }, [data, memberFilter, taskFilter])

  const todayEvents = useMemo(() => {
    if (!data) return []
    return data.events
      .filter((event) => isToday(event.startsAt))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  }, [data])

  async function saveTask(draft: TaskDraft) {
    await kskRepository.saveTask(draft)
    await refresh()
  }

  async function saveEvent(draft: EventDraft) {
    await kskRepository.saveEvent(draft)
    await refresh()
  }

  async function awardStars(draft: StarDraft) {
    await kskRepository.awardStars(draft)
    await refresh()
  }

  async function verify(task: KskTask) {
    setBusyTaskId(task.id)
    try {
      await kskRepository.verifyTask(task)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xác nhận nhiệm vụ.')
    } finally {
      setBusyTaskId('')
    }
  }

  async function cancelTask(task: KskTask) {
    if (!window.confirm(`Huỷ nhiệm vụ “${task.title}”?`)) return
    setBusyTaskId(task.id)
    try {
      await kskRepository.cancelTask(task.id)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể huỷ nhiệm vụ.')
    } finally {
      setBusyTaskId('')
    }
  }

  if (loading) return <div className="center-state">Đang chuẩn bị bảng điều hành gia đình…</div>
  if (!data) return <div className="center-state error-state">{error || 'Chưa có dữ liệu.'}</div>

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div>
            <p className="eyebrow">Gia đình mình · Mỗi ngày tốt hơn</p>
            <h1>KSK One</h1>
          </div>
        </div>
        <div className="topbar-meta">
          <div>
            <span>Hôm nay</span>
            <strong>{formatDay()}</strong>
          </div>
          {kskRepository.mode === 'demo' ? <span className="mode-chip">Bản xem thử an toàn</span> : null}
          {supabase ? (
            <button className="button ghost small" type="button" onClick={() => void supabase?.auth.signOut()}>
              Đăng xuất
            </button>
          ) : null}
        </div>
      </header>

      {kskRepository.mode === 'demo' ? (
        <aside className="demo-banner">
          <span className="demo-dot" />
          <div>
            <strong>Đang dùng dữ liệu xem thử trên thiết bị này.</strong>
            <span> Mọi thao tác đều hoạt động nhưng chưa ghi vào Supabase production.</span>
          </div>
        </aside>
      ) : null}

      {error ? (
        <aside className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>Đóng</button>
        </aside>
      ) : null}

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Bảng điều hành của bố mẹ</p>
          <h2>Nắm nhịp hôm nay, ghi nhận từng bước tiến.</h2>
          <p className="hero-copy">Lịch học, nhiệm vụ và Sao Xứng Đáng của ba con trong một màn hình rõ ràng.</p>
        </div>
        <div className="hero-actions">
          <button className="button primary" type="button" onClick={() => setTaskEditor({ mode: 'new' })}>
            <span>＋</span> Tạo nhiệm vụ
          </button>
          <button className="button secondary" type="button" onClick={() => setEventEditor({ mode: 'new' })}>
            <span>＋</span> Tạo sự kiện
          </button>
        </div>
      </section>

      <section className="member-grid" aria-label="Tổng quan ba con">
        {data.members.map((member) => {
          const tasks = data.tasks.filter((task) => task.childId === member.id)
          const unfinished = tasks.filter((task) => openStatuses.includes(task.status)).length
          const reported = tasks.filter((task) => task.status === 'child_reported_done').length
          const stars = data.stars.filter((entry) => entry.childId === member.id).reduce((sum, entry) => sum + entry.amount, 0)
          const nextEvent = data.events
            .filter((event) => event.childId === member.id && new Date(event.endsAt) > new Date())
            .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0]

          return (
            <article className="member-card" key={member.id} style={{ '--member-color': member.color } as React.CSSProperties}>
              <header>
                <div className="member-avatar">{member.displayName.slice(0, 1)}</div>
                <div>
                  <h3>{member.displayName}</h3>
                  <p>{member.fullName}</p>
                </div>
                <button className="star-total" type="button" onClick={() => setStarState({ member })} title="Trao Sao Xứng Đáng">
                  ★ {stars}
                </button>
              </header>
              <div className="member-metrics">
                <div><strong>{unfinished}</strong><span>chưa xong</span></div>
                <div><strong>{reported}</strong><span>chờ xác nhận</span></div>
              </div>
              <div className="next-event">
                <span>Tiếp theo</span>
                <strong>{nextEvent?.title ?? 'Chưa có lịch sắp tới'}</strong>
                {nextEvent ? <small>{formatTime(nextEvent.startsAt)}</small> : null}
              </div>
            </article>
          )
        })}
      </section>

      <section className="content-grid">
        <article className="panel task-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Theo dõi thực hiện</p>
              <h2>Nhiệm vụ</h2>
            </div>
            <div className="filter-row">
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} aria-label="Lọc theo con">
                <option value="all">Cả ba con</option>
                {data.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}
              </select>
            </div>
          </header>
          <div className="segmented-control" aria-label="Lọc trạng thái nhiệm vụ">
            {([
              ['open', 'Chưa xong'],
              ['reported', 'Chờ xác nhận'],
              ['verified', 'Đã làm'],
              ['all', 'Tất cả'],
            ] as [TaskFilter, string][]).map(([value, label]) => (
              <button className={taskFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setTaskFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className="task-list">
            {filteredTasks.length === 0 ? <p className="empty-state">Không có nhiệm vụ trong nhóm này.</p> : null}
            {filteredTasks.map((task) => {
              const member = memberById(data, task.childId)
              if (!member) return null
              return (
                <div className={`task-row status-${task.status}`} key={task.id}>
                  <div className="status-marker" />
                  <div className="task-main">
                    <div className="task-title-row">
                      <strong>{task.title}</strong>
                      <span className="child-pill" style={{ '--member-color': member.color } as React.CSSProperties}>{member.displayName}</span>
                    </div>
                    {task.description ? <p>{task.description}</p> : null}
                    <div className="task-meta">
                      <span className={`status-label ${task.status}`}>{taskStatusLabels[task.status]}</span>
                      <span>Hạn: {formatTime(task.dueAt)}</span>
                    </div>
                  </div>
                  <div className="row-actions">
                    {task.status === 'child_reported_done' ? (
                      <button className="button verify small" type="button" onClick={() => void verify(task)} disabled={busyTaskId === task.id}>
                        ✓ Xác nhận
                      </button>
                    ) : null}
                    {task.status === 'verified' ? (
                      <button className="button star small" type="button" onClick={() => setStarState({ member, task })}>
                        ★ Trao sao
                      </button>
                    ) : null}
                    {!['verified', 'cancelled'].includes(task.status) ? (
                      <button className="text-button" type="button" onClick={() => setTaskEditor({ mode: 'edit', task })}>Sửa</button>
                    ) : null}
                    {!['verified', 'cancelled'].includes(task.status) ? (
                      <button className="text-button danger" type="button" onClick={() => void cancelTask(task)}>Huỷ</button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="panel schedule-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Nhịp trong ngày</p>
              <h2>Lịch hôm nay</h2>
            </div>
            <button className="icon-button warm" type="button" onClick={() => setEventEditor({ mode: 'new' })} aria-label="Tạo sự kiện">＋</button>
          </header>
          <div className="timeline">
            {todayEvents.length === 0 ? <p className="empty-state">Hôm nay chưa có sự kiện.</p> : null}
            {todayEvents.map((event) => {
              const member = memberById(data, event.childId)
              if (!member) return null
              return (
                <button className="timeline-item" type="button" key={event.id} onClick={() => setEventEditor({ mode: 'edit', event })}>
                  <time>{new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.startsAt))}</time>
                  <span className="timeline-line"><i style={{ background: member.color }} /></span>
                  <span className="timeline-content">
                    <strong>{event.title}</strong>
                    <small>{member.displayName}{event.location ? ` · ${event.location}` : ''}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>
      </section>

      <footer className="app-footer">
        <span>KSK One · Giai đoạn 2</span>
        <span>Dữ liệu riêng tư không hiển thị trên màn hình TV.</span>
      </footer>

      {taskEditor ? (
        <TaskEditor
          members={data.members}
          task={taskEditor.mode === 'edit' ? taskEditor.task : null}
          onClose={() => setTaskEditor(null)}
          onSave={saveTask}
        />
      ) : null}
      {eventEditor ? (
        <EventEditor
          members={data.members}
          event={eventEditor.mode === 'edit' ? eventEditor.event : null}
          onClose={() => setEventEditor(null)}
          onSave={saveEvent}
        />
      ) : null}
      {starState ? (
        <StarAward member={starState.member} task={starState.task} onClose={() => setStarState(null)} onSave={awardStars} />
      ) : null}
    </main>
  )
}
