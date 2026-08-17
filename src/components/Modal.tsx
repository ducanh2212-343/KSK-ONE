import type { PropsWithChildren } from 'react'

interface ModalProps extends PropsWithChildren {
  title: string
  subtitle?: string
  onClose: () => void
}

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">KSK One</p>
            <h2 id="modal-title">{title}</h2>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

