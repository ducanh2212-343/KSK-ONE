import { describe, expect, it } from 'vitest'
import { canChildTransition, canParentVerify } from './taskTransitions'

describe('quyen chuyen trang thai nhiem vu', () => {
  it('chi cho con chuyen sang dang lam hoac con bao da lam', () => {
    expect(canChildTransition('todo', 'in_progress')).toBe(true)
    expect(canChildTransition('in_progress', 'child_reported_done')).toBe(true)
    expect(canChildTransition('todo', 'verified')).toBe(false)
    expect(canChildTransition('todo', 'cancelled')).toBe(false)
  })

  it('khong mo lai nhiem vu da dong', () => {
    expect(canChildTransition('verified', 'in_progress')).toBe(false)
    expect(canChildTransition('cancelled', 'child_reported_done')).toBe(false)
  })

  it('chi de xuat bo me xac nhan khi con da bao hoan thanh', () => {
    expect(canParentVerify('child_reported_done')).toBe(true)
    expect(canParentVerify('in_progress')).toBe(false)
  })
})

