const { pool } = require('../config/db')

function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function mapNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    body: row.body || '',
    readAt: row.read_at || null,
    createdAt: row.created_at,
    time: formatRelativeTime(row.created_at),
    actor: row.actor_public_id
      ? {
          id: row.actor_public_id,
          fullName: row.actor_full_name,
          avatarUrl: row.actor_avatar_url,
        }
      : null,
    conversationId: row.conversation_id ? String(row.conversation_id) : null,
    messageId: row.message_id ? String(row.message_id) : null,
    conversationName: row.conversation_title || row.direct_name || 'Hội thoại',
    conversationAvatar: row.conversation_avatar_url || row.direct_avatar_url || null,
  }
}

async function listNotifications(request, response, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        notifications.id,
        notifications.type,
        notifications.title,
        notifications.body,
        notifications.read_at,
        notifications.created_at,
        notifications.conversation_id,
        notifications.message_id,
        actors.public_id AS actor_public_id,
        actors.full_name AS actor_full_name,
        actors.avatar_url AS actor_avatar_url,
        conversations.title AS conversation_title,
        conversations.avatar_url AS conversation_avatar_url,
        direct_users.full_name AS direct_name,
        direct_users.avatar_url AS direct_avatar_url
      FROM notifications
      LEFT JOIN users AS actors ON actors.id = notifications.actor_id
      LEFT JOIN conversations ON conversations.id = notifications.conversation_id
      LEFT JOIN conversation_participants AS direct_participants
        ON direct_participants.conversation_id = conversations.id
        AND direct_participants.user_id <> ?
        AND direct_participants.left_at IS NULL
      LEFT JOIN users AS direct_users ON direct_users.id = direct_participants.user_id
      WHERE notifications.user_id = ?
      ORDER BY notifications.created_at DESC, notifications.id DESC
      LIMIT 50`,
      [request.user.id, request.user.id],
    )

    response.json({
      notifications: rows.map(mapNotification),
    })
  } catch (error) {
    next(error)
  }
}

async function markNotificationRead(request, response, next) {
  try {
    const notificationId = Number(request.params.notificationId)

    if (!Number.isInteger(notificationId)) {
      return response.status(400).json({
        message: 'Thông báo không hợp lệ!',
      })
    }

    await pool.execute(
      `UPDATE notifications
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND user_id = ?`,
      [notificationId, request.user.id],
    )

    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

async function markConversationNotificationsRead(request, response, next) {
  try {
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Hội thoại không hợp lệ!',
      })
    }

    await pool.execute(
      `UPDATE notifications
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE user_id = ?
        AND conversation_id = ?
        AND read_at IS NULL`,
      [request.user.id, conversationId],
    )

    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

async function markAllNotificationsRead(request, response, next) {
  try {
    await pool.execute(
      `UPDATE notifications
      SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE user_id = ? AND read_at IS NULL`,
      [request.user.id],
    )

    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listNotifications,
  markAllNotificationsRead,
  markConversationNotificationsRead,
  markNotificationRead,
}
