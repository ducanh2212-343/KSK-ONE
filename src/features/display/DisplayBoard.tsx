import { useCallback, useEffect, useMemo, useState } from 'react'
import { kskRepository } from '../../data'
import type { DisplayFeedItem } from '../../domain/ksk'
import { displayAlertKey, getDisplayCountdown, shouldShowStartAlert } from './displayLogic'

function formatTime(value: string | null) {
  if (!value) return '--:--'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function DisplayBoard() {
  const [items, setItems] = useState<DisplayFeedItem[]>([])
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')
  const [dismissedAlert, setDismissedAlert] = useState('')

  const refresh = useCallback(async () => {
    try {
      setItems(await kskRepository.loadDisplay())
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải màn hình TV.')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const stopRealtime = kskRepository.subscribe(() => void refresh())
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const feedRefresh = window.setInterval(() => void refresh(), 5000)
    return () => {
      stopRealtime()
      window.clearInterval(clock)
      window.clearInterval(feedRefresh)
    }
  }, [refresh])

  const activeAlert = useMemo(
    () => items.find((item) => shouldShowStartAlert(item, now, dismissedAlert)),
    [dismissedAlert, items, now],
  )

  return (
    <main className="display-shell">
      <header className="display-header">
        <div className="display-brand">
          <div className="display-logo">K</div>
          <div><span>Gia đình mình</span><strong>KSK One</strong></div>
        </div>
        <div className="display-clock">
          <strong>{new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}</strong>
          <span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)}</span>
        </div>
      </header>

      {kskRepository.mode === 'demo' ? <div className="display-demo">BẢN XEM THỬ · DỮ LIỆU AN TOÀN TRÊN THIẾT BỊ</div> : null}
      {error ? <div className="display-error">{error}</div> : null}

      <section className="display-grid" aria-label="Lịch của Khoai, Sắn và Kem">
        {items.map((item) => {
          const timer = getDisplayCountdown(item, now)
          return (
            <article className="display-column" key={item.memberId} style={{ '--display-color': item.color } as React.CSSProperties}>
              <header>
                <div className="display-avatar">{item.displayName.slice(0, 1)}</div>
                <h1>{item.displayName}</h1>
                <div className="display-task-count"><strong>{item.unfinishedTasks}</strong><span>việc chưa xong</span></div>
              </header>

              <div className={`display-current ${item.currentActivity ? 'is-active' : ''}`}>
                <span>Đang diễn ra</span>
                <strong>{item.currentActivity ?? 'Đang nghỉ'}</strong>
                <small>{item.currentActivity ? `${formatTime(item.currentStartsAt)}–${formatTime(item.currentEndsAt)}` : 'Chưa có hoạt động hiện tại'}</small>
              </div>

              <div className="display-next">
                <span>Tiếp theo</span>
                <strong>{item.nextActivity ?? 'Chưa có lịch tiếp theo'}</strong>
                <small>{item.nextStartsAt ? formatTime(item.nextStartsAt) : '--:--'}</small>
              </div>

              <div className="display-countdown">
                <span>{timer.label}</span>
                <strong>{timer.value}</strong>
              </div>
            </article>
          )
        })}
      </section>

      <footer className="display-footer">
        <span>Hoạt động hiện tại · Tiếp theo · Nhiệm vụ chưa hoàn thành</span>
        <span className="display-live"><i /> Tự động đồng bộ</span>
      </footer>

      {activeAlert ? (
        <aside className="display-alert" style={{ '--display-color': activeAlert.color } as React.CSSProperties} role="alert">
          <div className="alert-pulse">!</div>
          <p>Đến giờ rồi</p>
          <h2>{activeAlert.displayName}</h2>
          <strong>{activeAlert.currentActivity}</strong>
          <span>Bắt đầu lúc {formatTime(activeAlert.currentStartsAt)}</span>
          <button type="button" onClick={() => setDismissedAlert(displayAlertKey(activeAlert))}>Đã rõ</button>
        </aside>
      ) : null}
    </main>
  )
}
