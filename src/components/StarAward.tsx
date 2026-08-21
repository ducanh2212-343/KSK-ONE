import { useState, type FormEvent } from 'react'
import type { KskTask, Member, StarDraft } from '../domain/ksk'
import { Modal } from './Modal'

interface StarAwardProps {
  member: Member
  task?: KskTask | null
  onClose: () => void
  onSave: (draft: StarDraft) => Promise<void>
}

export function StarAward({ member, task, onClose, onSave }: StarAwardProps) {
  const [amount, setAmount] = useState(3)
  const [reason, setReason] = useState(task ? `Hoàn thành: ${task.title}` : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ childId: member.id, taskId: task?.id, amount, reason: reason.trim() })
      onClose()
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Không thể trao sao.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Trao Sao Xứng Đáng cho ${member.displayName}`} subtitle="Ghi nhận hành vi cụ thể để khuyến khích con phát triển." onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          <span>Số sao</span>
          <div className="star-picker">
            {[1, 3, 5, 10].map((value) => (
              <button
                className={amount === value ? 'star-option active' : 'star-option'}
                type="button"
                key={value}
                onClick={() => setAmount(value)}
              >
                ★ {value}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>Lý do ghi nhận</span>
          <textarea value={reason} onChange={(item) => setReason(item.target.value)} rows={3} maxLength={240} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <footer className="form-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            Đóng
          </button>
          <button className="button star" type="submit" disabled={saving}>
            {saving ? 'Đang trao…' : 'Trao sao'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

