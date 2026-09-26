import { AtSign, Bell, MessageCircle, UserPlus } from 'lucide-react'
import type { BrowserNotificationPermission } from '../../services/core/browserNotifications'
import type { AppNotification, ContactUser, Conversation } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'

type NotificationsPanelProps = {
  browserNotificationPermission: BrowserNotificationPermission
  conversations: Conversation[]
  friendRequests: ContactUser[]
  notifications: AppNotification[]
  onEnableBrowserNotifications: () => void
  onOpenContacts: () => void
  onOpenConversation: (conversationId: string) => void
  onOpenNotification: (notification: AppNotification) => void
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
}: NotificationsPanelProps) {
  const unreadConversations = conversations.filter((c) => c.unread > 0)
  const mentionNotifications = notifications.filter((n) => n.type === 'mention')
  const unreadMentionCount = mentionNotifications.filter((n) => !n.readAt).length
  const totalUnreadMessages = unreadConversations.reduce((total, c) => total + c.unread, 0)
  const totalNotifications = totalUnreadMessages + friendRequests.length + unreadMentionCount

  const browserNotificationLabel =
    browserNotificationPermission === 'granted' ? 'Thông báo đẩy đã bật'
    : browserNotificationPermission === 'denied' ? 'Trình duyệt đang chặn thông báo'
    : browserNotificationPermission === 'unsupported' ? 'Trình duyệt không hỗ trợ'
    : 'Bật thông báo trình duyệt'

  const isBrowserBtnDisabled =
    browserNotificationPermission === 'granted' ||
    browserNotificationPermission === 'denied' ||
    browserNotificationPermission === 'unsupported'

  return (
    <section className="np-page" aria-labelledby="notifications-title">
      <header className="np-page-header">
        <div>
          <div className="np-page-kicker">
            <Bell size={12} />
            Thông báo
          </div>
          <h1 id="notifications-title">Cập nhật mới nhất</h1>
        </div>
        <div className="np-header-aside">
          <button
            className={`np-push-btn${browserNotificationPermission === 'granted' ? ' np-push-btn--active' : ''}`}
            disabled={isBrowserBtnDisabled}
            onClick={onEnableBrowserNotifications}
            type="button"
          >
            <Bell size={14} />
            <span>{browserNotificationLabel}</span>
          </button>
          {totalNotifications > 0 && (
            <span className="np-total-badge">{totalNotifications}</span>
          )}
        </div>
      </header>

      <div className="np-grid">
        <NotificationSection
          icon={<MessageCircle size={15} />}
          title="Tin nhắn chưa đọc"
          count={totalUnreadMessages}
          emptyText="Không có tin nhắn chưa đọc!"
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

        <NotificationSection
          icon={<AtSign size={15} />}
          title="Nhắc đến bạn"
          count={unreadMentionCount}
          emptyText="Chưa có mention mới!"
        >
          {mentionNotifications.map((notification) => (
            <button
              className={`np-row${!notification.readAt ? ' np-row--unread' : ''}`}
              key={notification.id}
              onClick={() => onOpenNotification(notification)}
              type="button"
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
              {!notification.readAt && <span className="np-badge">1</span>}
            </button>
          ))}
        </NotificationSection>

        <NotificationSection
          icon={<UserPlus size={15} />}
          title="Lời mời kết bạn"
          count={friendRequests.length}
          emptyText="Không có lời mời kết bạn mới!"
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
                <small>Muốn kết bạn với bạn</small>
              </div>
              <span className="np-badge">1</span>
            </button>
          ))}
        </NotificationSection>
      </div>
    </section>
  )
}