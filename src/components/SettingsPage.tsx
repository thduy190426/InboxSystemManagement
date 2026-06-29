import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  KeyRound,
  Laptop,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import {
  changePassword,
  deleteAccount,
  fetchSessions,
  revokeOtherSessions,
  revokeSession,
  type ChangePasswordPayload,
  type DeleteAccountPayload,
  type UserSession,
} from '../services/userApi'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'

type SettingsPageProps = {
  onAccountDeleted: () => void
  onLogout?: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type SessionViewModel = UserSession & {
  viewGroup: 'current' | 'active' | 'history'
  isCollapsible?: boolean
}

const RECENT_SESSION_DISPLAY_LIMIT = 5

const initialPasswordForm: ChangePasswordPayload = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
}

const initialDeleteForm: DeleteAccountPayload = {
  password: '',
  confirmationText: '',
}

function validatePasswordForm(form: ChangePasswordPayload) {
  const errors: Partial<Record<keyof ChangePasswordPayload, string>> = {}
  const requirements = [
    form.newPassword.length >= 8 || 'ít nhất 8 ký tự',
    form.newPassword.length <= 72 || 'không quá 72 ký tự',
    !/\s/.test(form.newPassword) || 'không chứa khoảng trắng',
    /[a-z]/.test(form.newPassword) || 'có chữ thường',
    /[A-Z]/.test(form.newPassword) || 'có chữ hoa',
    /[0-9]/.test(form.newPassword) || 'có chữ số',
    /[^A-Za-z0-9]/.test(form.newPassword) || 'có ký tự đặc biệt',
  ].filter((requirement): requirement is string => typeof requirement === 'string')

  if (!form.currentPassword) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại!'
  }

  if (!form.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới!'
  } else if (requirements.length) {
    errors.newPassword = `Mật khẩu mới cần ${requirements.join(', ')}!`
  } else if (form.currentPassword && form.currentPassword === form.newPassword) {
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại!'
  }

  if (!form.confirmNewPassword) {
    errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới!'
  } else if (form.newPassword && form.confirmNewPassword !== form.newPassword) {
    errors.confirmNewPassword = 'Mật khẩu mới xác nhận không khớp!'
  }

  return errors
}

function validateDeleteForm(form: DeleteAccountPayload) {
  const errors: Partial<Record<keyof DeleteAccountPayload, string>> = {}

  if (!form.password) {
    errors.password = 'Vui lòng nhập mật khẩu hiện tại!'
  }

  if (form.confirmationText.trim() !== 'XOA TAI KHOAN') {
    errors.confirmationText = 'Vui lòng nhập chính xác XOA TAI KHOAN!'
  }

  return errors
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Chưa có'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getSessionTitle(session: UserSession) {
  if (session.deviceName) {
    return session.deviceName
  }

  if (!session.userAgent) {
    return 'Thiết bị không xác định'
  }

  if (/Mobile|Android|iPhone|iPad/i.test(session.userAgent)) {
    return 'Thiết bị di động'
  }

  return 'Trình duyệt Web'
}

export function SettingsPage({ onAccountDeleted, onLogout, pushToast }: SettingsPageProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [passwordForm, setPasswordForm] = useState<ChangePasswordPayload>(initialPasswordForm)
  const [deleteForm, setDeleteForm] = useState<DeleteAccountPayload>(initialDeleteForm)
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof ChangePasswordPayload, string>>>({})
  const [deleteErrors, setDeleteErrors] = useState<Partial<Record<keyof DeleteAccountPayload, string>>>({})
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [renderExpandedSessions, setRenderExpandedSessions] = useState(false)

  const sortedSessions = [...sessions].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return left.isCurrent ? -1 : 1
    }

    if (Boolean(left.revokedAt) !== Boolean(right.revokedAt)) {
      return left.revokedAt ? 1 : -1
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
  const currentSession = sortedSessions.find((session) => session.isCurrent)
  const activeSessions = sortedSessions.filter((session) => !session.isCurrent && !session.revokedAt)
  const historySessions = sortedSessions.filter((session) => !session.isCurrent && session.revokedAt)
  const otherRecentSessions = sortedSessions
    .filter((session) => !session.isCurrent)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, currentSession ? RECENT_SESSION_DISPLAY_LIMIT - 1 : RECENT_SESSION_DISPLAY_LIMIT)
  const hiddenSessionCount = otherRecentSessions.length
  const sessionSummaryParts = [
    `${activeSessions.length + (currentSession ? 1 : 0)} đang hoạt động`,
    historySessions.length ? `${historySessions.length} đã thu hồi` : '',
  ].filter(Boolean)
  const sessionItems: SessionViewModel[] = [
    ...(currentSession ? [{ ...currentSession, viewGroup: 'current' as const }] : []),
    ...(renderExpandedSessions
      ? otherRecentSessions.map((session) => ({
          ...session,
          viewGroup: session.revokedAt ? ('history' as const) : ('active' as const),
          isCollapsible: true,
        }))
      : []),
  ]

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (showAllSessions) {
      setRenderExpandedSessions(true)
      return undefined
    }

    const removeHiddenSessionsTimer = window.setTimeout(() => {
      setRenderExpandedSessions(false)
    }, 340)

    return () => window.clearTimeout(removeHiddenSessionsTimer)
  }, [showAllSessions])

  async function loadSessions() {
    try {
      setIsLoadingSessions(true)
      const response = await fetchSessions()
      setSessions(response.sessions)
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể tải phiên đăng nhập!', 'error')
    } finally {
      setIsLoadingSessions(false)
    }
  }

  function handleToggleSessionHistory() {
    if (showAllSessions) {
      setShowAllSessions(false)
      return
    }

    setRenderExpandedSessions(true)
    window.requestAnimationFrame(() => {
      setShowAllSessions(true)
    })
  }

  function handlePasswordFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
    setPasswordErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  function handleDeleteFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target

    setDeleteForm((current) => ({
      ...current,
      [name]: value,
    }))
    setDeleteErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validatePasswordForm(passwordForm)

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      pushToast('Vui lòng kiểm tra lại thông tin đổi mật khẩu!', 'error')
      return
    }

    try {
      setIsChangingPassword(true)
      setPasswordErrors({})
      const response = await changePassword(passwordForm)
      setPasswordForm(initialPasswordForm)
      pushToast(response.message || 'Đã đổi mật khẩu!', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể đổi mật khẩu!', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleDeleteAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateDeleteForm(deleteForm)

    if (Object.keys(errors).length > 0) {
      setDeleteErrors(errors)
      pushToast('Vui lòng hoàn tất bước xác nhận trước khi xoá tài khoản!', 'error')
      return
    }

    setConfirmDialog({
      title: 'Xoá tài khoản?',
      description: 'Tài khoản sẽ bị vô hiệu hóa, thông tin hồ sơ sẽ bị xóa và bạn sẽ đăng xuất khỏi mọi phiên.',
      confirmLabel: 'Xóa tài khoản',
      tone: 'danger',
      onConfirm: deleteCurrentAccount,
    })
  }

  async function deleteCurrentAccount() {
    try {
      setIsDeletingAccount(true)
      setDeleteErrors({})
      await deleteAccount(deleteForm)
      onAccountDeleted()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể xóa tài khoản!', 'error')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  function confirmRevokeSession(session: UserSession) {
    setConfirmDialog({
      title: session.isCurrent ? 'Thu hồi phiên hiện tại?' : 'Đăng xuất thiết bị này?',
      description: session.isCurrent
        ? 'Bạn sẽ được đưa về màn hình đăng nhập ngay sau khi thu hồi phiên này!'
        : 'Thiết bị này sẽ cần đăng nhập lại để tiếp tục sử dụng!',
      confirmLabel: session.isCurrent ? 'Thu hồi và đăng xuất' : 'Đăng xuất thiết bị',
      tone: 'danger',
      onConfirm: () => revokeOneSession(session.id),
    })
  }

  function confirmRevokeOtherSessions() {
    setConfirmDialog({
      title: 'Đăng xuất khỏi thiết bị khác?',
      description: 'Tất cả các phiên đăng nhập khác sẽ bị thu hồi. Phiên hiện tại vẫn được giữ lại!',
      confirmLabel: 'Đăng xuất thiết bị khác',
      tone: 'danger',
      onConfirm: revokeAllOtherSessions,
    })
  }

  async function revokeOneSession(sessionId: string) {
    try {
      setRevokingSessionId(sessionId)
      const response = await revokeSession(sessionId)

      if (response.revokedCurrentSession) {
        pushToast('Đã thu hồi phiên hiện tại!', 'info')
        onLogout?.()
        return
      }

      pushToast(response.message || 'Đã thu hồi phiên đăng nhập!', 'info')
      await loadSessions()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể thu hồi phiên đăng nhập!', 'error')
    } finally {
      setRevokingSessionId(null)
    }
  }

  async function revokeAllOtherSessions() {
    try {
      setIsRevokingOtherSessions(true)
      const response = await revokeOtherSessions()
      pushToast(response.message || 'Đã đăng xuất khỏi thiết bị khác!', 'info')
      await loadSessions()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể đăng xuất khỏi thiết bị khác!', 'error')
    } finally {
      setIsRevokingOtherSessions(false)
    }
  }

  async function handleConfirmDialog() {
    if (!confirmDialog || isDeletingAccount) {
      return
    }

    await confirmDialog.onConfirm()
    setConfirmDialog(null)
  }

  return (
    <section className="profile-page settings-page" aria-labelledby="settings-title">
      <header className="profile-page-header settings-page-header">
        <div>
          <span className="section-kicker">
            <Settings size={14} />
            Cài đặt tài khoản
          </span>
          <h1 id="settings-title">Bảo mật và phiên đăng nhập</h1>
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-overview">
          <div className="settings-overview-icon">
            <ShieldCheck size={28} />
          </div>
          <strong>Trung tâm bảo mật</strong>
          <p>Quản lý mật khẩu, thiết bị đang đăng nhập và các hành động nhạy cảm của tài khoản.</p>
          <div className="settings-overview-list">
            <span>{sessionSummaryParts.length ? sessionSummaryParts.join(' · ') : 'Chưa có dữ liệu phiên'}</span>
            <span>{passwordForm.newPassword ? 'Đang soạn mật khẩu mới' : 'Mật khẩu chưa thay đổi'}</span>
          </div>
        </aside>

        <div className="settings-main">
          <form className="profile-form settings-card profile-password-form" onSubmit={handlePasswordSubmit}>
            <div className="profile-form-heading">
              <KeyRound size={18} />
              <div>
                <h2>Đổi mật khẩu</h2>
                <p>Nhập mật khẩu hiện tại để xác nhận thay đổi.</p>
              </div>
            </div>

            <label className="profile-field">
              <span><KeyRound size={16} /> Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                onChange={handlePasswordFieldChange}
                placeholder="Nhập mật khẩu hiện tại"
                type="password"
                value={passwordForm.currentPassword}
              />
              {passwordErrors.currentPassword ? (
                <span className="profile-field-error">{passwordErrors.currentPassword}</span>
              ) : null}
            </label>

            <label className="profile-field">
              <span><KeyRound size={16} /> Mật khẩu mới</span>
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="newPassword"
                onChange={handlePasswordFieldChange}
                placeholder="Tối thiểu 8 ký tự"
                type="password"
                value={passwordForm.newPassword}
              />
              {passwordErrors.newPassword ? (
                <span className="profile-field-error">{passwordErrors.newPassword}</span>
              ) : null}
            </label>

            <label className="profile-field">
              <span><KeyRound size={16} /> Xác nhận mật khẩu mới</span>
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="confirmNewPassword"
                onChange={handlePasswordFieldChange}
                placeholder="Nhập lại mật khẩu mới"
                type="password"
                value={passwordForm.confirmNewPassword}
              />
              {passwordErrors.confirmNewPassword ? (
                <span className="profile-field-error">{passwordErrors.confirmNewPassword}</span>
              ) : null}
            </label>

            <button className="profile-save-button" disabled={isChangingPassword} type="submit">
              <KeyRound size={18} />
              {isChangingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </form>

          <section className="profile-form settings-card profile-sessions-form" aria-labelledby="settings-sessions-title">
            <div className="profile-form-heading">
              <ShieldCheck size={18} />
              <div>
                <h2 id="settings-sessions-title">Phiên đăng nhập</h2>
                <p>Xem thiết bị đang đăng nhập và thu hồi phiên khi cần.</p>
              </div>
            </div>

            <div className="profile-session-toolbar">
              <button className="profile-session-button" disabled={isLoadingSessions} onClick={() => void loadSessions()} type="button">
                <RefreshCw size={14} />
                {isLoadingSessions ? 'Đang tải...' : 'Làm mới'}
              </button>
              <button
                className="profile-session-button profile-session-danger"
                disabled={isRevokingOtherSessions || activeSessions.length === 0}
                onClick={confirmRevokeOtherSessions}
                type="button"
              >
                <LogOut size={14} />
                {isRevokingOtherSessions ? 'Đang xử lý...' : 'Đăng xuất thiết bị khác'}
              </button>
            </div>

            <div className="profile-session-summary">
              <span>{sessionSummaryParts.length ? sessionSummaryParts.join(' · ') : 'Chưa có dữ liệu phiên'}</span>
              {hiddenSessionCount > 0 ? (
                <button
                  aria-controls="settings-session-list"
                  aria-expanded={showAllSessions}
                  className={showAllSessions ? 'profile-session-toggle is-open' : 'profile-session-toggle'}
                  onClick={handleToggleSessionHistory}
                  type="button"
                >
                  <ChevronDown size={16} />
                  {showAllSessions ? 'Ẩn lịch sử' : `Xem thêm ${hiddenSessionCount} phiên`}
                </button>
              ) : null}
            </div>

            <div
              className={showAllSessions ? 'profile-session-list is-expanded' : 'profile-session-list'}
              id="settings-session-list"
            >
              {sessions.length === 0 && !isLoadingSessions ? (
                <p className="profile-session-empty">Chưa có phiên đăng nhập nào!</p>
              ) : null}
              {sessionItems.map((session) => (
                <article
                  className={[
                    'profile-session-item',
                    session.revokedAt ? 'is-revoked' : '',
                    session.viewGroup === 'history' ? 'is-history' : '',
                    session.isCurrent ? 'is-current' : '',
                    session.isCollapsible ? 'is-collapsible' : '',
                    session.isCollapsible && !showAllSessions ? 'is-collapsed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={session.id}
                >
                  <div className="profile-session-icon">
                    <Laptop size={18} />
                  </div>
                  <div className="profile-session-main">
                    <div className="profile-session-title-row">
                      <strong>{getSessionTitle(session)}</strong>
                      {session.isCurrent ? <span>Hiện tại</span> : null}
                      {session.revokedAt ? <span>Đã thu hồi</span> : null}
                    </div>
                    <p>{session.userAgent || 'Không có thông tin trình duyệt!'}</p>
                    <div className="profile-session-meta">
                      <span>IP: {session.ipAddress || 'Không rõ!'}</span>
                      <span>Tạo lúc: {formatDateTime(session.createdAt)}</span>
                      <span>Hết hạn: {formatDateTime(session.expiresAt)}</span>
                    </div>
                  </div>
                  <button
                    className="profile-session-revoke"
                    disabled={Boolean(session.revokedAt) || revokingSessionId === session.id}
                    onClick={() => confirmRevokeSession(session)}
                    type="button"
                  >
                    <LogOut size={16} />
                    {revokingSessionId === session.id ? 'Đang thu hồi...' : 'Thu hồi'}
                  </button>
                </article>
              ))}
              {/* {!showAllSessions && hiddenSessionCount > 0 ? (
                <p className="profile-session-empty">
                  Đã ẩn {hiddenSessionCount} phiên cũ để giao diện gọn hơn.
                </p>
              ) : null} */}
            </div>
          </section>

          <form className="profile-form settings-card profile-danger-form" onSubmit={handleDeleteAccountSubmit}>
            <div className="profile-form-heading profile-danger-heading">
              <AlertTriangle size={18} />
              <div>
                <h2>Xoá tài khoản</h2>
                <p>Hành động này sẽ vô hiệu hoá tài khoản, xoá thông tin hồ sơ và đăng xuất khỏi mọi phiên đăng nhập.</p>
              </div>
            </div>

            <label className="profile-field">
              <span><KeyRound size={16} /> Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                name="password"
                onChange={handleDeleteFieldChange}
                placeholder="Nhập mật khẩu hiện tại"
                type="password"
                value={deleteForm.password}
              />
              {deleteErrors.password ? (
                <span className="profile-field-error">{deleteErrors.password}</span>
              ) : null}
            </label>

            <label className="profile-field">
              <span><Trash2 size={16} /> Nhập XOA TAI KHOAN</span>
              <input
                autoComplete="off"
                name="confirmationText"
                onChange={handleDeleteFieldChange}
                placeholder="XOA TAI KHOAN"
                value={deleteForm.confirmationText}
              />
              {deleteErrors.confirmationText ? (
                <span className="profile-field-error">{deleteErrors.confirmationText}</span>
              ) : null}
            </label>

            <button className="profile-save-button profile-delete-button" disabled={isDeletingAccount} type="submit">
              <Trash2 size={18} />
              {isDeletingAccount ? 'Đang xoá tài khoản...' : 'Xoá tài khoản'}
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isDeletingAccount}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void handleConfirmDialog()}
      />
    </section>
  )
}
