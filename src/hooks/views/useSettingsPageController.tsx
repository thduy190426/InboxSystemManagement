import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
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
import { type ConfirmDialogState } from '../../components/ui/ConfirmDialog'
import { useTranslation } from 'react-i18next'


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


type SessionItemProps = {
  session: SessionViewModel
  isRevoking: boolean
  showAllSessions: boolean
  onRevoke: (session: UserSession) => void
  t: any
}



import type { SettingsPageProps } from '../../components/views/SettingsPage'

export function useSettingsPageController(props: SettingsPageProps) {
  const {
    currentUser, onAccountDeleted, onLogout, onUserChange, pushToast
  } = props

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
    const intersectionRatios = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          intersectionRatios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        })

        let maxRatio = 0
        let visibleSection = ''
        intersectionRatios.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio
            visibleSection = id
          }
        })

        if (visibleSection) {
          setActiveSection(visibleSection)
        }
      },
      { root: null, rootMargin: '-20% 0px -20% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
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

  return {
    activeSection,
    activeSessions,
    allowCamera,
    allowMicrophone,
    confirmDialog,
    confirmRevokeOtherSessions,
    confirmRevokeSession,
    cooldownIntervalRef,
    currentSession,
    deleteCurrentAccount,
    deleteErrors,
    deleteForm,
    expandedSessionHeight,
    expandedSessionItems,
    expandedSessionsRef,
    handleAllowCameraChange,
    handleAllowMicrophoneChange,
    handleConfirmDialog,
    handleDeleteAccountSubmit,
    handleDeleteFieldChange,
    handlePasswordFieldChange,
    handlePasswordSubmit,
    handlePrivacyChange,
    handleToggleSessionHistory,
    hiddenSessionCount,
    historySessions,
    i18n,
    isChangingPassword,
    isDeletingAccount,
    isLoadingSessions,
    isRevokingOtherSessions,
    isSavingPrivacy,
    loadSessions,
    otherRecentSessions,
    passwordErrors,
    passwordForm,
    refreshCooldown,
    renderExpandedSessions,
    revokeAllOtherSessions,
    revokeOneSession,
    revokingSessionId,
    scrollToSection,
    sessionItems,
    sessionSummaryParts,
    sessions,
    setActiveSection,
    setAllowCamera,
    setAllowMicrophone,
    setConfirmDialog,
    setDeleteErrors,
    setDeleteForm,
    setExpandedSessionHeight,
    setIsChangingPassword,
    setIsDeletingAccount,
    setIsLoadingSessions,
    setIsRevokingOtherSessions,
    setIsSavingPrivacy,
    setPasswordErrors,
    setPasswordForm,
    setRefreshCooldown,
    setRenderExpandedSessions,
    setRevokingSessionId,
    setSessions,
    setShowActivityStatus,
    setShowAddress,
    setShowAllSessions,
    setShowBio,
    setShowBirthDate,
    setShowGender,
    setShowPhone,
    setShowReadReceipts,
    setShowStatusMessage,
    setShowTypingIndicator,
    showActivityStatus,
    showAddress,
    showAllSessions,
    showBio,
    showBirthDate,
    showGender,
    showPhone,
    showReadReceipts,
    showStatusMessage,
    showTypingIndicator,
    sortedSessions,
    startRefreshCooldown,
    t
  }
}
