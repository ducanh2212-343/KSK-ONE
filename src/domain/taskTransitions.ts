import type { TaskStatus } from './ksk'

const childTargets: TaskStatus[] = ['in_progress', 'child_reported_done']
const closedStatuses: TaskStatus[] = ['verified', 'cancelled']

export function canChildTransition(from: TaskStatus, to: TaskStatus) {
  return !closedStatuses.includes(from) && childTargets.includes(to)
}

export function canParentVerify(status: TaskStatus) {
  return status === 'child_reported_done'
}

