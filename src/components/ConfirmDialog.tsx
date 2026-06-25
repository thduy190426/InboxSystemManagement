import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'

export type ConfirmDialogTone = 'default' | 'danger'

export type ConfirmDialogState = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmDialogTone
  onConfirm: () => Promise<void> | void
}

type ConfirmDialogProps = {
  dialog: ConfirmDialogState | null
  isWorking?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  dialog,
  isWorking = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!dialog) {
    return null
  }

  const isDanger = dialog.tone === 'danger'
  const Icon = isDanger ? AlertTriangle : CheckCircle2

  return (
    <div className="confirm-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className={isDanger ? 'confirm-dialog is-danger' : 'confirm-dialog'}
        role="dialog"
      >
        <button
          className="confirm-dialog-close"
          disabled={isWorking}
          onClick={onCancel}
          title="Dong"
          type="button"
        >
          <X size={18} />
        </button>
        <span className="confirm-dialog-icon">
          <Icon size={22} />
        </span>
        <div className="confirm-dialog-copy">
          <h2 id="confirm-dialog-title">{dialog.title}</h2>
          <p>{dialog.description}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-secondary"
            disabled={isWorking}
            onClick={onCancel}
            type="button"
          >
            {dialog.cancelLabel || 'Huỷ'}
          </button>
          <button
            className="confirm-dialog-primary"
            disabled={isWorking}
            onClick={onConfirm}
            type="button"
          >
            {isWorking ? <Loader2 className="confirm-dialog-spinner" size={16} /> : null}
            {isWorking ? 'Đang xử lí...' : dialog.confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </section>
    </div>
  )
}
