import { useState } from 'react'
import { X, AlertTriangle, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../../services/api/authApi'
import type { ContactUser } from '../../types'

export type ReportUserModalProps = {
  targetUser: AuthUser | ContactUser
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, notes: string) => void
}

export function ReportUserModal({
  targetUser,
  isOpen,
  onClose,
  onSubmit,
}: ReportUserModalProps) {
  const { t } = useTranslation('profile')
  const [reason, setReason] = useState('spam')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const targetName =
    ('displayName' in targetUser && targetUser.displayName) ||
    targetUser.fullName ||
    t('defaultUser')

  const reasons = [
    {
      id: 'spam',
      label: t('reportReasons.spam', {
        defaultValue: 'Nội dung rác hoặc tin nhắn quảng cáo (Spam)',
      }),
    },
    {
      id: 'harassment',
      label: t('reportReasons.harassment', {
        defaultValue: 'Quấy rối hoặc đe dọa',
      }),
    },
    {
      id: 'impersonation',
      label: t('reportReasons.impersonation', {
        defaultValue: 'Giả mạo danh tính người khác',
      }),
    },
    {
      id: 'inappropriate',
      label: t('reportReasons.inappropriate', {
        defaultValue: 'Nội dung không phù hợp hoặc nhạy cảm',
      }),
    },
    {
      id: 'other',
      label: t('reportReasons.other', {
        defaultValue: 'Lý do khác',
      }),
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      onSubmit(reason, notes.trim())
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-modal="true"
      className="profile-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="profile-modal-card report-modal-card">
        <div className="profile-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="report-modal-icon-badge">
              <AlertTriangle size={18} />
            </div>
            <h3 className="profile-modal-title">
              {t('reportTitle', { defaultValue: 'Báo cáo tài khoản' })}
            </h3>
          </div>
          <button
            aria-label={t('close', { defaultValue: 'Đóng' })}
            className="profile-btn profile-btn--ghost"
            onClick={onClose}
            style={{ padding: '6px' }}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-modal-body">
            <p className="report-modal-desc">
              {t('reportSubtitle', {
                defaultValue:
                  'Báo cáo của bạn sẽ được gửi tới ban quản trị để xem xét tài khoản',
              })}{' '}
              <strong>{targetName}</strong>.
            </p>

            <div className="report-reasons-list">
              <label className="report-label">
                {t('reportReasonLabel', { defaultValue: 'Lý do báo cáo' })}:
              </label>
              {reasons.map((r) => (
                <label className="report-reason-item" key={r.id}>
                  <input
                    checked={reason === r.id}
                    name="reportReason"
                    onChange={() => setReason(r.id)}
                    type="radio"
                    value={r.id}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: '14px' }}>
              <label className="report-label">
                {t('reportNotesLabel', {
                  defaultValue: 'Chi tiết bổ sung (tùy chọn)',
                })}
                :
              </label>
              <textarea
                className="composer-textarea"
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('reportNotesPlaceholder', {
                  defaultValue: 'Mô tả thêm chi tiết vi phạm...',
                })}
                rows={3}
                style={{ width: '100%', marginTop: '4px' }}
                value={notes}
              />
            </div>
          </div>

          <div className="profile-modal-footer">
            <button
              className="profile-btn profile-btn--ghost"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              {t('cancel', { defaultValue: 'Hủy' })}
            </button>
            <button
              className="profile-btn profile-btn--danger"
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={14} />
              <span>
                {isSubmitting
                  ? t('submitting', { defaultValue: 'Đang gửi...' })
                  : t('reportSubmit', { defaultValue: 'Gửi báo cáo' })}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
