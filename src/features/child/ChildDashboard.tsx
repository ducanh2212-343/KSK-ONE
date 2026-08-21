import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { kskRepository } from '../../data'
import type { ChildDashboardData, KskTask, TaskStatus } from '../../domain/ksk'
import { isChildSlug, taskStatusLabels } from '../../domain/ksk'
import { supabase } from '../../lib/supabase'

function isToday(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDue(value: string | null) {
  if (!value) return 'Không đặt hạn'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function nextAction(task: KskTask): { label: string; status: Extract<TaskStatus, 'in_progress' | 'child_reported_done'> } | null {
  if (task.status === 'todo') return { label: 'Bắt đầu làm', status: 'in_progress' }
  if (task.status === 'in_progress') return { label: 'Con báo đã làm', status: 'child_reported_done' }
  return null
}

export function ChildDashboard() {
  const { slug } = useParams()
  const validSlug = isChildSlug(slug) ? slug : null
  const [data, setData] = useState<ChildDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyTaskId, setBusyTaskId] = useState('')

  const refresh = useCallback(async () => {
    if (!validSlug) return
    try {
      setData(await kskRepository.loadChild(validSlug))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải màn hình của con.')
    } finally {
      setLoading(false)
    }
  }, [validSlug])

  useEffect(() => {
    void refresh()
    return kskRepository.subscribe(() => void refresh())
  }, [refresh])

  const tasks = useMemo(() => {
    if (!data) return []
    return data.tasks
      .filter((task) => task.status !== 'cancelled')
      .sort((left, right) => {
        if (left.status === 'verified' && right.status !== 'verified') return 1
        if (right.status === 'verified' && left.status !== 'verified') return -1
        return (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999')
      })
  }, [data])

  const todayEvents = useMemo(() => {
    if (!data) return []
    return data.events.filter((event) => isToday(event.startsAt)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [data])

  async function moveTask(task: KskTask, status: Extract<TaskStatus, 'in_progress' | 'child_reported_done'>) {
    setBusyTaskId(task.id)
    try {
      await kskRepository.updateTaskStatus(task.id, status)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật nhiệm vụ.')
    } finally {
      setBusyTaskId('')
    }
  }

  if (!validSlug) return <Navigate to="/ksk/parent" replace />
  if (loading) return <div className="center-state">Đang chuẩn bị lịch hôm nay…</div>
  if (!data) return <div className="center-state error-state">{error || 'Chưa có dữ liệu.'}</div>

  const starTotal = data.stars.reduce((sum, item) => sum + item.amount, 0)

  return (
    <main className="child-shell" style={{ '--child-color': data.member.color } as React.CSSProperties}>
      <header className="child-topbar">
        <div className="child-brand">
          <div className="brand-mark">K</div>
          <div>
            <span>KSK One</span>
            <strong>Ngày tốt của {data.member.displayName}</strong>
          </div>
        </div>
        <div className="child-top-actions">
          {kskRepository.mode === 'demo' ? <span className="child-demo-chip">Bản xem thử</span> : null}
          {supabase ? (
            <button className="child-signout" type="button" onClick={() => void supabase?.auth.signOut()}>
              Đăng xuất
            </button>
          ) : null}
        </div>
      </header>

      {error ? <aside className="child-error">{error}<button type="button" onClick={() => setError('')}>Đóng</button></aside> : null}

      <section className="child-hero">
        <div className="child-avatar">{data.member.displayName.slice(0, 1)}</div>
        <div className="child-greeting">
          <p>Chào {data.member.displayName}!</p>
          <h1>Mình cùng hoàn thành từng việc nhé.</h1>
          <span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date())}</span>
        </div>
        <div className="child-stars">
          <span>★</span>
          <strong>{starTotal}</strong>
          <small>Sao Xứng Đáng</small>
        </div>
      </section>

      <section className="child-layout">
        <article className="child-panel child-schedule">
          <header>
            <div>
              <p className="eyebrow">Lịch hôm nay</p>
              <h2>Nhịp trong ngày</h2>
            </div>
            <span>{todayEvents.length} hoạt động</span>
          </header>
          <div className="child-timeline">
            {todayEvents.length === 0 ? <p className="child-empty">Hôm nay chưa có hoạt động nào.</p> : null}
            {todayEvents.map((event) => (
              <div className="child-event" key={event.id}>
                <time>{formatClock(event.startsAt)}</time>
                <i />
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatClock(event.startsAt)}–{formatClock(event.endsAt)}{event.location ? ` · ${event.location}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="child-panel child-star-history">
          <header>
            <div>
              <p className="eyebrow">Ghi nhận</p>
              <h2>Sao gần đây</h2>
            </div>
          </header>
          <div className="star-history-list">
            {data.stars.length === 0 ? <p className="child-empty">Con chưa có sao. Cố gắng nhé!</p> : null}
            {data.stars.slice(0, 4).map((entry) => (
              <div key={entry.id}>
                <span>+{entry.amount} ★</span>
                <strong>{entry.reason}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="child-panel child-tasks">
        <header>
          <div>
            <p className="eyebrow">Việc của con</p>
            <h2>Nhiệm vụ</h2>
          </div>
          <span>{tasks.filter((task) => !['verified', 'cancelled'].includes(task.status)).length} việc chưa xong</span>
        </header>
        <div className="child-task-grid">
          {tasks.length === 0 ? <p className="child-empty">Con chưa có nhiệm vụ nào.</p> : null}
          {tasks.map((task) => {
            const action = nextAction(task)
            return (
              <article className={`child-task status-${task.status}`} key={task.id}>
                <div className="child-task-status">{taskStatusLabels[task.status]}</div>
                <h3>{task.title}</h3>
                {task.description ? <p>{task.description}</p> : null}
                <span className="child-task-due">Hạn: {formatDue(task.dueAt)}</span>
                {action ? (
                  <button type="button" onClick={() => void moveTask(task, action.status)} disabled={busyTaskId === task.id}>
                    {busyTaskId === task.id ? 'Đang cập nhật…' : action.label}
                  </button>
                ) : null}
                {task.status === 'child_reported_done' ? <div className="child-waiting">Đã báo bố mẹ · Chờ xác nhận</div> : null}
                {task.status === 'verified' ? <div className="child-complete">✓ Bố mẹ đã xác nhận</div> : null}
              </article>
            )
          })}
        </div>
      </section>

      <footer className="child-footer">KSK One · Con chỉ có thể cập nhật tiến độ việc của mình.</footer>
    </main>
  )
}
