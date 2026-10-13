import { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  AlignLeft,
  Calendar,
  Camera,
  CheckCheck,
  ChevronDown,
  Compass,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  IdCard,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessageSquareDot,
  Mic,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react'
import {
  type UserSession,
} from '../../services/api/userApi'
import type { AuthUser } from '../../services/api/authApi'
import {
  getSavedAccounts,
  removeSavedAccount,
  type SavedAccount,
} from '../../services/storage/authStorage'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TwoFactorSettings } from './TwoFactorSettings'
import { useAutoTour } from '../../hooks/tutorial/useAutoTour'
import { navigateToTour } from '../../services/tutorial/tourService'
import { useTutorialStore } from '../../stores/tutorialStore'
import type { AppView } from '../../types'

export type SettingsPageProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onAccountDeactivated?: () => void
  onLogout?: () => void
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
  onChangeView?: (view: AppView) => void
  onSwitchAccount?: (account: SavedAccount) => void
  onAddAccount?: () => void
}

type SessionViewModel = UserSession & {
  viewGroup: 'current' | 'active' | 'history'
  isCollapsible?: boolean
}






function formatDateTime(value: string | null, t: any, lng?: string) {
  if (!value) return t('notAvailable')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const locale = lng?.startsWith('en') ? 'en-US' : 'vi-VN'
  return new Intl.DateTimeFormat(locale, {
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
  icon?: React.ReactNode
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ icon, label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label className="sp-toggle-row">
      <div className="sp-toggle-text">
        <strong>
          {icon && <span className="sp-label-icon">{icon}</span>}
          <span>{label}</span>
        </strong>
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
  iconVariant?: 'default' | 'neutral' | 'danger' | 'warning'
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  dangerBorder?: boolean
  warningBorder?: boolean
  id?: string
  dataTour?: string
}

function Card({ id, icon, iconVariant = 'default', title, description, children, footer, dangerBorder, warningBorder, dataTour }: CardProps) {
  const borderClass = dangerBorder ? ' sp-card--danger' : warningBorder ? ' sp-card--warning' : ''
  return (
    <div id={id} data-tour={dataTour} className={`sp-card${borderClass}`}>
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
  lng?: string
}

function SessionItem({ session, isRevoking, showAllSessions, onRevoke, t, lng }: SessionItemProps) {
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
          <span>{t('createdAt')}: {formatDateTime(session.createdAt, t, lng)}</span>
          <span>{t('expiresAt')}: {formatDateTime(session.expiresAt, t, lng)}</span>
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


import { useSettingsPageController } from '../../hooks/views/useSettingsPageController'

export function SettingsPage(props: SettingsPageProps) {
  const {
    activeSection,
    activeSessions,
    allowCamera,
    allowMicrophone,
    confirmDialog,
    confirmRevokeOtherSessions,
    confirmRevokeSession,
    deactivateErrors,
    deactivateForm,
    deleteErrors,
    deleteForm,
    expandedSessionHeight,
    expandedSessionItems,
    expandedSessionsRef,
    handleAllowCameraChange,
    handleAllowMicrophoneChange,
    handleConfirmDialog,
    handleDeactivateAccountSubmit,
    handleDeactivateFieldChange,
    handleDeleteAccountSubmit,
    handleDeleteFieldChange,
    handlePasswordFieldChange,
    handlePasswordSubmit,
    handlePrivacyChange,
    handleToggleSessionHistory,
    hiddenSessionCount,
    i18n,
    isChangingPassword,
    isDeactivatingAccount,
    isDeletingAccount,
    isLoadingSessions,
    isRevokingOtherSessions,
    isSavingPrivacy,
    loadSessions,
    passwordErrors,
    passwordForm,
    refreshCooldown,
    renderExpandedSessions,
    revokingSessionId,
    scrollToSection,
    sessionItems,
    sessionSummaryParts,
    sessions,
    setConfirmDialog,
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
    t
  } = useSettingsPageController(props)

  useAutoTour('settings', true, props.currentUser?.id)

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())
  const [switchingId, setSwitchingId] = useState<string | number | null>(null)

  useEffect(() => {
    setSavedAccounts(getSavedAccounts())
  }, [props.currentUser?.id])

  const {
    currentUser, onUserChange, pushToast
  } = props

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
          <button className={`sp-nav-item${activeSection === 'app-settings' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('app-settings')}>
            <Settings size={15} /> {t('appTitle')}
          </button>
          <button className={`sp-nav-item${activeSection === 'privacy-profile' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('privacy-profile')}>
            <IdCard size={15} /> {t('navProfile')}
          </button>
          <button className={`sp-nav-item${activeSection === 'password' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('password')}>
            <KeyRound size={15} /> {t('navPassword')}
          </button>
          <button className={`sp-nav-item${activeSection === 'two-factor' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('two-factor')}>
            <ShieldCheck size={15} /> {t('navTwoFactor')}
          </button>
          <button className={`sp-nav-item${activeSection === 'sessions' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('sessions')}>
            <Laptop size={15} /> {t('navSessions')}
          </button>
          <button className={`sp-nav-item${activeSection === 'switch-accounts' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('switch-accounts')}>
            <Users size={15} /> {t('accountSwitcher.title', { defaultValue: 'Chuyển tài khoản' })}
          </button>
          <button className={`sp-nav-item${activeSection === 'tutorial-settings' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('tutorial-settings')}>
            <Compass size={15} /> {t('navTutorial')}
          </button>
          <div className="sp-nav-divider" />
          <button className={`sp-nav-item sp-nav-item--warning${activeSection === 'deactivate-account' ? ' sp-nav-item--active' : ''}`} type="button" onClick={() => scrollToSection('deactivate-account')}>
            <PauseCircle size={15} /> {t('navDeactivate')}
          </button>
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
                icon={<Activity size={15} />}
                label={t('showOnline')}
                description={showActivityStatus ? t('showOnlineDesc') : t('showOnlineDescOff')}
                checked={showActivityStatus}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showActivityStatus', v)}
              />
              <ToggleRow
                icon={<MessageSquareDot size={15} />}
                label={t('showTyping')}
                description={showTypingIndicator ? t('showTypingDesc') : t('showTypingDescOff')}
                checked={showTypingIndicator}
                disabled={isSavingPrivacy}
                onChange={(v) => handlePrivacyChange('showTypingIndicator', v)}
              />
              <ToggleRow
                icon={<CheckCheck size={15} />}
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
                icon={<Camera size={15} />}
                label={t('allowCamera')}
                description={allowCamera ? t('allowCameraDesc') : t('allowCameraDescOff')}
                checked={allowCamera}
                onChange={handleAllowCameraChange}
              />
              <ToggleRow
                icon={<Mic size={15} />}
                label={t('allowMicrophone')}
                description={allowMicrophone ? t('allowMicrophoneDesc') : t('allowMicrophoneDescOff')}
                checked={allowMicrophone}
                onChange={handleAllowMicrophoneChange}
              />
            </div>
          </Card>

          <Card
            id="app-settings"
            dataTour="settings-theme"
            icon={<Settings size={16} />}
            title={t('appTitle')}
            description={t('appDesc')}
          >
            <div className="sp-toggle-group">
              <label className="sp-toggle-row">
                <div className="sp-toggle-text">
                  <strong>
                    <span className="sp-label-icon"><Globe size={15} /></span>
                    <span>{t('language')}</span>
                  </strong>
                  <small>{t('languageDesc')}</small>
                </div>
                <div className="sp-toggle-select">
                  <select
                    className="sp-select"
                    value={i18n.language?.startsWith('vi') ? 'vi' : 'en'}
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
              <ToggleRow icon={<Phone size={15} />} label={t('phone')} description={showPhone ? t('phoneDesc') : t('phoneDescOff')} checked={showPhone} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showPhone', v)} />
              <ToggleRow icon={<MessageCircle size={15} />} label={t('statusMsg')} description={showStatusMessage ? t('statusMsgDesc') : t('statusMsgDescOff')} checked={showStatusMessage} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showStatusMessage', v)} />
              <ToggleRow icon={<MapPin size={15} />} label={t('address')} description={showAddress ? t('addressDesc') : t('addressDescOff')} checked={showAddress} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showAddress', v)} />
              <ToggleRow icon={<UserCheck size={15} />} label={t('gender')} checked={showGender} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showGender', v)} />
              <ToggleRow icon={<Calendar size={15} />} label={t('birthDate')} checked={showBirthDate} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBirthDate', v)} />
              <ToggleRow icon={<AlignLeft size={15} />} label={t('bio')} description={showBio ? t('bioDesc') : t('bioDescOff')} checked={showBio} disabled={isSavingPrivacy} onChange={(v) => handlePrivacyChange('showBio', v)} />
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
                <label htmlFor="currentPassword">
                  <Lock size={13} />
                  <span>{t('currentPwd')}</span>
                </label>
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
                <label htmlFor="newPassword">
                  <KeyRound size={13} />
                  <span>{t('newPwd')}</span>
                </label>
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
                <label htmlFor="confirmNewPassword">
                  <ShieldCheck size={13} />
                  <span>{t('confirmNewPwd')}</span>
                </label>
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
            dataTour="settings-security-2fa"
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

          <section id="sessions" data-tour="settings-sessions" className="sp-card" aria-labelledby="sessions-title">
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
                    lng={i18n.language}
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
                          lng={i18n.language}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="switch-accounts" className="sp-card" aria-labelledby="switch-accounts-title">
            <div className="sp-card-header">
              <div className="sp-card-icon sp-card-icon--default">
                <Users size={16} />
              </div>
              <div className="sp-card-header-text">
                <h2 id="switch-accounts-title">{t('accountSwitcher.title', { defaultValue: 'Chuyển tài khoản' })}</h2>
                <p>{t('accountSwitcher.recentAccountsSub', { defaultValue: 'Chuyển đổi nhanh giữa các tài khoản đã đăng nhập trên thiết bị này.' })}</p>
              </div>
            </div>
            <div className="sp-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedAccounts.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '13px', margin: '4px 0' }}>
                    {t('accountSwitcher.noSavedAccounts', { defaultValue: 'Chưa có tài khoản nào được lưu trên thiết bị này.' })}
                  </p>
                )}
                {savedAccounts.map((account: SavedAccount) => {
                  const isCurrent = String(account.user.id) === String(currentUser?.id) || account.user.email === currentUser?.email
                  return (
                    <div
                      key={account.user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: isCurrent ? 'rgba(20, 184, 166, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isCurrent ? '1px solid rgba(20, 184, 166, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {account.user.avatarUrl ? (
                          <img
                            src={account.user.avatarUrl}
                            alt=""
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #14b8a6, #2563eb)',
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                              fontSize: '16px',
                              flexShrink: 0,
                            }}
                          >
                            {account.user.displayName?.[0] || account.user.fullName?.[0] || 'U'}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--color-text-main, #e2e8f0)' }}>
                              {account.user.displayName || account.user.fullName}
                            </strong>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  fontWeight: 600,
                                }}
                              >
                                {t('accountSwitcher.activeNow', { defaultValue: 'Đang hoạt động' })}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
                            {account.user.email}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {!isCurrent && props.onSwitchAccount && (
                          <button
                            type="button"
                            className="sp-btn sp-btn--ghost"
                            disabled={Boolean(switchingId)}
                            onClick={async () => {
                              setSwitchingId(account.user.id)
                              try {
                                await props.onSwitchAccount?.(account)
                              } finally {
                                setSwitchingId(null)
                                setSavedAccounts(getSavedAccounts())
                              }
                            }}
                            style={{
                              fontSize: '12.5px',
                              padding: '6px 12px',
                              minWidth: '68px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {switchingId === account.user.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              t('accountSwitcher.switchAccount', { defaultValue: 'Chuyển' })
                            )}
                          </button>
                        )}
                        {!isCurrent && (
                          <button
                            type="button"
                            className="sp-btn sp-btn--danger"
                            onClick={() => {
                              const confirmMsg = t('accountSwitcher.removeAccountConfirm', {
                                name: account.user.displayName || account.user.fullName || account.user.email,
                                defaultValue: `Bạn có chắc chắn muốn xóa tài khoản ${account.user.displayName || account.user.fullName || account.user.email} khỏi thiết bị này không?`,
                              })
                              if (window.confirm(confirmMsg)) {
                                removeSavedAccount(account.user.id)
                                setSavedAccounts(getSavedAccounts())
                              }
                            }}
                            title={t('accountSwitcher.removeAccount', { defaultValue: 'Xóa tài khoản khỏi thiết bị' })}
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {props.onAddAccount && (
                  <button
                    type="button"
                    className="sp-btn sp-btn--ghost"
                    onClick={props.onAddAccount}
                    style={{
                      justifyContent: 'center',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px dashed rgba(20, 184, 166, 0.4)',
                      marginTop: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={15} />
                    <span>{t('accountSwitcher.addAccount', { defaultValue: 'Đăng nhập bằng tài khoản khác' })}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          <Card
            id="tutorial-settings"
            dataTour="settings-tutorial-replay"
            icon={<Compass size={16} />}
            title={t('tutorial.cardTitle')}
            description={t('tutorial.cardDesc')}
          >
            <div className="tutorial-replay-actions" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <button
                  type="button"
                  className="sp-btn sp-btn--ghost"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '10px' }}
                  onClick={() => {
                    props.pushToast?.(t('tutorial.launchingChat'), 'info')
                    navigateToTour('chat', props.onChangeView)
                  }}
                >
                  <MessageSquare size={16} />
                  <span>{t('tutorial.replayChat')}</span>
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn--ghost"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '10px' }}
                  onClick={() => {
                    props.pushToast?.(t('tutorial.launchingStory'), 'info')
                    navigateToTour('story', props.onChangeView)
                  }}
                >
                  <Sparkles size={16} />
                  <span>{t('tutorial.replayStory')}</span>
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn--ghost"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '10px' }}
                  onClick={() => {
                    props.pushToast?.(t('tutorial.launchingProfile'), 'info')
                    navigateToTour('profile', props.onChangeView)
                  }}
                >
                  <UserRound size={16} />
                  <span>{t('tutorial.replayProfile')}</span>
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn--ghost"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '10px' }}
                  onClick={() => {
                    props.pushToast?.(t('tutorial.launchingSettings'), 'info')
                    navigateToTour('settings', props.onChangeView)
                  }}
                >
                  <Settings size={16} />
                  <span>{t('tutorial.replaySettings')}</span>
                </button>
              </div>

              <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
                <button
                  type="button"
                  className="sp-btn sp-btn--danger"
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  onClick={() => {
                    useTutorialStore.getState().resetAllTours()
                    props.pushToast?.(t('tutorial.resetSuccess'), 'info')
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{t('tutorial.resetAll')}</span>
                </button>
              </div>
            </div>
          </Card>

          <Card
            id="deactivate-account"
            icon={<PauseCircle size={16} />}
            iconVariant="warning"
            title={t('deactivateAccount')}
            description={t('deactivateDesc')}
            warningBorder
            footer={
              <button
                className="sp-btn sp-btn--warning"
                disabled={isDeactivatingAccount || !deactivateForm.password}
                form="deactivate-form"
                type="submit"
              >
                <PauseCircle size={14} />
                {isDeactivatingAccount ? t('deactivatingBtn') : t('deactivateBtn')}
              </button>
            }
          >
            <form id="deactivate-form" className="sp-field-group" onSubmit={handleDeactivateAccountSubmit}>
              <div className="sp-field">
                <label htmlFor="deactivate-reason" className="sp-field-label--warning">
                  <HelpCircle size={13} />
                  <span>{t('deactivateReason')}</span>
                </label>
                <select
                  id="deactivate-reason"
                  name="reason"
                  value={deactivateForm.reason || ''}
                  onChange={handleDeactivateFieldChange}
                  className="sp-select"
                >
                  <option value="">{t('deactivateReasonPlaceholder')}</option>
                  <option value="break">{t('deactivateReasonBreak')}</option>
                  <option value="not_needed">{t('deactivateReasonNotNeeded')}</option>
                  <option value="privacy">{t('deactivateReasonPrivacy')}</option>
                  <option value="other">{t('deactivateReasonOther')}</option>
                </select>
              </div>
              <div className="sp-field">
                <label htmlFor="deactivate-password" className="sp-field-label--warning">
                  <Lock size={13} />
                  <span>{t('currentPwd')}</span>
                </label>
                <input
                  autoComplete="current-password"
                  id="deactivate-password"
                  name="password"
                  onChange={handleDeactivateFieldChange}
                  placeholder={t('pwdPlaceholder')}
                  type="password"
                  value={deactivateForm.password}
                />
                {deactivateErrors.password && <span className="sp-field-error">{deactivateErrors.password}</span>}
              </div>
            </form>
          </Card>

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
                <label htmlFor="delete-password" className="sp-field-label--danger">
                  <Lock size={13} />
                  <span>{t('currentPwd')}</span>
                </label>
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
                <label htmlFor="delete-confirm" className="sp-field-label--danger">
                  <AlertTriangle size={13} />
                  <span>{t('deleteConfirmLabel')}</span>
                </label>
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
        isWorking={isDeletingAccount || isDeactivatingAccount}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void handleConfirmDialog()}
      />
    </section>
  )
}
