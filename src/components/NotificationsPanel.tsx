import { AtSign, Bell, MessageCircle, UserPlus } from 'lucide-react'
import type { BrowserNotificationPermission } from '../services/browserNotifications'
import type { AppNotification, ContactUser, Conversation } from '../types'
import { AvatarFallback } from './AvatarFallback'

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
  const unreadConversations = conversations.filter((conversation) => conversation.unread > 0)
  const mentionNotifications = notifications.filter((notification) => notification.type === 'mention')
  const unreadMentionCount = mentionNotifications.filter((notification) => !notification.readAt).length
  const totalUnreadMessages = unreadConversations.reduce(
    (total, conversation) => total + conversation.unread,
    0,
  )
  const totalNotifications = totalUnreadMessages + friendRequests.length + unreadMentionCount
  const browserNotificationLabel =
    browserNotificationPermission === 'granted'
      ? 'Đã bật thông báo trình duyệt!'
      : browserNotificationPermission === 'denied'
        ? 'Trình duyệt đang chặn thông báo!'
        : browserNotificationPermission === 'unsupported'
          ? 'Trình duyệt không hỗ trợ thông báo!'
          : 'Bật thông báo trình duyệt'

  return (
    <section className="notifications-panel">
      <header className="notifications-header">
        <div>
          <span className="section-kicker">Thông báo</span>
          <h1>Cập nhật mới nhất</h1>
        </div>
        <div className="notifications-header-actions">
          <button
            disabled={
              browserNotificationPermission === 'granted' ||
              browserNotificationPermission === 'denied' ||
              browserNotificationPermission === 'unsupported'
            }
            onClick={onEnableBrowserNotifications}
            type="button"
          >
            <Bell size={16} />
            <span>{browserNotificationLabel}</span>
          </button>
          <span className="notifications-count">{totalNotifications}</span>
        </div>
      </header>

      <div className="notifications-grid">
        <section className="notifications-section">
          <div className="notifications-section-title">
            <div>
              <MessageCircle size={18} />
              <h2>Tin nhắn chưa đọc</h2>
            </div>
            <span>{totalUnreadMessages}</span>
          </div>

          <div className="notification-list">
            {unreadConversations.map((conversation) => (
              <button
                className="notification-row animate-in"
                key={conversation.id}
                onClick={() => onOpenConversation(conversation.id)}
                type="button"
              >
                <AvatarFallback name={conversation.name} src={conversation.avatar} />
                <div>
                  <strong>{conversation.name}</strong>
                  <span>{conversation.lastMessage}</span>
                  <small>{conversation.lastTime}</small>
                </div>
                <em>{conversation.unread}</em>
              </button>
            ))}
            {unreadConversations.length === 0 ? (
              <div className="notification-empty">
                <Bell size={18} />
                <span>Không có tin nhắn chưa đọc!</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="notifications-section">
          <div className="notifications-section-title">
            <div>
              <AtSign size={18} />
              <h2>Nhắc đến bạn</h2>
            </div>
            <span>{unreadMentionCount}</span>
          </div>

          <div className="notification-list">
            {mentionNotifications.map((notification) => (
              <button
                className={notification.readAt ? 'notification-row animate-in' : 'notification-row is-unread animate-in'}
                key={notification.id}
                onClick={() => onOpenNotification(notification)}
                type="button"
              >
                <AvatarFallback
                  name={notification.actor?.fullName || notification.conversationName}
                  src={notification.actor?.avatarUrl || notification.conversationAvatar}
                />
                <div>
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  <small>{notification.conversationName} · {notification.time}</small>
                </div>
                {!notification.readAt ? <em>1</em> : null}
              </button>
            ))}
            {mentionNotifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={18} />
                <span>Chưa có mention mới!</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="notifications-section">
          <div className="notifications-section-title">
            <div>
              <UserPlus size={18} />
              <h2>Lời mời kết bạn</h2>
            </div>
            <span>{friendRequests.length}</span>
          </div>

          <div className="notification-list">
            {friendRequests.map((request) => (
              <button
                className="notification-row animate-in"
                key={request.id}
                onClick={onOpenContacts}
                type="button"
              >
                <AvatarFallback name={request.fullName} src={request.avatarUrl} />
                <div>
                  <strong>{request.fullName}</strong>
                  <span>{request.email}</span>
                  <small>Muốn kết bạn với bạn!</small>
                </div>
                <em>1</em>
              </button>
            ))}
            {friendRequests.length === 0 ? (
              <div className="notification-empty">
                <Bell size={18} />
                <span>Không có lời mời kết bạn mới!</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}
