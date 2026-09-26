import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  IdCard,
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
  updatePrivacy,
  type ChangePasswordPayload,
  type DeleteAccountPayload,
  type UserSession,
} from '../../services/api/userApi'
import type { AuthUser } from '../../services/api/authApi'
import { ConfirmDialog, type ConfirmDialogState } from '../ui/ConfirmDialog'

type SettingsPageProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onLogout?: () => void
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type SessionViewModel = UserSession & {
  viewGroup: 'current' | 'active' | 'history'
  isCollapsible?: boolean
}

const RECENT_SESSION_DISPLAY_LIMIT = 5
const REFRESH_COOLDOWN_SECONDS = 10

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
  ].filter((r): r is string => typeof r === 'string')

  if (!form.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại!'
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
  if (!form.password) errors.password = 'Vui lòng nhập mật khẩu hiện tại!'
  if (form.confirmationText.trim() !== 'XOA TAI KHOAN')
    errors.confirmationText = 'Vui lòng nhập chính xác XOA TAI KHOAN!'
  return errors
}

function formatDateTime(value: string | null) {
  if (!value) return 'Chưa có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function getSessionTitle(session: UserSession) {
  if (session.deviceName) return session.deviceName
  if (!session.userAgent) return 'Thiết bị không xác định'
  if (/Mobile|Android|iPhone|iPad/i.test(session.userAgent)) return 'Thiết bị di động'
  return 'Trình duyệt Web'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ToggleRowProps = {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label className="sp-toggle-row">
      <div className="sp-toggle-text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </div>
      <div className="sp-toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="sp-toggle-track">
          <div className="sp-toggle-thumb" />
        </div>
      </div>
    </label>
  )
}

type CardProps = {
  icon: React.ReactNode
  iconVariant?: 'default' | 'neutral' | 'danger'
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  dangerBorder?: boolean
  id?: string
}

function Card({ id, icon, iconVariant = 'default', title, description, children, footer, dangerBorder }: CardProps) {
  return (
    <div id={id} className={`sp-card${dangerBorder ? ' sp-card--danger' : ''}`}>
      <div className="sp-card-header">
        <div className={`sp-card-icon sp-card-icon--${iconVariant}`}>{icon}</div>
        <div className="sp-card-header-text">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="sp-card-body">{children}</div>
      {footer && <div className="sp-card-footer">{footer}</div>}
    </div>
  )
}

type SessionItemProps = {
  session: SessionViewModel
  isRevoking: boolean
  showAllSessions: boolean
  onRevoke: (session: UserSession) => void
}

function SessionItem({ session, isRevoking, showAllSessions, onRevoke }: SessionItemProps) {
  const classNames = [
    'sp-session-item',
    session.revokedAt ? 'sp-session-item--revoked' : '',
    session.isCurrent ? 'sp-session-item--current' : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={classNames}>
      <div className="sp-session-icon">
        <Laptop size={16} />
      </div>
      <div className="sp-session-main">
        <div className="sp-session-title-row">
          <strong>{getSessionTitle(session)}</strong>
          {session.isCurrent && <span className="sp-badge sp-badge--current">Hiện tại</span>}
          {session.revokedAt && <span className="sp-badge sp-badge--revoked">Đã thu hồi</span>}
        </div>
        <div className="sp-session-meta">
          <span>IP: {session.ipAddress || 'Không rõ'}</span>
          <span>Tạo lúc: {formatDateTime(session.createdAt)}</span>
          <span>Hết hạn: {formatDateTime(session.expiresAt)}</span>
        </div>
      </div>
      <button
        className="sp-btn sp-btn--danger sp-btn--sm"
        disabled={Boolean(session.revokedAt) || isRevoking}
        onClick={() => onRevoke(session)}
        tabIndex={session.isCollapsible && !showAllSessions ? -1 : undefined}
        type="button"
      >
        <LogOut size={13} />
        {isRevoking ? 'Đang thu hồi...' : 'Thu hồi'}
      </button>
    </article>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsPage({
  currentUser, onAccountDeleted, onLogout, onUserChange, pushToast,
}: SettingsPageProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)
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

  // Privacy toggles
  const [showActivityStatus, setShowActivityStatus] = useState(currentUser?.showActivityStatus ?? true)
  const [showTypingIndicator, setShowTypingIndicator] = useState(currentUser?.showTypingIndicator ?? true)
  const [showReadReceipts, setShowReadReceipts] = useState(currentUser?.showReadReceipts ?? true)
  const [showPhone, setShowPhone] = useState(currentUser?.showPhone ?? true)
  const [showAddress, setShowAddress] = useState(currentUser?.showAddress ?? true)
  const [showGender, setShowGender] = useState(currentUser?.showGender ?? true)
  const [showBirthDate, setShowBirthDate] = useState(currentUser?.showBirthDate ?? true)
  const [showBio, setShowBio] = useState(currentUser?.showBio ?? true)
  const [showStatusMessage, setShowStatusMessage] = useState(currentUser?.showStatusMessage ?? true)

  // Session expansion
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [renderExpandedSessions, setRenderExpandedSessions] = useState(false)
  const [expandedSessionHeight, setExpandedSessionHeight] = useState(0)
  const expandedSessionsRef = useRef<HTMLDivElement | null>(null)
  const cooldownIntervalRef = useRef<number | null>(null)
  const [refreshCooldown, setRefreshCooldown] = useState(0)

  const [activeSection, setActiveSection] = useState<string>('privacy-activity')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0
        let visibleSection = ''
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio
            visibleSection = entry.target.id
          }
        })
        if (visibleSection) {
          setActiveSection(visibleSection)
        }
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    const sections = ['privacy-activity', 'privacy-profile', 'password', 'sessions', 'delete-account']
    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setActiveSection(id)
  }

  // Derived session data
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    if (Boolean(a.revokedAt) !== Boolean(b.revokedAt)) return a.revokedAt ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const currentSession = sortedSessions.find((s) => s.isCurrent)
  const activeSessions = sortedSessions.filter((s) => !s.isCurrent && !s.revokedAt)
  const historySessions = sortedSessions.filter((s) => !s.isCurrent && s.revokedAt)
  const otherRecentSessions = sortedSessions
    .filter((s) => !s.isCurrent)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, currentSession ? RECENT_SESSION_DISPLAY_LIMIT - 1 : RECENT_SESSION_DISPLAY_LIMIT)
  const hiddenSessionCount = otherRecentSessions.length
  const sessionSummaryParts = [
    `${activeSessions.length + (currentSession ? 1 : 0)} đang hoạt động`,
    historySessions.length ? `${historySessions.length} đã thu hồi` : '',
  ].filter(Boolean)
  const sessionItems: SessionViewModel[] = [
    ...(currentSession ? [{ ...currentSession, viewGroup: 'current' as const }] : []),
  ]
  const expandedSessionItems: SessionViewModel[] = otherRecentSessions.map((s) => ({
    ...s,
    viewGroup: s.revokedAt ? ('history' as const) : ('active' as const),
    isCollapsible: true,
  }))

  // Effects
  useEffect(() => { loadSessions() }, [])

  useEffect(() => {
    setShowActivityStatus(currentUser?.showActivityStatus ?? true)
    setShowTypingIndicator(currentUser?.showTypingIndicator ?? true)
    setShowReadReceipts(currentUser?.showReadReceipts ?? true)
    setShowPhone(currentUser?.showPhone ?? true)
    setShowAddress(currentUser?.showAddress ?? true)
    setShowGender(currentUser?.showGender ?? true)
    setShowBirthDate(currentUser?.showBirthDate ?? true)
    setShowBio(currentUser?.showBio ?? true)
    setShowStatusMessage(currentUser?.showStatusMessage ?? true)
  }, [
    currentUser?.showActivityStatus, currentUser?.showTypingIndicator, currentUser?.showReadReceipts,
    currentUser?.showPhone, currentUser?.showAddress, currentUser?.showGender,
    currentUser?.showBirthDate, currentUser?.showBio, currentUser?.showStatusMessage,
  ])

  useEffect(() => {
    if (showAllSessions) { setRenderExpandedSessions(true); return undefined }
    const t = window.setTimeout(() => setRenderExpandedSessions(false), 340)
    return () => window.clearTimeout(t)
  }, [showAllSessions])

  useEffect(() => {
    if (!renderExpandedSessions) { setExpandedSessionHeight(0); return }
    const el = expandedSessionsRef.current
    if (!el) return
    const update = () => setExpandedSessionHeight(el.scrollHeight)
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [renderExpandedSessions, sessions])

  // Handlers
  async function loadSessions() {
    try {
      setIsLoadingSessions(true)
      const res = await fetchSessions()
      setSessions(res.sessions)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể tải phiên đăng nhập!', 'error')
    } finally {
      setIsLoadingSessions(false)
      startRefreshCooldown()
    }
  }

  function startRefreshCooldown() {
    if (cooldownIntervalRef.current) window.clearInterval(cooldownIntervalRef.current)
    setRefreshCooldown(REFRESH_COOLDOWN_SECONDS)
    cooldownIntervalRef.current = window.setInterval(() => {
      setRefreshCooldown((prev) => {
        if (prev <= 1) { window.clearInterval(cooldownIntervalRef.current!); cooldownIntervalRef.current = null; return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function handleToggleSessionHistory() {
    if (showAllSessions) { setShowAllSessions(false); return }
    setRenderExpandedSessions(true)
    window.requestAnimationFrame(() => setShowAllSessions(true))
  }

  function handlePasswordFieldChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setPasswordForm((c) => ({ ...c, [name]: value }))
    setPasswordErrors((c) => ({ ...c, [name]: '' }))
  }

  function handleDeleteFieldChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setDeleteForm((c) => ({ ...c, [name]: value }))
    setDeleteErrors((c) => ({ ...c, [name]: '' }))
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errors = validatePasswordForm(passwordForm)
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      pushToast('Vui lòng kiểm tra lại thông tin đổi mật khẩu!', 'error')
      return
    }
    try {
      setIsChangingPassword(true)
      setPasswordErrors({})
      const res = await changePassword(passwordForm)
      setPasswordForm(initialPasswordForm)
      pushToast(res.message || 'Đã đổi mật khẩu!', 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể đổi mật khẩu!', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handlePrivacyChange(
    key: 'showActivityStatus' | 'showTypingIndicator' | 'showReadReceipts' | 'showPhone' | 'showAddress' |
         'showGender' | 'showBirthDate' | 'showBio' | 'showStatusMessage',
    value: boolean,
  ) {
    const setters: Record<typeof key, (v: boolean) => void> = {
      showActivityStatus: setShowActivityStatus,
      showTypingIndicator: setShowTypingIndicator,
      showReadReceipts: setShowReadReceipts,
      showPhone: setShowPhone,
      showAddress: setShowAddress,
      showGender: setShowGender,
      showBirthDate: setShowBirthDate,
      showBio: setShowBio,
      showStatusMessage: setShowStatusMessage,
    }
    setters[key](value)

    const payload = {
      showActivityStatus: key === 'showActivityStatus' ? value : showActivityStatus,
      showTypingIndicator: key === 'showTypingIndicator' ? value : showTypingIndicator,
      showReadReceipts: key === 'showReadReceipts' ? value : showReadReceipts,
      showPhone: key === 'showPhone' ? value : showPhone,
      showAddress: key === 'showAddress' ? value : showAddress,
      showGender: key === 'showGender' ? value : showGender,
      showBirthDate: key === 'showBirthDate' ? value : showBirthDate,
      showBio: key === 'showBio' ? value : showBio,
      showStatusMessage: key === 'showStatusMessage' ? value : showStatusMessage,
    }

    try {
      setIsSavingPrivacy(true)
      const res = await updatePrivacy(payload)
      onUserChange(res.user)
      pushToast(res.message || 'Đã cập nhật quyền riêng tư!', 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể cập nhật quyền riêng tư!', 'error')
      setters[key](!value)
    } finally {
      setIsSavingPrivacy(false)
    }
  }

  async function handleDeleteAccountSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể xóa tài khoản!', 'error')
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
      const res = await revokeSession(sessionId)
      if (res.revokedCurrentSession) { pushToast('Đã thu hồi phiên hiện tại!', 'info'); onLogout?.(); return }
      pushToast(res.message || 'Đã thu hồi phiên đăng nhập!', 'info')
      await loadSessions()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể thu hồi phiên đăng nhập!', 'error')
    } finally {
      setRevokingSessionId(null)
    }
  }

  async function revokeAllOtherSessions() {
    try {
      setIsRevokingOtherSessions(true)
      const res = await revokeOtherSessions()
      pushToast(res.message || 'Đã đăng xuất khỏi thiết bị khác!', 'info')
      await loadSessions()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể đăng xuất khỏi thiết bị khác!', 'error')
    } finally {
      setIsRevokingOtherSessions(false)
    }
  }

  async function handleConfirmDialog() {
    if (!confirmDialog || isDeletingAccount) return
    await confirmDialog.onConfirm()
    setConfirmDialog(null)
  }

  return (
    <section className="sp-page" aria-labelledby="settings-title">
      <header className="sp-page-header">
        <div className="sp-page-kicker">
          <Settings size={12} />
          Cài đặt tài khoản
        </div>
        <h1 id="settings-title">Bảo mật &amp; Phiên đăng nhập</h1>
      </header>

      <div className="sp-layout">
        {/* Sidebar nav */}
        <nav className="sp-nav" aria-label="Điều hướng cài đặt">
          <button className={`sp-nav-item${activeSection === 'privacy-activity' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('privacy-activity')}>
            <Eye size={15} /> Quyền riêng tư
          </button>
          <button className={`sp-nav-item${activeSection === 'privacy-profile' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('privacy-profile')}>
            <IdCard size={15} /> Hồ sơ
          </button>
          <button className={`sp-nav-item${activeSection === 'password' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('password')}>
            <KeyRound size={15} /> Mật khẩu
          </button>
          <button className={`sp-nav-item${activeSection === 'sessions' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('sessions')}>
            <ShieldCheck size={15} /> Phiên đăng nhập
          </button>
          <div className="sp-nav-divider" />
          <button className={`sp-nav-item sp-nav-item--danger${activeSection === 'delete-account' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('delete-account')}>
            <Trash2 size={15} /> Xóa tài khoản
          </button>
        </nav>

        <div className="sp-main">
          {/* Privacy: activity */}
          <Card
            id="privacy-activity"
            icon={showActivityStatus ? <Eye size={16} /> : <EyeOff size={16} />}
            title="Quyền riêng tư"
            description="Trạng thái hoạt động và thông báo đã đọc tin nhắn."
          >
            <div className="sp-toggle-group">
              <ToggleRow
                label="Hiển thị Last seen / Online"
                description={showActivityStatus ? 'Bạn bè có thể thấy bạn đang online.' : 'Người khác sẽ thấy bạn ngoại tuyến.'}
                checked={showActivityStatus}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showActivityStatus', v)}
              />
              <ToggleRow
                label="Hiển thị chỉ báo đang nhập"
                description={showTypingIndicator ? 'Người khác sẽ biết khi bạn đang gõ tin nhắn.' : 'Ẩn trạng thái đang gõ tin nhắn.'}
                checked={showTypingIndicator}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showTypingIndicator', v)}
              />
              <ToggleRow
                label="Hiển thị đã đọc"
                description={showReadReceipts ? 'Đối phương biết khi bạn đã xem tin nhắn.' : 'Người khác không biết bạn đã xem.'}
                checked={showReadReceipts}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showReadReceipts', v)}
              />
            </div>
          </Card>

          {/* Privacy: profile visibility */}
          <Card
            id="privacy-profile"
            icon={<IdCard size={16} />}
            iconVariant="neutral"
            title="Hiển thị trên hồ sơ"
            description="Thông tin cá nhân hiển thị với người trong danh bạ."
          >
            <div className="sp-toggle-group">
              <ToggleRow label="Số điện thoại" description={showPhone ? 'Mọi người có thể xem số của bạn.' : 'Số điện thoại của bạn sẽ được ẩn.'} checked={showPhone} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showPhone', v)} />
              <ToggleRow label="Trạng thái cá nhân" description={showStatusMessage ? 'Hiển thị status message trên hồ sơ.' : 'Ẩn status message của bạn.'} checked={showStatusMessage} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showStatusMessage', v)} />
              <ToggleRow label="Địa chỉ" description={showAddress ? 'Mọi người có thể xem địa chỉ của bạn.' : 'Địa chỉ của bạn sẽ được ẩn.'} checked={showAddress} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showAddress', v)} />
              <ToggleRow label="Giới tính" checked={showGender} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showGender', v)} />
              <ToggleRow label="Ngày sinh" checked={showBirthDate} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBirthDate', v)} />
              <ToggleRow label="Bio" description={showBio ? 'Hiển thị phần giới thiệu bản thân.' : 'Ẩn phần giới thiệu bản thân.'} checked={showBio} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBio', v)} />
            </div>
          </Card>

          {/* Password */}
          <Card
            id="password"
            icon={<KeyRound size={16} />}
            title="Đổi mật khẩu"
            description="Xác nhận bằng mật khẩu hiện tại trước khi thay đổi."
            footer={
              <button
                className="sp-btn sp-btn--primary"
                disabled={isChangingPassword || (!passwordForm.currentPassword && !passwordForm.newPassword && !passwordForm.confirmNewPassword)}
                form="password-form"
                type="submit"
              >
                <KeyRound size={14} />
                {isChangingPassword ? 'Đang lưu...' : 'Lưu mật khẩu'}
              </button>
            }
          >
            <form id="password-form" className="sp-field-group" onSubmit={handlePasswordSubmit}>
              <div className="sp-field">
                <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
                <input
                  autoComplete="current-password"
                  id="currentPassword"
                  name="currentPassword"
                  onChange={handlePasswordFieldChange}
                  placeholder="••••••••"
                  type="password"
                  value={passwordForm.currentPassword}
                />
                {passwordErrors.currentPassword && <span className="sp-field-error">{passwordErrors.currentPassword}</span>}
              </div>
              <div className="sp-field">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <input
                  autoComplete="new-password"
                  id="newPassword"
                  maxLength={72}
                  minLength={8}
                  name="newPassword"
                  onChange={handlePasswordFieldChange}
                  placeholder="Tối thiểu 8 ký tự"
                  type="password"
                  value={passwordForm.newPassword}
                />
                {passwordErrors.newPassword && <span className="sp-field-error">{passwordErrors.newPassword}</span>}
              </div>
              <div className="sp-field">
                <label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</label>
                <input
                  autoComplete="new-password"
                  id="confirmNewPassword"
                  maxLength={72}
                  minLength={8}
                  name="confirmNewPassword"
                  onChange={handlePasswordFieldChange}
                  placeholder="Nhập lại mật khẩu mới"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                />
                {passwordErrors.confirmNewPassword && <span className="sp-field-error">{passwordErrors.confirmNewPassword}</span>}
              </div>
            </form>
          </Card>

          {/* Sessions */}
          <section id="sessions" className="sp-card" aria-labelledby="sessions-title">
            <div className="sp-card-header">
              <div className="sp-card-icon sp-card-icon--default">
                <ShieldCheck size={16} />
              </div>
              <div className="sp-card-header-text">
                <h2 id="sessions-title">Phiên đăng nhập</h2>
                <p>Xem và thu hồi các thiết bị đang đăng nhập.</p>
              </div>
            </div>
            <div className="sp-card-body">
              <div className="sp-session-toolbar">
                <button
                  className="sp-btn sp-btn--ghost"
                  disabled={isLoadingSessions || refreshCooldown > 0}
                  onClick={() => void loadSessions()}
                  type="button"
                >
                  <RefreshCw size={13} className={isLoadingSessions ? 'spin' : ''} />
                  {isLoadingSessions ? 'Đang tải...' : refreshCooldown > 0 ? `Làm mới (${refreshCooldown}s)` : 'Làm mới'}
                </button>
                <button
                  className="sp-btn sp-btn--danger"
                  disabled={isRevokingOtherSessions || activeSessions.length === 0}
                  onClick={confirmRevokeOtherSessions}
                  type="button"
                >
                  <LogOut size={13} />
                  {isRevokingOtherSessions ? 'Đang xử lý...' : 'Đăng xuất thiết bị khác'}
                </button>
              </div>

              <div className="sp-session-summary">
                <span>{sessionSummaryParts.length ? sessionSummaryParts.join(' · ') : 'Chưa có dữ liệu phiên'}</span>
                {hiddenSessionCount > 0 && (
                  <button
                    aria-controls="session-list-expanded"
                    aria-expanded={showAllSessions}
                    className="sp-toggle-link"
                    onClick={handleToggleSessionHistory}
                    type="button"
                  >
                    <ChevronDown size={12} className={showAllSessions ? 'rotate-180' : ''} />
                    {showAllSessions ? 'Ẩn lịch sử' : `Xem thêm ${hiddenSessionCount} phiên`}
                  </button>
                )}
              </div>

              <div className="sp-session-list">
                {sessions.length === 0 && !isLoadingSessions && (
                  <p className="sp-session-empty">Chưa có phiên đăng nhập nào!</p>
                )}
                {sessionItems.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isRevoking={revokingSessionId === session.id}
                    showAllSessions={showAllSessions}
                    onRevoke={confirmRevokeSession}
                  />
                ))}

                {renderExpandedSessions && (
                  <div
                    aria-hidden={!showAllSessions}
                    className={`sp-session-expansion${showAllSessions ? ' sp-session-expansion--open' : ''}`}
                    id="session-list-expanded"
                    style={{ maxHeight: showAllSessions ? expandedSessionHeight : 0 }}
                  >
                    <div className="sp-session-expansion-inner" ref={expandedSessionsRef}>
                      {expandedSessionItems.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          isRevoking={revokingSessionId === session.id}
                          showAllSessions={showAllSessions}
                          onRevoke={confirmRevokeSession}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Delete account */}
          <Card
            id="delete-account"
            icon={<AlertTriangle size={16} />}
            iconVariant="danger"
            title="Xóa tài khoản"
            description="Vô hiệu hóa tài khoản, xóa hồ sơ và đăng xuất mọi phiên. Hành động không thể hoàn tác."
            dangerBorder
            footer={
              <button
                className="sp-btn sp-btn--danger"
                disabled={isDeletingAccount || (!deleteForm.password && !deleteForm.confirmationText)}
                form="delete-form"
                type="submit"
              >
                <Trash2 size={14} />
                {isDeletingAccount ? 'Đang xóa...' : 'Xóa tài khoản'}
              </button>
            }
          >
            <form id="delete-form" className="sp-field-group" onSubmit={handleDeleteAccountSubmit}>
              <div className="sp-field">
                <label htmlFor="delete-password">Mật khẩu hiện tại</label>
                <input
                  autoComplete="current-password"
                  id="delete-password"
                  name="password"
                  onChange={handleDeleteFieldChange}
                  placeholder="Xác nhận danh tính"
                  type="password"
                  value={deleteForm.password}
                />
                {deleteErrors.password && <span className="sp-field-error">{deleteErrors.password}</span>}
              </div>
              <div className="sp-field">
                <label htmlFor="delete-confirm">Nhập XOA TAI KHOAN để xác nhận</label>
                <input
                  autoComplete="off"
                  id="delete-confirm"
                  name="confirmationText"
                  onChange={handleDeleteFieldChange}
                  placeholder="XOA TAI KHOAN"
                  value={deleteForm.confirmationText}
                />
                {deleteErrors.confirmationText && <span className="sp-field-error">{deleteErrors.confirmationText}</span>}
              </div>
            </form>
          </Card>
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
