import { describe, expect, it } from 'vitest'
import type { DisplayFeedItem } from '../../domain/ksk'
import { getDisplayCountdown, shouldShowStartAlert } from './displayLogic'

const baseItem: DisplayFeedItem = {
  memberId: 'child-khoai',
  slug: 'khoai',
  displayName: 'Khoai',
  color: '#f97316',
  currentActivity: 'Học tiếng Anh',
  currentStartsAt: '2026-08-21T12:00:00.000Z',
  currentEndsAt: '2026-08-21T12:30:00.000Z',
  nextActivity: 'Đọc sách',
  nextStartsAt: '2026-08-21T13:00:00.000Z',
  unfinishedTasks: 2,
  generatedAt: '2026-08-21T12:00:00.000Z',
}

describe('màn hình TV', () => {
  it('đếm ngược đến khi hoạt động hiện tại kết thúc', () => {
    expect(getDisplayCountdown(baseItem, Date.parse('2026-08-21T12:29:00.000Z'))).toEqual({
      label: 'Kết thúc sau',
      value: '00:01:00',
    })
  })

  it('cảnh báo trong 60 giây đầu và không hiện lại sau khi đóng', () => {
    const now = Date.parse('2026-08-21T12:00:30.000Z')
    expect(shouldShowStartAlert(baseItem, now)).toBe(true)
    expect(shouldShowStartAlert(baseItem, now, 'child-khoai:2026-08-21T12:00:00.000Z')).toBe(false)
    expect(shouldShowStartAlert(baseItem, Date.parse('2026-08-21T12:01:01.000Z'))).toBe(false)
  })
})
