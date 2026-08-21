import { useState, type FormEvent } from 'react'
import type { EventDraft, KskEvent, Member } from '../domain/ksk'
import { Modal } from './Modal'

interface EventEditorProps {
  members: Member[]
  event: KskEvent | null
  onClose: () => void
  onSave: (draft: EventDraft) => Promise<void>
}

function localDateTime(iso: string) {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function defaultDateTime(hoursFromNow: number) {
  const value = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  value.setMinutes(0, 0, 0)
  return localDateTime(value.toISOString())
}

export function EventEditor({ members, event, onClose, onSave }: EventEditorProps) {
  const [childId, setChildId] = useState(event?.childId ?? members[0]?.id ?? '')
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [startsAt, setStartsAt] = useState(event ? localDateTime(event.startsAt) : defaultDateTime(1))
  const [endsAt, setEndsAt] = useState(event ? localDateTime(event.endsAt) : defaultDateTime(2))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        id: event?.id,
        childId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu sự kiện.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={event ? 'Sửa sự kiện' : 'Tạo sự kiện mới'}
      subtitle="Sắp xếp lịch rõ ràng để cả nhà chủ động."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          <span>Lịch của</span>
          <select value={childId} onChange={(item) => setChildId(item.target.value)} required>
            {members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Tên hoạt động</span>
          <input value={title} onChange={(item) => setTitle(item.target.value)} maxLength={160} required />
        </label>
        <div className="form-grid">
          <label>
            <span>Bắt đầu</span>
            <input type="datetime-local" value={startsAt} onChange={(item) => setStartsAt(item.target.value)} required />
          </label>
          <label>
            <span>Kết thúc</span>
            <input type="datetime-local" value={endsAt} onChange={(item) => setEndsAt(item.target.value)} required />
          </label>
        </div>
        <label>
          <span>Địa điểm</span>
          <input value={location} onChange={(item) => setLocation(item.target.value)} placeholder="Không hiển thị trên màn hình TV" />
        </label>
        <label>
          <span>Ghi chú</span>
          <textarea value={description} onChange={(item) => setDescription(item.target.value)} rows={3} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <footer className="form-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            Đóng
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu sự kiện'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

