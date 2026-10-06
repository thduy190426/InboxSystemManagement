import type { AppNotification } from '../../types'
import { requestJson } from './apiClient'
import i18n from '../../i18n'

type NotificationsResponse = {
  notifications: AppNotification[]
}

export async function fetchNotifications() {
  const response = await requestJson<NotificationsResponse>('/notifications')

  return response.notifications
}

export async function markNotificationRead(notificationId: string) {
  await requestJson(`/notifications/${notificationId}/read`, {
    method: 'POST',
  })
}

export async function markAllNotificationsRead() {
  await requestJson('/notifications/read-all', {
    method: 'POST',
  })
}

export async function markConversationNotificationsRead(conversationId: string) {
  await requestJson(`/notifications/conversations/${conversationId}/read`, {
    method: 'POST',
  })
}
