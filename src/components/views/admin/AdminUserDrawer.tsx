import { useEffect, useState } from 'react'
import {
  X,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  Loader2,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import {
  type AdminUser,
  type AdminUserDetail,
  fetchAdminUserDetails,
} from '../../../services/api/adminApi'
import { AvatarFallback } from '../../ui/AvatarFallback'
import {
  formatLastLogin,
  getGenderLabel,
  getStatusLabel,
} from './AdminUtils'
import { useTranslation } from 'react-i18next'

type AdminUserDrawerProps = {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
  onEditUser: (user: AdminUser) => void
  onLockUser: (user: AdminUser) => void
  onDeleteUser: (user: AdminUser) => void
  isLockBusy?: boolean
}

export function AdminUserDrawer({
  user,
  isOpen,
  onClose,
  onEditUser,
  onLockUser,
  onDeleteUser,
  isLockBusy,
}: AdminUserDrawerProps) {
  const { t } = useTranslation('admin')
  const [details, setDetails] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'sessions'>('overview')

  useEffect(() => {
    if (!isOpen || !user) {
      setDetails(null)
      return
    }

    let isMounted = true
    setIsLoading(true)

    async function loadUserDetails() {
      try {
        const data = await fetchAdminUserDetails(user!.id)
        if (isMounted) {
          setDetails(data)
        }
      } catch (err) {
        console.warn('Failed to load user detail drawer data, falling back to basic user info:', err)
        if (isMounted) {
          setDetails({
            user: user!,
            twoFactorEnabled: false,
            stats: { conversationsCount: 0, messagesCount: 0 },
            sessions: [],
          })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUserDetails()

    return () => {
      isMounted = false
    }
  }, [isOpen, user])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) {
    return null
  }

  const currentUser = details?.user || user
  const isLocked = !currentUser.isActive
  const twoFactor = details?.twoFactorEnabled ?? false

  const getDeviceIcon = (deviceName: string = '', userAgent: string = '') => {
    const text = (deviceName + ' ' + userAgent).toLowerCase()
    if (text.includes('mobile') || text.includes('iphone') || text.includes('android')) {
      return <Smartphone size={16} />
    }
    if (text.includes('mac') || text.includes('windows') || text.includes('laptop')) {
      return <Laptop size={16} />
    }
    return <Globe size={16} />
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        aria-label={t('drawerTitle')}
        aria-modal="true"
        className="admin-drawer-panel"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="admin-drawer-header">
          <div className="admin-drawer-header-title">
            <h3>{t('drawerTitle')}</h3>
            <span className="admin-drawer-user-id">ID: {currentUser.id}</span>
          </div>
          <button
            className="admin-drawer-close-btn"
            title={t('closeBtnTitle')}
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Hero */}
        <div className="admin-drawer-hero">
          <div className="admin-drawer-avatar-wrap">
            <AvatarFallback
              className="admin-drawer-avatar"
              name={currentUser.fullName}
              src={currentUser.avatarUrl}
            />
            <span className={`admin-presence-indicator is-${currentUser.presence || 'offline'}`} />
          </div>
          <div className="admin-drawer-hero-info">
            <h4>{currentUser.fullName}</h4>
            <p className="admin-drawer-hero-email">{currentUser.email}</p>
            {currentUser.displayName ? (
              <p className="admin-drawer-hero-display">@{currentUser.displayName}</p>
            ) : null}
            <div className="admin-drawer-pills">
              <span className={`role-badge role-${currentUser.role}`}>
                {currentUser.role}
              </span>
              <span className={`status-badge status-${currentUser.status}`}>
                {isLocked ? <Lock size={12} /> : <CheckCircle2 size={12} />}
                {getStatusLabel(currentUser.status, t)}
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="admin-drawer-tabs">
          <button
            type="button"
            className={`admin-drawer-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={15} />
            {t('sectionOverview')}
          </button>
          <button
            type="button"
            className={`admin-drawer-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={15} />
            {t('sectionSecurity')}
          </button>
          <button
            type="button"
            className={`admin-drawer-tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <Laptop size={15} />
            {t('sectionSessions')}
            {details?.sessions?.length ? (
              <span className="admin-drawer-tab-count">{details.sessions.length}</span>
            ) : null}
          </button>
        </div>

        {/* Body Content */}
        <div className="admin-drawer-body">
          {isLoading ? (
            <div className="admin-drawer-loading">
              <Loader2 className="animate-spin" size={28} />
              <p>{t('loadingTxt')}</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="admin-drawer-section">
                  <div className="admin-drawer-metric-grid">
                    <div className="admin-drawer-metric-card">
                      <div className="admin-drawer-metric-icon conversations">
                        <Users size={18} />
                      </div>
                      <div className="admin-drawer-metric-content">
                        <span className="metric-label">{t('joinedConversations')}</span>
                        <strong className="metric-value">
                          {details?.stats?.conversationsCount ?? 0}
                        </strong>
                      </div>
                    </div>

                    <div className="admin-drawer-metric-card">
                      <div className="admin-drawer-metric-icon messages">
                        <MessageSquare size={18} />
                      </div>
                      <div className="admin-drawer-metric-content">
                        <span className="metric-label">{t('sentMessages')}</span>
                        <strong className="metric-value">
                          {details?.stats?.messagesCount ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="admin-drawer-info-list">
                    <div className="admin-drawer-info-row">
                      <span className="info-key">
                        <Calendar size={14} />
                        {t('colCreatedAt')}
                      </span>
                      <span className="info-val">
                        {currentUser.createdAt ? formatLastLogin(currentUser.createdAt, t) : t('na')}
                      </span>
                    </div>

                    <div className="admin-drawer-info-row">
                      <span className="info-key">
                        <Clock size={14} />
                        {t('colLastLogin')}
                      </span>
                      <span className="info-val">
                        {formatLastLogin(currentUser.lastLogin, t)}
                      </span>
                    </div>

                    <div className="admin-drawer-info-row">
                      <span className="info-key">
                        {t('colGender')}
                      </span>
                      <span className="info-val">
                        {getGenderLabel(currentUser.gender, t)}
                      </span>
                    </div>

                    <div className="admin-drawer-info-row">
                      <span className="info-key">
                        {t('accountFilterLabel')}
                      </span>
                      <span className="info-val">
                        {isLocked ? t('filterLockedAccounts') : t('filterUnlockedAccounts')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="admin-drawer-section">
                  <div className="admin-drawer-security-card">
                    <div className="security-icon-wrap">
                      {twoFactor ? (
                        <ShieldCheck size={28} className="text-success" />
                      ) : (
                        <ShieldAlert size={28} className="text-warning" />
                      )}
                    </div>
                    <div className="security-info">
                      <h5>{t('twoFactorLabel')}</h5>
                      <span className={`security-pill ${twoFactor ? 'active' : 'inactive'}`}>
                        {twoFactor ? t('twoFactorActive') : t('twoFactorInactive')}
                      </span>
                    </div>
                  </div>

                  <div className="admin-drawer-security-card">
                    <div className="security-icon-wrap">
                      <KeyRound size={28} className="text-primary" />
                    </div>
                    <div className="security-info">
                      <h5>{t('passwordSecurity')}</h5>
                      <p className="security-desc">{t('passwordEncrypted')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div className="admin-drawer-section">
                  <div className="admin-drawer-sessions-list">
                    {details?.sessions && details.sessions.length > 0 ? (
                      details.sessions.map((sess) => (
                        <div key={sess.id} className="admin-session-item">
                          <div className="session-icon">
                            {getDeviceIcon(sess.deviceName, sess.userAgent)}
                          </div>
                          <div className="session-details">
                            <div className="session-title-row">
                              <strong>{sess.deviceName || 'Trình duyệt web'}</strong>
                              <span className={`session-badge ${sess.isActive ? 'active' : sess.revokedAt ? 'revoked' : 'expired'}`}>
                                {sess.isActive ? t('sessionActive') : sess.revokedAt ? t('sessionRevoked') : t('sessionExpired')}
                              </span>
                            </div>
                            <div className="session-meta">
                              <span>IP: {sess.ipAddress}</span>
                              <span>•</span>
                              <span>{sess.createdAt ? formatLastLogin(sess.createdAt, t) : ''}</span>
                            </div>
                            {sess.userAgent ? (
                              <p className="session-agent" title={sess.userAgent}>
                                {sess.userAgent}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="admin-empty-drawer">
                        <Laptop size={32} />
                        <p>{t('noSessionsFound')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="admin-drawer-footer">
          <button
            type="button"
            className="btn-drawer-action btn-edit"
            onClick={() => {
              onEditUser(currentUser)
            }}
          >
            <Edit2 size={16} />
            {t('editUserBtn')}
          </button>
          <button
            type="button"
            className={`btn-drawer-action ${isLocked ? 'btn-unlock' : 'btn-lock'}`}
            disabled={isLockBusy}
            onClick={() => {
              onLockUser(currentUser)
            }}
          >
            {isLockBusy ? <Loader2 size={16} className="animate-spin" /> : isLocked ? <Unlock size={16} /> : <Lock size={16} />}
            {isLocked ? t('unlockUserBtn') : t('lockUserBtn')}
          </button>
          <button
            type="button"
            className="btn-drawer-action btn-delete"
            onClick={() => {
              onDeleteUser(currentUser)
            }}
          >
            <Trash2 size={16} />
            {t('deleteUserBtn')}
          </button>
        </div>
      </aside>
    </div>
  )
}
