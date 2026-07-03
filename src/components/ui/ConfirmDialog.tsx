import { AlertTriangle, Check, CheckCircle2, Loader2, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

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

const EXIT_DURATION_MS = 140

export function ConfirmDialog({
  dialog,
  isWorking = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [visibleDialog, setVisibleDialog] = useState(dialog)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (dialog) {
      setVisibleDialog(dialog)
      setIsExiting(false)
      return
    }

    if (!visibleDialog) {
      return
    }

    setIsExiting(true)
    const timer = window.setTimeout(() => {
      setVisibleDialog(null)
      setIsExiting(false)
    }, EXIT_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [dialog, visibleDialog])

  if (!visibleDialog) {
    return null
  }

  const isDanger = visibleDialog.tone === 'danger'
  const Icon = isDanger ? AlertTriangle : CheckCircle2
  const ActionIcon = isDanger ? Trash2 : Check

  return (
    <div className={isExiting ? 'confirm-dialog-backdrop is-exiting' : 'confirm-dialog-backdrop'} role="presentation">
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className={isDanger ? 'confirm-dialog is-danger' : 'confirm-dialog'}
        role="dialog"
      >
        <button
          className="confirm-dialog-close"
          disabled={isWorking || isExiting}
          onClick={onCancel}
          title="Đóng"
          type="button"
        >
          <X size={18} />
        </button>
        <span className="confirm-dialog-icon">
          <Icon size={22} />
        </span>
        <div className="confirm-dialog-copy">
          <h2 id="confirm-dialog-title">{visibleDialog.title}</h2>
          <p>{visibleDialog.description}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-secondary"
            disabled={isWorking || isExiting}
            onClick={onCancel}
            type="button"
          >
            <X size={16} />
            {visibleDialog.cancelLabel || 'Huỷ'}
          </button>
          <button
            className="confirm-dialog-primary"
            disabled={isWorking || isExiting}
            onClick={onConfirm}
            type="button"
          >
            {isWorking ? <Loader2 className="confirm-dialog-spinner" size={16} /> : <ActionIcon size={16} />}
            {isWorking ? 'Đang xử lí...' : visibleDialog.confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </section>
    </div>
  )
}
