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
import { TwoFactorSettings } from './TwoFactorSettings'
import { useTranslation } from 'react-i18next'

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

function validatePasswordForm(form: ChangePasswordPayload, t: any) {
  const errors: Partial<Record<keyof ChangePasswordPayload, string>> = {}
  const requirements = [
    form.newPassword.length >= 8 || t('reqMin8'),
    form.newPassword.length <= 72 || t('reqMax72'),
    !/\s/.test(form.newPassword) || t('reqNoSpace'),
    /[a-z]/.test(form.newPassword) || t('reqLower'),
    /[A-Z]/.test(form.newPassword) || t('reqUpper'),
    /[0-9]/.test(form.newPassword) || t('reqDigit'),
    /[^A-Za-z0-9]/.test(form.newPassword) || t('reqSpecial'),
  ].filter((r): r is string => typeof r === 'string')

  if (!form.currentPassword) errors.currentPassword = t('errCurrentPwd')
  if (!form.newPassword) {
    errors.newPassword = t('errNewPwd')
  } else if (requirements.length) {
    errors.newPassword = t('errNewPwdReq', { requirements: requirements.join(', ') })
  } else if (form.currentPassword && form.currentPassword === form.newPassword) {
    errors.newPassword = t('errPwdDiff')
  }
  if (!form.confirmNewPassword) {
    errors.confirmNewPassword = t('errConfirmPwd')
  } else if (form.newPassword && form.confirmNewPassword !== form.newPassword) {
    errors.confirmNewPassword = t('errConfirmMismatch')
  }
  return errors
}

function validateDeleteForm(form: DeleteAccountPayload, t: any) {
  const errors: Partial<Record<keyof DeleteAccountPayload, string>> = {}
  if (!form.password) errors.password = t('errDeletePwd')
  if (form.confirmationText.trim() !== t('deleteConfirmText'))
    errors.confirmationText = t('errDeleteConfirm')
  return errors
}

function formatDateTime(value: string | null, t: any) {
  if (!value) return t('notAvailable')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function getSessionTitle(session: UserSession, t: any) {
  if (session.deviceName) return session.deviceName
  if (!session.userAgent) return t('sessionUnknown')
  if (/Mobile|Android|iPhone|iPad/i.test(session.userAgent)) return t('sessionMobile')
  return t('sessionWeb')
}

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
  t: any
}

function SessionItem({ session, isRevoking, showAllSessions, onRevoke, t }: SessionItemProps) {
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
          <strong>{getSessionTitle(session, t)}</strong>
          {session.isCurrent && <span className="sp-badge sp-badge--current">{t('sessionCurrent')}</span>}
          {session.revokedAt && <span className="sp-badge sp-badge--revoked">{t('sessionRevoked')}</span>}
        </div>
        <div className="sp-session-meta">
          <span>{t('ip')}: {session.ipAddress || t('sessionUnknown')}</span>
          <span>{t('createdAt')}: {formatDateTime(session.createdAt, t)}</span>
          <span>{t('expiresAt')}: {formatDateTime(session.expiresAt, t)}</span>
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
        {isRevoking ? t('revoking') : t('revokeBtn')}
      </button>
    </article>
  )
}

export function SettingsPage({
  currentUser, onAccountDeleted, onLogout, onUserChange, pushToast,
}: SettingsPageProps) {
  const { t, i18n } = useTranslation('settings')
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

  const [showActivityStatus, setShowActivityStatus] = useState(currentUser?.showActivityStatus ?? true)
  const [showTypingIndicator, setShowTypingIndicator] = useState(currentUser?.showTypingIndicator ?? true)
  const [showReadReceipts, setShowReadReceipts] = useState(currentUser?.showReadReceipts ?? true)
  const [showPhone, setShowPhone] = useState(currentUser?.showPhone ?? true)
  const [showAddress, setShowAddress] = useState(currentUser?.showAddress ?? true)
  const [showGender, setShowGender] = useState(currentUser?.showGender ?? true)
  const [showBirthDate, setShowBirthDate] = useState(currentUser?.showBirthDate ?? true)
  const [showBio, setShowBio] = useState(currentUser?.showBio ?? true)
  const [showStatusMessage, setShowStatusMessage] = useState(currentUser?.showStatusMessage ?? true)
  const [allowCamera, setAllowCamera] = useState(() => localStorage.getItem('allowCamera') !== 'false')
  const [allowMicrophone, setAllowMicrophone] = useState(() => localStorage.getItem('allowMicrophone') !== 'false')

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

    const sections = ['privacy-activity', 'device-settings', 'app-settings', 'privacy-profile', 'password', 'two-factor', 'sessions', 'delete-account']
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
    t('activeSessionsSummary', { count: activeSessions.length + (currentSession ? 1 : 0) }),
    historySessions.length ? t('revokedSessionsSummary', { count: historySessions.length }) : '',
  ].filter(Boolean)
  const sessionItems: SessionViewModel[] = [
    ...(currentSession ? [{ ...currentSession, viewGroup: 'current' as const }] : []),
  ]
  const expandedSessionItems: SessionViewModel[] = otherRecentSessions.map((s) => ({
    ...s,
    viewGroup: s.revokedAt ? ('history' as const) : ('active' as const),
    isCollapsible: true,
  }))

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

  async function loadSessions() {
    try {
      setIsLoadingSessions(true)
      const res = await fetchSessions()
      setSessions(res.sessions)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('toastLoadSessionsErr'), 'error')
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
    const errors = validatePasswordForm(passwordForm, t)
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      pushToast(t('toastPwdInvalid'), 'error')
      return
    }
    try {
      setIsChangingPassword(true)
      setPasswordErrors({})
      const res = await changePassword(passwordForm)
      setPasswordForm(initialPasswordForm)
      pushToast(res.message || t('toastPwdChanged'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('toastPwdErr'), 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  function handleAllowCameraChange(value: boolean) {
    setAllowCamera(value)
    localStorage.setItem('allowCamera', String(value))
    pushToast(value ? t('toastCamOn') : t('toastCamOff'), 'info')
  }

  function handleAllowMicrophoneChange(value: boolean) {
    setAllowMicrophone(value)
    localStorage.setItem('allowMicrophone', String(value))
    pushToast(value ? t('toastMicOn') : t('toastMicOff'), 'info')
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
      pushToast(res.message || t('toastPrivacySaved'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('toastPrivacyErr'), 'error')
      setters[key](!value)
    } finally {
      setIsSavingPrivacy(false)
    }
  }

  async function handleDeleteAccountSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errors = validateDeleteForm(deleteForm, t)
    if (Object.keys(errors).length > 0) {
      setDeleteErrors(errors)
      pushToast(t('toastDeleteInvalid'), 'error')
      return
    }
    setConfirmDialog({
      title: t('delDialogTitle'),
      description: t('delDialogDesc'),
      confirmLabel: t('deleteBtn'),
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
      pushToast(err instanceof Error ? err.message : t('toastDeleteErr'), 'error')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  function confirmRevokeSession(session: UserSession) {
    setConfirmDialog({
      title: session.isCurrent ? t('revokeCurrentTitle') : t('revokeOtherTitle'),
      description: session.isCurrent ? t('revokeCurrentDesc') : t('revokeOtherDesc'),
      confirmLabel: session.isCurrent ? t('revokeCurrentBtn') : t('revokeOtherBtn'),
      tone: 'danger',
      onConfirm: () => revokeOneSession(session.id),
    })
  }

  function confirmRevokeOtherSessions() {
    setConfirmDialog({
      title: t('revokeAllTitle'),
      description: t('revokeAllDesc'),
      confirmLabel: t('revokeAllBtn'),
      tone: 'danger',
      onConfirm: revokeAllOtherSessions,
    })
  }

  async function revokeOneSession(sessionId: string) {
    try {
      setRevokingSessionId(sessionId)
      const res = await revokeSession(sessionId)
      if (res.revokedCurrentSession) { pushToast(t('toastRevokeCurrent'), 'info'); onLogout?.(); return }
      pushToast(res.message || t('toastRevokeSuccess'), 'info')
      await loadSessions()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('toastRevokeErr'), 'error')
    } finally {
      setRevokingSessionId(null)
    }
  }

  async function revokeAllOtherSessions() {
    try {
      setIsRevokingOtherSessions(true)
      const res = await revokeOtherSessions()
      pushToast(res.message || t('toastRevokeAllSuccess'), 'info')
      await loadSessions()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('toastRevokeAllErr'), 'error')
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
          {t('pageKicker')}
        </div>
        <h1 id="settings-title">{t('pageTitle')}</h1>
      </header>

      <div className="sp-layout">
        <nav className="sp-nav" aria-label={t('navSettings')}>
          <button className={`sp-nav-item${activeSection === 'privacy-activity' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('privacy-activity')}>
            <Eye size={15} /> {t('navPrivacy')}
          </button>
          <button className={`sp-nav-item${activeSection === 'device-settings' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('device-settings')}>
            <Laptop size={15} /> {t('navDevice')}
          </button>
          <button className={`sp-nav-item${activeSection === 'privacy-profile' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('privacy-profile')}>
            <IdCard size={15} /> {t('navProfile')}
          </button>
          <button className={`sp-nav-item${activeSection === 'password' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('password')}>
            <KeyRound size={15} /> {t('navPassword')}
          </button>
          <button className={`sp-nav-item${activeSection === 'two-factor' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('two-factor')}>
            <ShieldCheck size={15} /> {t('navTwoFactor', { defaultValue: 'Xác thực 2 bước' })}
          </button>
          <button className={`sp-nav-item${activeSection === 'sessions' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('sessions')}>
            <Laptop size={15} /> {t('navSessions')}
          </button>
          <div className="sp-nav-divider" />
          <button className={`sp-nav-item sp-nav-item--danger${activeSection === 'delete-account' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('delete-account')}>
            <Trash2 size={15} /> {t('navDelete')}
          </button>
        </nav>

        <div className="sp-main">
          <Card
            id="privacy-activity"
            icon={showActivityStatus ? <Eye size={16} /> : <EyeOff size={16} />}
            title={t('privacyActivity')}
            description={t('privacyActivityDesc')}
          >
            <div className="sp-toggle-group">
              <ToggleRow
                label={t('showOnline')}
                description={showActivityStatus ? t('showOnlineDesc') : t('showOnlineDescOff')}
                checked={showActivityStatus}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showActivityStatus', v)}
              />
              <ToggleRow
                label={t('showTyping')}
                description={showTypingIndicator ? t('showTypingDesc') : t('showTypingDescOff')}
                checked={showTypingIndicator}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showTypingIndicator', v)}
              />
              <ToggleRow
                label={t('showRead')}
                description={showReadReceipts ? t('showReadDesc') : t('showReadDescOff')}
                checked={showReadReceipts}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showReadReceipts', v)}
              />
            </div>
          </Card>

          <Card
            id="device-settings"
            icon={<Laptop size={16} />}
            title={t('deviceTitle')}
            description={t('deviceDesc')}
          >
            <div className="sp-toggle-group">
              <ToggleRow
                label={t('allowCamera')}
                description={allowCamera ? t('allowCameraDesc') : t('allowCameraDescOff')}
                checked={allowCamera}
                onChange={handleAllowCameraChange}
              />
              <ToggleRow
                label={t('allowMicrophone')}
                description={allowMicrophone ? t('allowMicrophoneDesc') : t('allowMicrophoneDescOff')}
                checked={allowMicrophone}
                onChange={handleAllowMicrophoneChange}
              />
            </div>
          </Card>

          <Card
            id="app-settings"
            icon={<Settings size={16} />}
            title={t('appTitle')}
            description={t('appDesc')}
          >
            <div className="sp-toggle-group">
              <label className="sp-toggle-row">
                <div className="sp-toggle-text">
                  <strong>{t('language')}</strong>
                  <small>{t('languageDesc')}</small>
                </div>
                <div className="sp-toggle-select">
                  <select
                    className="sp-select"
                    value={i18n.language}
                    onChange={(e) => {
                      i18n.changeLanguage(e.target.value)
                      localStorage.setItem('language', e.target.value)
                    }}
                  >
                    <option value="en">English (US)</option>
                    <option value="vi">Tiếng Việt (VN)</option>
                  </select>
                </div>
              </label>
            </div>
          </Card>

          <Card
            id="privacy-profile"
            icon={<IdCard size={16} />}
            iconVariant="neutral"
            title={t('profileDisplay')}
            description={t('profileDisplayDesc')}
          >
            <div className="sp-toggle-group">
              <ToggleRow label={t('phone')} description={showPhone ? t('phoneDesc') : t('phoneDescOff')} checked={showPhone} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showPhone', v)} />
              <ToggleRow label={t('statusMsg')} description={showStatusMessage ? t('statusMsgDesc') : t('statusMsgDescOff')} checked={showStatusMessage} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showStatusMessage', v)} />
              <ToggleRow label={t('address')} description={showAddress ? t('addressDesc') : t('addressDescOff')} checked={showAddress} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showAddress', v)} />
              <ToggleRow label={t('gender')} checked={showGender} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showGender', v)} />
              <ToggleRow label={t('birthDate')} checked={showBirthDate} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBirthDate', v)} />
              <ToggleRow label={t('bio')} description={showBio ? t('bioDesc') : t('bioDescOff')} checked={showBio} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBio', v)} />
            </div>
          </Card>

          <Card
            id="password"
            icon={<KeyRound size={16} />}
            title={t('changePwd')}
            description={t('changePwdDesc')}
            footer={
              <button
                className="sp-btn sp-btn--primary"
                disabled={isChangingPassword || (!passwordForm.currentPassword && !passwordForm.newPassword && !passwordForm.confirmNewPassword)}
                form="password-form"
                type="submit"
              >
                <KeyRound size={14} />
                {isChangingPassword ? t('saving') : t('savePwd')}
              </button>
            }
          >
            <form id="password-form" className="sp-field-group" onSubmit={handlePasswordSubmit}>
              <div className="sp-field">
                <label htmlFor="currentPassword">{t('currentPwd')}</label>
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
                <label htmlFor="newPassword">{t('newPwd')}</label>
                <input
                  autoComplete="new-password"
                  id="newPassword"
                  maxLength={72}
                  minLength={8}
                  name="newPassword"
                  onChange={handlePasswordFieldChange}
                  placeholder="••••••••"
                  type="password"
                  value={passwordForm.newPassword}
                />
                {passwordErrors.newPassword && <span className="sp-field-error">{passwordErrors.newPassword}</span>}
              </div>
              <div className="sp-field">
                <label htmlFor="confirmNewPassword">{t('confirmNewPwd')}</label>
                <input
                  autoComplete="new-password"
                  id="confirmNewPassword"
                  maxLength={72}
                  minLength={8}
                  name="confirmNewPassword"
                  onChange={handlePasswordFieldChange}
                  placeholder="••••••••"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                />
                {passwordErrors.confirmNewPassword && <span className="sp-field-error">{passwordErrors.confirmNewPassword}</span>}
              </div>
            </form>
          </Card>

          <Card
            id="two-factor"
            icon={<ShieldCheck size={16} />}
            title={t('twoFactor.title')}
            description={t('twoFactor.description')}
          >
            <TwoFactorSettings
              isEnabled={!!currentUser?.twoFactorEnabled}
              onEnabled={() => {
                if (currentUser) {
                  onUserChange({ ...currentUser, twoFactorEnabled: true })
                }
              }}
              onDisabled={() => {
                if (currentUser) {
                  onUserChange({ ...currentUser, twoFactorEnabled: false })
                }
              }}
              pushToast={pushToast}
            />
          </Card>

          <section id="sessions" className="sp-card" aria-labelledby="sessions-title">
            <div className="sp-card-header">
              <div className="sp-card-icon sp-card-icon--default">
                <ShieldCheck size={16} />
              </div>
              <div className="sp-card-header-text">
                <h2 id="sessions-title">{t('sessionsTitle')}</h2>
                <p>{t('sessionsDesc')}</p>
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
                  {isLoadingSessions ? t('refreshing') : refreshCooldown > 0 ? t('refreshCooldown', { seconds: refreshCooldown }) : t('refresh')}
                </button>
                <button
                  className="sp-btn sp-btn--danger"
                  disabled={isRevokingOtherSessions || activeSessions.length === 0}
                  onClick={confirmRevokeOtherSessions}
                  type="button"
                >
                  <LogOut size={13} />
                  {isRevokingOtherSessions ? t('revoking') : t('revokeOther')}
                </button>
              </div>

              <div className="sp-session-summary">
                <span>{sessionSummaryParts.length ? sessionSummaryParts.join(' · ') : t('noSessions')}</span>
                {hiddenSessionCount > 0 && (
                  <button
                    aria-controls="session-list-expanded"
                    aria-expanded={showAllSessions}
                    className="sp-toggle-link"
                    onClick={handleToggleSessionHistory}
                    type="button"
                  >
                    <ChevronDown size={12} className={showAllSessions ? 'rotate-180' : ''} />
                    {showAllSessions ? t('hideHistory') : t('viewMore', { count: hiddenSessionCount })}
                  </button>
                )}
              </div>

              <div className="sp-session-list">
                {sessions.length === 0 && !isLoadingSessions && (
                  <p className="sp-session-empty">{t('noSessions')}</p>
                )}
                {sessionItems.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isRevoking={revokingSessionId === session.id}
                    showAllSessions={showAllSessions}
                    onRevoke={confirmRevokeSession}
                    t={t}
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
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <Card
            id="delete-account"
            icon={<AlertTriangle size={16} />}
            iconVariant="danger"
            title={t('deleteAccount')}
            description={t('deleteDesc')}
            dangerBorder
            footer={
              <button
                className="sp-btn sp-btn--danger"
                disabled={isDeletingAccount || (!deleteForm.password && !deleteForm.confirmationText)}
                form="delete-form"
                type="submit"
              >
                <Trash2 size={14} />
                {isDeletingAccount ? t('deletingBtn') : t('deleteBtn')}
              </button>
            }
          >
            <form id="delete-form" className="sp-field-group" onSubmit={handleDeleteAccountSubmit}>
              <div className="sp-field">
                <label htmlFor="delete-password">{t('currentPwd')}</label>
                <input
                  autoComplete="current-password"
                  id="delete-password"
                  name="password"
                  onChange={handleDeleteFieldChange}
                  placeholder={t('pwdPlaceholder')}
                  type="password"
                  value={deleteForm.password}
                />
                {deleteErrors.password && <span className="sp-field-error">{deleteErrors.password}</span>}
              </div>
              <div className="sp-field">
                <label htmlFor="delete-confirm">{t('deleteConfirmLabel')}</label>
                <input
                  autoComplete="off"
                  id="delete-confirm"
                  name="confirmationText"
                  onChange={handleDeleteFieldChange}
                  placeholder={t('deleteConfirmPlaceholder')}
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
