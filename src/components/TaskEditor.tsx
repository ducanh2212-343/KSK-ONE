import { useState, type FormEvent } from 'react'
import type { KskTask, Member, TaskDraft } from '../domain/ksk'
import { Modal } from './Modal'

interface TaskEditorProps {
  members: Member[]
  task: KskTask | null
  onClose: () => void
  onSave: (draft: TaskDraft) => Promise<void>
}

function localDateTime(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function TaskEditor({ members, task, onClose, onSave }: TaskEditorProps) {
  const [childId, setChildId] = useState(task?.childId ?? members[0]?.id ?? '')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueAt, setDueAt] = useState(localDateTime(task?.dueAt ?? null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        id: task?.id,
        childId,
        title: title.trim(),
        description: description.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu nhiệm vụ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={task ? 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}
      subtitle="Giao rõ việc, đúng người và đúng thời hạn."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          <span>Giao cho</span>
          <select value={childId} onChange={(event) => setChildId(event.target.value)} required>
            {members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Tên nhiệm vụ</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder="Ví dụ: Hoàn thành bài Toán"
            autoFocus
            required
          />
        </label>
        <label>
          <span>Hướng dẫn ngắn</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Nêu tiêu chí hoàn thành nếu cần"
          />
        </label>
        <label>
          <span>Hạn hoàn thành</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <footer className="form-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            Đóng
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu nhiệm vụ'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

