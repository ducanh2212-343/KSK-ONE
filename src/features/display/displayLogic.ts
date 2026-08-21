import type { DisplayFeedItem } from '../../domain/ksk'

export function getDisplayCountdown(item: DisplayFeedItem, now: number) {
  const currentEnd = item.currentEndsAt ? new Date(item.currentEndsAt).getTime() : 0
  const nextStart = item.nextStartsAt ? new Date(item.nextStartsAt).getTime() : 0
  const target = currentEnd > now ? currentEnd : nextStart > now ? nextStart : 0
  const label = currentEnd > now ? 'Kết thúc sau' : nextStart > now ? 'Bắt đầu sau' : 'Đang chờ lịch mới'
  if (!target) return { label, value: '--:--:--' }

  const total = Math.max(0, Math.floor((target - now) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return {
    label,
    value: [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':'),
  }
}

export function displayAlertKey(item: DisplayFeedItem) {
  return `${item.memberId}:${item.currentStartsAt ?? ''}`
}

export function shouldShowStartAlert(item: DisplayFeedItem, now: number, dismissedAlert = '') {
  if (!item.currentStartsAt || !item.currentActivity) return false
  const startsAt = new Date(item.currentStartsAt).getTime()
  return now >= startsAt && now - startsAt < 60_000 && displayAlertKey(item) !== dismissedAlert
}
