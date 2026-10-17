import {
  AtSign,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  HelpCircle,
  Inbox,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { showBrowserNotification, type BrowserNotificationPermission } from '../../services/core/browserNotifications'
import type { AppNotification, ContactUser, Conversation } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { ConfirmDialog, type ConfirmDialogState } from '../ui/ConfirmDialog'

export type NotificationTab = 'all' | 'unread' | 'messages' | 'requests'

type NotificationsPanelProps = {
  browserNotificationPermission: BrowserNotificationPermission
  conversations: Conversation[]
  friendRequests: ContactUser[]
  notifications: AppNotification[]
  onEnableBrowserNotifications: () => Promise<void> | void
  onOpenContacts: () => void
  onOpenConversation: (conversationId: string) => void
  onOpenNotification: (notification: AppNotification) => void
  onMarkAllAsRead?: () => Promise<void> | void
  onDeleteNotification?: (notificationId: string) => Promise<void> | void
  onClearAllNotifications?: () => Promise<void> | void
}

type NotificationSectionProps = {
  icon: React.ReactNode
  title: string
  count: number
  emptyText: string
  children: React.ReactNode
}

function NotificationSection({ icon, title, count, emptyText, children }: NotificationSectionProps) {
  return (
    <section className="np-section">
      <div className="np-section-header">
        <span className="np-section-icon">{icon}</span>
        <h2>{title}</h2>
        <span className="np-section-count">{count}</span>
      </div>
      <div className="np-section-body">
        {count > 0 ? children : (
          <div className="np-empty">
            <Bell size={26} strokeWidth={1.5} />
            <span>{emptyText}</span>
          </div>
        )}
      </div>
    </section>
  )
}

export function NotificationsPanel({
  browserNotificationPermission,
  conversations,
  friendRequests,
  notifications,
  onEnableBrowserNotifications,
  onOpenContacts,
  onOpenConversation,
  onOpenNotification,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
}: NotificationsPanelProps) {
  const { t } = useTranslation('notifications')

  const [activeTab, setActiveTab] = useState<NotificationTab>('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

  const unreadConversations = useMemo(
    () => conversations.filter((c) => c.unread > 0),
    [conversations],
  )
  const totalUnreadMessages = useMemo(
    () => unreadConversations.reduce((total, c) => total + c.unread, 0),
    [unreadConversations],
  )

  const mentionNotifications = useMemo(
    () => notifications.filter((n) => n.type === 'mention'),
    [notifications],
  )

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.readAt),
    [notifications],
  )

  const totalUnreadCount = totalUnreadMessages + unreadNotifications.length + friendRequests.length
  const totalNotifications = totalUnreadMessages + friendRequests.length + notifications.length

  const tabCounts = {
    all: totalNotifications,
    unread: totalUnreadCount,
    messages: totalUnreadMessages + mentionNotifications.length,
    requests: friendRequests.length,
  }

  async function handleResync() {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await onEnableBrowserNotifications()
      showBrowserNotification(t('testNotificationTitle'), {
        body: t('testNotificationBody'),
        tag: 'test-notification-' + Date.now(),
      })
      toast.success(t('resyncSuccess'))
    } catch {
      toast.error(t('resyncError'))
    } finally {
      setTimeout(() => setIsSyncing(false), 600)
    }
  }

  async function handleMarkAll() {
    if (!onMarkAllAsRead || totalUnreadCount === 0 || isMarkingAll) return
    setIsMarkingAll(true)
    try {
      await onMarkAllAsRead()
    } finally {
      setIsMarkingAll(false)
    }
  }

  function handleOpenClearConfirm() {
    if (!onClearAllNotifications || notifications.length === 0) return
    setConfirmDialog({
      title: t('clearAllConfirmTitle'),
      description: t('clearAllConfirmDesc'),
      confirmLabel: t('clearAllConfirmBtn'),
      cancelLabel: t('cancel'),
      tone: 'danger',
      onConfirm: async () => {
        setIsClearing(true)
        try {
          await onClearAllNotifications()
        } finally {
          setIsClearing(false)
          setConfirmDialog(null)
        }
      },
    })
  }

  async function handleDeleteItem(e: React.MouseEvent, notificationId: string) {
    e.stopPropagation()
    if (!onDeleteNotification || deletingId) return
    setDeletingId(notificationId)
    try {
      await onDeleteNotification(notificationId)
    } finally {
      setDeletingId(null)
    }
  }

  const displayedNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return unreadNotifications
    }
    if (activeTab === 'messages') {
      return mentionNotifications
    }
    return notifications
  }, [activeTab, unreadNotifications, mentionNotifications, notifications])

  const showUnreadConversationsSection =
    (activeTab === 'all' || activeTab === 'unread' || activeTab === 'messages') &&
    (unreadConversations.length > 0 || activeTab === 'messages')

  const showNotificationsSection =
    (activeTab === 'all' || activeTab === 'unread' || activeTab === 'messages')

  const showRequestsSection =
    (activeTab === 'all' || activeTab === 'unread' || activeTab === 'requests') &&
    (friendRequests.length > 0 || activeTab === 'requests')

  const isCurrentTabEmpty =
    (activeTab === 'unread' && totalUnreadCount === 0) ||
    (activeTab === 'all' && totalNotifications === 0) ||
    (activeTab === 'messages' && unreadConversations.length === 0 && mentionNotifications.length === 0) ||
    (activeTab === 'requests' && friendRequests.length === 0)

  return (
    <section className="np-page" aria-labelledby="notifications-title">
      <header className="np-page-header">
        <div>
          <div className="np-page-kicker">
            <Bell size={12} />
            {t('kicker')}
          </div>
          <h1 id="notifications-title">{t('title')}</h1>
        </div>
        <div className="np-header-aside">
          {browserNotificationPermission === 'granted' ? (
            <div className="np-push-badge-card is-granted" role="region" aria-label={t('browserGranted')}>
              <div className="np-push-status-wrap">
                <span className="np-status-dot-wrap" aria-hidden="true">
                  <span className="np-status-dot-ping" />
                  <span className="np-status-dot" />
                </span>
                <BellRing size={15} className="np-push-icon-active" />
                <span className="np-push-status-label">{t('browserGranted')}</span>
              </div>
              <div className="np-push-actions">
                <button
                  className="np-push-action-btn np-push-resync-btn"
                  disabled={isSyncing}
                  onClick={handleResync}
                  title={t('resyncTitle')}
                  type="button"
                >
                  <RefreshCw size={13} className={isSyncing ? 'np-spin' : ''} />
                  <span>{isSyncing ? t('resyncing') : t('resyncBtn')}</span>
                </button>
                <button
                  className="np-push-action-btn np-push-help-btn"
                  onClick={() => setShowGuideModal(true)}
                  title={t('troubleshootTitle')}
                  type="button"
                >
                  <HelpCircle size={14} />
                </button>
              </div>
            </div>
          ) : browserNotificationPermission === 'denied' ? (
            <div className="np-push-badge-card is-denied" role="region" aria-label={t('browserDenied')}>
              <div className="np-push-status-wrap">
                <BellOff size={15} className="np-push-icon-denied" />
                <span className="np-push-status-label">{t('browserDenied')}</span>
              </div>
              <button
                className="np-push-action-btn np-push-unblock-btn"
                onClick={() => setShowGuideModal(true)}
                title={t('troubleshootTitle')}
                type="button"
              >
                <ShieldAlert size={13} />
                <span>{t('unblockBtn')}</span>
              </button>
            </div>
          ) : browserNotificationPermission === 'unsupported' ? (
            <div className="np-push-badge-card is-unsupported">
              <BellOff size={15} />
              <span>{t('browserUnsupported')}</span>
            </div>
          ) : (
            <button
              className="np-push-cta-btn"
              onClick={onEnableBrowserNotifications}
              type="button"
            >
              <Bell size={15} className="np-bell-shake" />
              <span>{t('browserEnable')}</span>
            </button>
          )}

          {totalNotifications > 0 && (
            <span className="np-total-badge">{totalNotifications}</span>
          )}
        </div>
      </header>

      <div className="np-toolbar">
        <nav className="np-tabs" aria-label={t('kicker')}>
          <button
            className={`np-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('all')}
            type="button"
          >
            <span>{t('tabAll')}</span>
            {tabCounts.all > 0 && <span className="np-tab-badge">{tabCounts.all}</span>}
          </button>
          <button
            className={`np-tab-btn ${activeTab === 'unread' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('unread')}
            type="button"
          >
            <span>{t('tabUnread')}</span>
            {tabCounts.unread > 0 && (
              <span className="np-tab-badge np-tab-badge--accent">{tabCounts.unread}</span>
            )}
          </button>
          <button
            className={`np-tab-btn ${activeTab === 'messages' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('messages')}
            type="button"
          >
            <MessageCircle size={14} />
            <span>{t('tabMessages')}</span>
            {tabCounts.messages > 0 && <span className="np-tab-badge">{tabCounts.messages}</span>}
          </button>
          <button
            className={`np-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('requests')}
            type="button"
          >
            <UserPlus size={14} />
            <span>{t('tabRequests')}</span>
            {tabCounts.requests > 0 && <span className="np-tab-badge">{tabCounts.requests}</span>}
          </button>
        </nav>

        <div className="np-toolbar-actions">
          <button
            className="np-toolbar-btn np-toolbar-btn--primary"
            disabled={totalUnreadCount === 0 || isMarkingAll}
            onClick={handleMarkAll}
            title={t('markAllAsRead')}
            type="button"
          >
            <CheckCheck size={15} className={isMarkingAll ? 'np-spin' : ''} />
            <span>{t('markAllAsRead')}</span>
          </button>

          <button
            className="np-toolbar-btn np-toolbar-btn--danger"
            disabled={notifications.length === 0 || isClearing}
            onClick={handleOpenClearConfirm}
            title={t('clearAll')}
            type="button"
          >
            <Trash2 size={15} className={isClearing ? 'np-spin' : ''} />
            <span>{t('clearAll')}</span>
          </button>
        </div>
      </div>

      {isCurrentTabEmpty ? (
        <div className="np-empty-card">
          <div className="np-empty-card-icon">
            {activeTab === 'unread' ? (
              <CheckCheck size={36} strokeWidth={1.5} />
            ) : activeTab === 'requests' ? (
              <UserPlus size={36} strokeWidth={1.5} />
            ) : activeTab === 'messages' ? (
              <MessageCircle size={36} strokeWidth={1.5} />
            ) : (
              <Inbox size={36} strokeWidth={1.5} />
            )}
          </div>
          <h3>
            {activeTab === 'unread'
              ? t('unreadEmpty')
              : activeTab === 'requests'
              ? t('friendRequestsEmpty')
              : activeTab === 'messages'
              ? t('unreadMessagesEmpty')
              : t('allEmpty')}
          </h3>
        </div>
      ) : (
        <div className="np-grid">
          {showUnreadConversationsSection && (
            <NotificationSection
              icon={<MessageCircle size={15} />}
              title={t('unreadMessagesTitle')}
              count={totalUnreadMessages}
              emptyText={t('unreadMessagesEmpty')}
            >
              {unreadConversations.map((conversation) => (
                <button
                  className="np-row"
                  key={conversation.id}
                  onClick={() => onOpenConversation(conversation.id)}
                  type="button"
                >
                  <div className="np-row-avatar">
                    <AvatarFallback name={conversation.name} src={conversation.avatar} />
                  </div>
                  <div className="np-row-content">
                    <strong>{conversation.name}</strong>
                    <span>{conversation.lastMessage}</span>
                    <small>{conversation.lastTime}</small>
                  </div>
                  <span className="np-badge">{conversation.unread}</span>
                </button>
              ))}
            </NotificationSection>
          )}

          {showNotificationsSection && (
            <NotificationSection
              icon={<AtSign size={15} />}
              title={activeTab === 'unread' ? t('tabUnread') : t('mentionsTitle')}
              count={displayedNotifications.length}
              emptyText={t('mentionsEmpty')}
            >
              {displayedNotifications.map((notification) => (
                <div
                  className={`np-row${!notification.readAt ? ' np-row--unread' : ''}`}
                  key={notification.id}
                  onClick={() => onOpenNotification(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpenNotification(notification)
                    }
                  }}
                >
                  <div className="np-row-avatar">
                    <AvatarFallback
                      name={notification.actor?.fullName || notification.conversationName}
                      src={notification.actor?.avatarUrl || notification.conversationAvatar}
                    />
                    {!notification.readAt && <span className="np-unread-dot" />}
                  </div>
                  <div className="np-row-content">
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <small>{notification.conversationName} · {notification.time}</small>
                  </div>
                  <div className="np-row-actions">
                    {!notification.readAt && (
                      <span className="np-badge" title={t('tabUnread')}>1</span>
                    )}
                    <button
                      className="np-row-delete-btn"
                      disabled={deletingId === notification.id}
                      onClick={(e) => handleDeleteItem(e, notification.id)}
                      title={t('deleteNotification')}
                      type="button"
                      aria-label={t('deleteNotification')}
                    >
                      <Trash2 size={14} className={deletingId === notification.id ? 'np-spin' : ''} />
                    </button>
                  </div>
                </div>
              ))}
            </NotificationSection>
          )}

          {showRequestsSection && (
            <NotificationSection
              icon={<UserPlus size={15} />}
              title={t('friendRequestsTitle')}
              count={friendRequests.length}
              emptyText={t('friendRequestsEmpty')}
            >
              {friendRequests.map((request) => (
                <button
                  className="np-row"
                  key={request.id}
                  onClick={onOpenContacts}
                  type="button"
                >
                  <div className="np-row-avatar">
                    <AvatarFallback name={request.fullName} src={request.avatarUrl} />
                  </div>
                  <div className="np-row-content">
                    <strong>{request.fullName}</strong>
                    <span>{request.email}</span>
                    <small>{t('wantsToConnect')}</small>
                  </div>
                  <span className="np-badge">1</span>
                </button>
              ))}
            </NotificationSection>
          )}
        </div>
      )}

      {showGuideModal && (
        <div className="np-guide-backdrop" role="presentation" onClick={() => setShowGuideModal(false)}>
          <div
            className="np-guide-modal animate-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="np-guide-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="np-guide-header">
              <div className="np-guide-header-icon">
                <BellRing size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: '24px' }}>
                <h3 id="np-guide-title">{t('guideModalTitle')}</h3>
                <p>{t('guideModalDesc')}</p>
              </div>
              <button
                className="np-guide-close-btn"
                onClick={() => setShowGuideModal(false)}
                type="button"
                aria-label={t('closeGuide')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="np-guide-steps">
              <div className="np-guide-step-card">
                <span className="np-step-number">1</span>
                <div className="np-step-text">
                  <strong>{t('guideStep1')}</strong>
                  <small>Kiểm tra quyền truy cập ở góc trái URL trình duyệt (bên cạnh tên miền web).</small>
                </div>
              </div>

              <div className="np-guide-step-card">
                <span className="np-step-number">2</span>
                <div className="np-step-text">
                  <strong>{t('guideStep2')}</strong>
                  <small>Đảm bảo trạng thái thông báo là &quot;Cho phép&quot; và trình duyệt không bật chế độ Không làm phiền.</small>
                </div>
              </div>

              <div className="np-guide-step-card">
                <span className="np-step-number">3</span>
                <div className="np-step-text">
                  <strong>{t('guideStep3')}</strong>
                  <small>Hệ thống sẽ tái kết nối Service Worker và gửi ngay một thông báo mẫu để xác nhận.</small>
                </div>
              </div>
            </div>

            <div className="np-guide-footer">
              <button
                className="np-guide-btn-test"
                disabled={isSyncing}
                onClick={handleResync}
                type="button"
              >
                <RefreshCw size={15} className={isSyncing ? 'np-spin' : ''} />
                <span>{isSyncing ? t('resyncing') : t('sendTestBtn')}</span>
              </button>
              <button
                className="np-guide-btn-close"
                onClick={() => setShowGuideModal(false)}
                type="button"
              >
                {t('closeGuide')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          dialog={confirmDialog}
          isWorking={isClearing}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={async () => {
            if (confirmDialog.onConfirm) {
              await confirmDialog.onConfirm()
            }
          }}
        />
      )}
    </section>
  )
}