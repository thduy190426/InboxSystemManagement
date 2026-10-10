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
  type UserSession,
} from '../../services/api/userApi'
import type { AuthUser } from '../../services/api/authApi'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TwoFactorSettings } from './TwoFactorSettings'

export type SettingsPageProps = {
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
    i18n,
    isChangingPassword,
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
            <Settings size={15} /> {t('appTitle', { defaultValue: 'Cài đặt Ứng dụng' })}
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
