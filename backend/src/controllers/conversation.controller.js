const { randomUUID } = require('crypto')
const { pool } = require('../config/db')
const { emitToConversation, emitToUsers } = require('../realtime/socket')
const { sendWebPushToUsers } = require('../services/push.service')

const accentColors = ['#14b8a6', '#f97316', '#4f46e5', '#db2777', '#2563eb']
const typingIndicators = new Map()
const TYPING_TTL_MS = 5000
const messagePinsTableReady = pool
  .execute(
    `CREATE TABLE IF NOT EXISTS message_pins (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      message_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      conversation_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_message_pin (message_id, user_id),
      INDEX idx_message_pins_user (user_id, created_at),
      INDEX idx_message_pins_conversation (conversation_id, created_at)
    )`,
  )
  .then(async () => {
    await pool.execute(
      `ALTER TABLE message_pins
        ADD COLUMN conversation_id BIGINT UNSIGNED NULL`,
    ).catch((error) => {
      if (error && error.code === 'ER_DUP_FIELDNAME') {
        return
      }

      throw error
    })
    await pool.execute(
      `ALTER TABLE message_pins
        ADD INDEX idx_message_pins_conversation (conversation_id, created_at)`,
    ).catch((error) => {
      if (error && error.code === 'ER_DUP_KEYNAME') {
        return
      }

      throw error
    })
  })
  .catch((error) => {
    console.error('Không thể đảm bảo bảng message_pins:', error)
    throw error
  })
const messageHiddenEntriesTableReady = pool
  .execute(
    `CREATE TABLE IF NOT EXISTS message_hidden_entries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      message_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_message_hidden_entry (message_id, user_id),
      INDEX idx_message_hidden_entries_user (user_id, created_at)
    )`,
  )
  .catch((error) => {
    console.error('Không thể đảm bảo bảng message_hidden_entries:', error)
    throw error
  })
const messagePollsTablesReady = pool
  .execute(
    `ALTER TABLE messages
      MODIFY type ENUM('text', 'image', 'file', 'audio', 'video', 'system', 'poll') NOT NULL DEFAULT 'text'`,
  )
  .catch((error) => {
    console.error('Không thể đảm bảo loại tin nhắn khảo sát:', error)
    throw error
  })
  .then(async () => {
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS message_polls (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        question VARCHAR(255) NOT NULL,
        allow_multiple TINYINT(1) NOT NULL DEFAULT 0,
        is_closed TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_message_polls_message (message_id)
      )`,
    )
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS message_poll_options (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        poll_id BIGINT UNSIGNED NOT NULL,
        option_text VARCHAR(120) NOT NULL,
        position INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_message_poll_options_poll (poll_id, position)
      )`,
    )
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS message_poll_votes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        option_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_message_poll_votes_option_user (option_id, user_id),
        INDEX idx_message_poll_votes_user (user_id, created_at)
      )`,
    )
  })
  .catch((error) => {
    console.error('Không thể đảm bảo bảng khảo sát tin nhắn:', error)
    throw error
  })
const conversationParticipantHiddenAtReady = pool
  .execute(
    `ALTER TABLE conversation_participants
      ADD COLUMN hidden_at TIMESTAMP NULL DEFAULT NULL`,
  )
  .catch((error) => {
    if (error && error.code === 'ER_DUP_FIELDNAME') {
      return
    }

    console.error('Không thể đảm bảo cột hidden_at cho người tham gia cuộc trò chuyện:', error)
    throw error
  })
const groupInviteTokensTableReady = pool
  .execute(
    `CREATE TABLE IF NOT EXISTS group_invite_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      token CHAR(36) NOT NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_group_invite_tokens_token (token),
      INDEX idx_group_invite_tokens_conversation (conversation_id, revoked_at)
    )`,
  )
  .catch((error) => {
    console.error('Không thể đảm bảo bảng group_invite_tokens:', error)
    throw error
  })
const groupJoinRequestsTableReady = pool
  .execute(
    `CREATE TABLE IF NOT EXISTS group_join_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      public_id CHAR(36) NOT NULL,
      conversation_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      invite_token_id BIGINT UNSIGNED NULL,
      status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_group_join_requests_public_id (public_id),
      UNIQUE KEY uq_group_join_requests_pending (conversation_id, user_id, status),
      INDEX idx_group_join_requests_conversation (conversation_id, status, created_at)
    )`,
  )
  .catch((error) => {
    console.error('Không thể đảm bảo bảng group_join_requests:', error)
    throw error
  })

async function ensureMessagePinsTable() {
  await messagePinsTableReady
}

async function ensureMessageHiddenEntriesTable() {
  await messageHiddenEntriesTableReady
}

async function ensureMessagePollsTables() {
  await messagePollsTablesReady
}

async function ensureConversationParticipantHiddenAtColumn() {
  await conversationParticipantHiddenAtReady
}

async function ensureGroupInviteTables() {
  await groupInviteTokensTableReady
  await groupJoinRequestsTableReady
}

function formatOfflineDuration(lastSeenAt) {
  if (!lastSeenAt) {
    return 'Ngoại tuyến'
  }

  const elapsedMs = Date.now() - new Date(lastSeenAt).getTime()

  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return 'Ngoại tuyến'
  }

  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  const elapsedDays = Math.floor(elapsedHours / 24)

  if (elapsedSeconds < 60) {
    return 'Hoạt động vài giây trước'
  }

  if (elapsedMinutes < 60) {
    return `Hoạt động ${elapsedMinutes} phút trước`
  }

  if (elapsedHours < 24) {
    return `Hoạt động ${elapsedHours} giờ trước`
  }

  if (elapsedDays < 30) {
    return `Hoạt động ${elapsedDays} ngày trước`
  }

  const elapsedMonths = Math.floor(elapsedDays / 30)

  if (elapsedMonths < 12) {
    return `Hoạt động ${elapsedMonths} tháng trước`
  }

  return `Hoạt động ${Math.floor(elapsedMonths / 12)} năm trước`
}

function getPresenceLabel(presence, lastSeenAt = null) {
  if (presence === 'online') {
    return 'Đang trực tuyến'
  }

  if (presence === 'away') {
    return 'Tạm vắng'
  }

  if (presence === 'busy') {
    return 'Đang bận'
  }

  return formatOfflineDuration(lastSeenAt)
}

function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCallDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCallDuration(seconds) {
  const safeSeconds = Math.max(Number(seconds || 0), 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    return `${hours} giờ ${remainingMinutes} phút`
  }

  if (minutes > 0) {
    return `${minutes} phút ${remainingSeconds} giây`
  }

  return `${remainingSeconds} giây`
}

function getCallStatusLabel(status, participantStatus) {
  if (participantStatus === 'missed' || status === 'missed') {
    return 'Cuộc gọi nhỡ'
  }

  if (participantStatus === 'declined' || status === 'declined') {
    return 'Đã từ chối!'
  }

  if (status === 'cancelled') {
    return 'Đã hủy!'
  }

  if (status === 'ongoing') {
    return 'Đang diễn ra!'
  }

  if (status === 'ringing') {
    return 'Đang đổ chuông!'
  }

  return 'Đã kết thúc!'
}

function mapAttachment(row) {
  const attachmentType = row.mime_type.startsWith('image/')
    ? 'image'
    : row.mime_type.startsWith('audio/')
      ? 'audio'
      : 'file'

  return {
    name: row.original_name,
    meta: `${Math.max(row.file_size_bytes / 1024 / 1024, 0.01).toFixed(1)} MB`,
    type: attachmentType,
    url: row.storage_url,
    mimeType: row.mime_type,
    sizeBytes: Number(row.file_size_bytes || 0),
  }
}

function getAttachmentPreview(type) {
  if (type === 'image') {
    return 'Đã gửi một ảnh!'
  }

  if (type === 'audio') {
    return 'Đã gửi một tin nhắn thoại!'
  }

  if (type === 'file' || type === 'video') {
    return 'Đã gửi một tệp!'
  }

  return ''
}

function getConversationLastMessagePreview(row) {
  const attachmentPreview = getAttachmentPreview(row.last_message_type)

  if (attachmentPreview) {
    return {
      text: attachmentPreview,
      isAttachment: true,
    }
  }

  return {
    text: row.last_message_body || 'Chưa có tin nhắn!',
    isAttachment: false,
  }
}

function mapMessage(
  row,
  currentUserId,
  attachmentsByMessage = {},
  reactionsByMessage = {},
  mentionsByMessage = {},
) {
  const replyTo = row.parent_message_id
    ? {
        id: String(row.parent_message_id),
        author:
          row.parent_sender_id === currentUserId
            ? 'me'
            : row.parent_type === 'system'
              ? 'system'
              : 'them',
        text:
          row.parent_deleted_at
            ? 'Tin nhắn đã bị xoá!'
            : row.parent_body ||
              (row.parent_type === 'image'
                ? 'Hình ảnh'
                : row.parent_type === 'audio'
                  ? 'Tin nhắn thoại'
                  : 'Tệp đính kèm'),
        type: row.parent_type,
        senderName: row.parent_sender_name || null,
      }
    : null

  if (row.type === 'system') {
    return {
      id: String(row.id),
      author: 'system',
      text: row.body || '',
      time: formatRelativeTime(row.created_at),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readAt: null,
      type: 'system',
      senderAvatar: row.sender_avatar_url,
    senderName: row.sender_name,
    replyTo,
    mentions: [],
    reactions: [],
    attachments: [],
    }
  }

  const isOwnMessage = row.sender_id === currentUserId
  const messageState = isOwnMessage
    ? row.latest_read_at
      ? 'seen'
      : row.latest_delivered_at
        ? 'delivered'
        : row.status
    : undefined

  return {
    id: String(row.id),
    author: isOwnMessage ? 'me' : 'them',
    text: row.body || '',
    time: formatRelativeTime(row.created_at),
    type: row.type,
    state: messageState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: isOwnMessage ? row.latest_read_at : undefined,
    seenAt: isOwnMessage ? formatRelativeTime(row.latest_read_at) : undefined,
    isEdited: Boolean(row.edited_at),
    isPinned: Boolean(row.pinned_at),
    senderAvatar: row.sender_avatar_url,
    senderName: row.sender_name,
    replyTo,
    mentions: mentionsByMessage[row.id] || [],
    reactions: reactionsByMessage[row.id] || [],
    attachments: attachmentsByMessage[row.id] || [],
  }
}

async function findActiveParticipant(connection, conversationId, userId) {
  const [participantRows] = await connection.execute(
    `SELECT id, role FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    LIMIT 1`,
    [conversationId, userId],
  )

  return participantRows[0]
}

async function findActiveGroupParticipant(connection, conversationId, userId) {
  const [participantRows] = await connection.execute(
    `SELECT conversation_participants.id, conversation_participants.role, conversations.title
    FROM conversations
    INNER JOIN conversation_participants
      ON conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = ?
      AND conversation_participants.left_at IS NULL
    WHERE conversations.id = ?
      AND conversations.type = 'group'
      AND conversations.deleted_at IS NULL
    LIMIT 1`,
    [userId, conversationId],
  )

  return participantRows[0]
}

function canManageGroup(role) {
  return role === 'owner' || role === 'admin'
}

function canManageMemberRole(actorRole, targetRole) {
  if (actorRole === 'owner') {
    return targetRole !== 'owner'
  }

  return false
}

async function emitConversationChanged(connection, conversationId, actorUserId, eventType) {
  try {
    await ensureMessageHiddenEntriesTable()
    const [rows] = await connection.execute(
      `SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = ? AND left_at IS NULL`,
      [conversationId],
    )

    emitToConversation(conversationId, 'conversation:changed', {
      conversationId: String(conversationId),
      actorUserId: String(actorUserId),
      eventType,
      userIds: rows.map((row) => Number(row.user_id)),
    })
  } catch (error) {
    console.error('Không thể phát ra sự kiện thời gian thực của cuộc trò chuyện:', error)
  }
}

async function loadConversationPushRecipientIds(connection, conversationId, actorUserId) {
  const [rows] = await connection.execute(
    `SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = ?
      AND user_id <> ?
      AND left_at IS NULL`,
    [conversationId, actorUserId],
  )

  return rows.map((row) => row.user_id)
}

function pushWebNotificationToUsers(userIds, payload) {
  sendWebPushToUsers(userIds, payload).catch((error) => {
    console.error('Không thể gửi thông báo đẩy trên Web:', error)
  })
}

function getTypingKey(conversationId, userId) {
  return `${conversationId}:${userId}`
}

function pruneTypingIndicators(now = Date.now()) {
  for (const [key, indicator] of typingIndicators.entries()) {
    if (indicator.expiresAt <= now) {
      typingIndicators.delete(key)
    }
  }
}

async function hasBlockedDirectContact(connection, conversationId, currentUserId) {
  const [rows] = await connection.execute(
    `SELECT contacts.id
    FROM conversations
    INNER JOIN conversation_participants AS other_participants
      ON other_participants.conversation_id = conversations.id
      AND other_participants.user_id <> ?
      AND other_participants.left_at IS NULL
    INNER JOIN contacts
      ON (
        contacts.owner_user_id = ?
        AND contacts.contact_user_id = other_participants.user_id
      )
      OR (
        contacts.owner_user_id = other_participants.user_id
        AND contacts.contact_user_id = ?
      )
    WHERE conversations.id = ?
      AND conversations.type = 'direct'
      AND conversations.deleted_at IS NULL
      AND contacts.status = 'blocked'
    LIMIT 1`,
    [currentUserId, currentUserId, currentUserId, conversationId],
  )

  return Boolean(rows[0])
}

async function createSystemMessage(connection, conversationId, actorUserId, text) {
  const [result] = await connection.execute(
    `INSERT INTO messages (
      public_id,
      conversation_id,
      sender_id,
      type,
      body,
      status
    ) VALUES (?, ?, ?, 'system', ?, 'sent')`,
    [randomUUID(), conversationId, actorUserId, text],
  )

  await connection.execute(
    `UPDATE conversations
    SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [result.insertId, conversationId],
  )

  return result.insertId
}

async function loadConversationMembers(connection, conversationId, currentUserId) {
  const participant = await findActiveParticipant(connection, conversationId, currentUserId)

  if (!participant) {
    return null
  }

  const [rows] = await connection.execute(
    `SELECT
      users.id,
      users.public_id,
      users.full_name,
      users.email,
      users.avatar_url,
      users.online_since,
      conversation_participants.role,
      conversation_participants.custom_title,
      conversation_participants.joined_at,
      conversation_participants.created_at,
      conversation_participants.updated_at,
      CASE
        WHEN users.presence = 'online'
          AND users.last_seen_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
          THEN 'online'
        WHEN users.presence IN ('away', 'busy') THEN users.presence
        ELSE 'offline'
      END AS presence
    FROM conversation_participants
    INNER JOIN users ON users.id = conversation_participants.user_id
    WHERE conversation_participants.conversation_id = ?
      AND conversation_participants.left_at IS NULL
      AND users.deleted_at IS NULL
    ORDER BY
      FIELD(conversation_participants.role, 'owner', 'admin', 'moderator', 'member'),
      users.full_name ASC`,
    [conversationId],
  )

  return rows.map((row) => ({
    id: row.public_id,
    userId: Number(row.id),
    fullName: row.full_name,
    nickname: row.custom_title || null,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    presence: row.presence,
    onlineSince: row.online_since || null,
    joinedAt: formatRelativeTime(row.joined_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function normalizeNickname(value) {
  if (value === null || value === undefined) {
    return null
  }

  const nickname = String(value).trim()

  if (!nickname) {
    return null
  }

  if (nickname.length > 80) {
    return false
  }

  return nickname
}

function normalizeMentionToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getMentionCandidates(text) {
  const matches = text.matchAll(/@([\p{L}\p{N}][\p{L}\p{N}\s._-]{0,80})/gu)

  return [...matches]
    .map((match) => match[1].replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function resolveMentionedMembers(text, members, currentUserId) {
  const candidates = getMentionCandidates(text)
  const mentionedByUserId = new Map()

  candidates.forEach((candidate) => {
    const normalizedCandidate = normalizeMentionToken(candidate)

    if (!normalizedCandidate) {
      return
    }

    const matchingMembers = members.filter((member) => {
      if (member.userId === currentUserId) {
        return false
      }

      const aliases = [
        member.fullName,
        member.nickname,
        member.email?.split('@')[0],
      ].filter(Boolean)

      return aliases.some((alias) => {
        const normalizedAlias = normalizeMentionToken(alias)

        return (
          normalizedAlias === normalizedCandidate ||
          normalizedAlias.startsWith(`${normalizedCandidate} `) ||
          normalizedCandidate.startsWith(`${normalizedAlias} `)
        )
      })
    })

    if (matchingMembers.length === 1) {
      mentionedByUserId.set(matchingMembers[0].userId, matchingMembers[0])
    }
  })

  return [...mentionedByUserId.values()]
}

async function updateConversationLastMessage(connection, conversationId) {
  const [lastMessageRows] = await connection.execute(
    `SELECT id, created_at FROM messages
    WHERE conversation_id = ?
      AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1`,
    [conversationId],
  )

  const lastMessage = lastMessageRows[0]

  await connection.execute(
    `UPDATE conversations
    SET last_message_id = ?, last_message_at = ?
    WHERE id = ?`,
    [lastMessage?.id ?? null, lastMessage?.created_at ?? null, conversationId],
  )
}

async function loadConversationMessages(
  connection,
  conversationId,
  currentUserId,
  options = {},
) {
  await ensureMessagePinsTable()
  await ensureMessageHiddenEntriesTable()
  const requestedLimit = Number(options.limit)
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 40
  const targetMessageId = Number(options.messageId)
  const hasTargetMessageId = Number.isInteger(targetMessageId) && targetMessageId > 0
  const aroundMessageId = Number(options.aroundMessageId)
  const hasAroundMessageId = Number.isInteger(aroundMessageId) && aroundMessageId > 0
  const beforeMessageId = Number(options.beforeMessageId)
  let beforeCreatedAt = null
  let aroundCreatedAt = null

  if (!hasTargetMessageId && hasAroundMessageId) {
    const [targetRows] = await connection.execute(
      `SELECT id, created_at
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [aroundMessageId, conversationId],
    )

    if (!targetRows[0]) {
      return {
        messages: [],
        hasMore: false,
        nextCursor: null,
      }
    }

    aroundCreatedAt = targetRows[0].created_at
  }

  if (!hasTargetMessageId && !hasAroundMessageId && Number.isInteger(beforeMessageId) && beforeMessageId > 0) {
    const [cursorRows] = await connection.execute(
      `SELECT id, created_at
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [beforeMessageId, conversationId],
    )

    if (!cursorRows[0]) {
      return {
        messages: [],
        hasMore: false,
        nextCursor: null,
      }
    }

    beforeCreatedAt = cursorRows[0].created_at
  }

  const messageFilterClause = hasTargetMessageId
    ? 'AND messages.id = ?'
    : hasAroundMessageId
      ? `AND (
        messages.created_at < ?
        OR (messages.created_at = ? AND messages.id <= ?)
      )`
    : beforeCreatedAt
      ? `AND (
        messages.created_at < ?
        OR (messages.created_at = ? AND messages.id < ?)
      )`
      : ''
  const messageFilterParams = hasTargetMessageId
    ? [targetMessageId]
    : hasAroundMessageId
      ? [aroundCreatedAt, aroundCreatedAt, aroundMessageId]
    : beforeCreatedAt
      ? [beforeCreatedAt, beforeCreatedAt, beforeMessageId]
      : []
  const messageQueryParams = [
    currentUserId,
    conversationId,
    ...messageFilterParams,
  ]
  const queryLimit = hasTargetMessageId ? 1 : limit + 1

  const [messageRows] = await connection.execute(
    `SELECT
      messages.id,
      messages.parent_message_id,
      messages.sender_id,
      messages.type,
      messages.body,
      messages.status,
      messages.edited_at,
      messages.created_at,
      messages.updated_at,
      MIN(message_pins.created_at) AS pinned_at,
      users.full_name AS sender_name,
      users.avatar_url AS sender_avatar_url,
      parent_messages.sender_id AS parent_sender_id,
      parent_messages.type AS parent_type,
      parent_messages.body AS parent_body,
      parent_messages.deleted_at AS parent_deleted_at,
      parent_users.full_name AS parent_sender_name,
      MAX(message_receipts.delivered_at) AS latest_delivered_at,
      MAX(message_receipts.read_at) AS latest_read_at
    FROM messages
    INNER JOIN users ON users.id = messages.sender_id
    LEFT JOIN messages AS parent_messages
      ON parent_messages.id = messages.parent_message_id
      AND parent_messages.conversation_id = messages.conversation_id
    LEFT JOIN users AS parent_users ON parent_users.id = parent_messages.sender_id
    LEFT JOIN message_receipts
      ON message_receipts.message_id = messages.id
      AND message_receipts.user_id <> messages.sender_id
    LEFT JOIN message_pins
      ON message_pins.message_id = messages.id
      AND (message_pins.conversation_id = messages.conversation_id OR message_pins.conversation_id IS NULL)
    LEFT JOIN message_hidden_entries
      ON message_hidden_entries.message_id = messages.id
      AND message_hidden_entries.user_id = ?
    WHERE messages.conversation_id = ?
      AND messages.deleted_at IS NULL
      AND message_hidden_entries.id IS NULL
      ${messageFilterClause}
    GROUP BY
      messages.id,
      messages.parent_message_id,
      messages.sender_id,
      messages.type,
      messages.body,
      messages.status,
      messages.edited_at,
      messages.created_at,
      messages.updated_at,
      users.full_name,
      users.avatar_url,
      parent_messages.sender_id,
      parent_messages.type,
      parent_messages.body,
      parent_messages.deleted_at,
      parent_users.full_name
    ORDER BY messages.created_at DESC, messages.id DESC
    LIMIT ${queryLimit}`,
    messageQueryParams,
  )

  const hasMore = !hasTargetMessageId && !hasAroundMessageId && messageRows.length > limit
  const visibleMessageRows = hasMore ? messageRows.slice(0, limit) : messageRows
  visibleMessageRows.reverse()

  const messageIds = visibleMessageRows.map((row) => row.id)
  let attachmentRows = []
  let reactionRows = []
  let mentionRows = []

  if (messageIds.length > 0) {
    const placeholders = messageIds.map(() => '?').join(',')

    ;[attachmentRows] = await connection.execute(
      `SELECT
        message_id,
        original_name,
        mime_type,
        file_size_bytes,
        storage_url
      FROM message_attachments
      WHERE message_id IN (${placeholders})
      ORDER BY created_at ASC`,
      messageIds,
    )

    ;[reactionRows] = await connection.execute(
      `SELECT
        message_id,
        emoji,
        COUNT(*) AS reaction_count,
        MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS reacted_by_me
      FROM message_reactions
      WHERE message_id IN (${placeholders})
      GROUP BY message_id, emoji
      ORDER BY MIN(created_at) ASC`,
      [currentUserId, ...messageIds],
    )

    ;[mentionRows] = await connection.execute(
      `SELECT
        notifications.message_id,
        users.public_id,
        users.full_name,
        users.avatar_url
      FROM notifications
      INNER JOIN users ON users.id = notifications.user_id
      WHERE notifications.type = 'mention'
        AND notifications.message_id IN (${placeholders})
      ORDER BY users.full_name ASC`,
      messageIds,
    )
  }

  const attachmentsByMessage = attachmentRows.reduce((result, row) => {
    result[row.message_id] = result[row.message_id] || []
    result[row.message_id].push(mapAttachment(row))
    return result
  }, {})

  const reactionsByMessage = reactionRows.reduce((result, row) => {
    result[row.message_id] = result[row.message_id] || []
    result[row.message_id].push({
      emoji: row.emoji,
      count: Number(row.reaction_count || 0),
      reactedByMe: Boolean(row.reacted_by_me),
    })
    return result
  }, {})

  const mentionsByMessage = mentionRows.reduce((result, row) => {
    result[row.message_id] = result[row.message_id] || []
    result[row.message_id].push({
      id: row.public_id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
    })
    return result
  }, {})

  const messages = visibleMessageRows.map((row) =>
    mapMessage(row, currentUserId, attachmentsByMessage, reactionsByMessage, mentionsByMessage),
  )

  return {
    messages,
    hasMore,
    nextCursor: hasMore && messages.length > 0 ? messages[0].id : null,
  }
}

async function touchDeliveredReceipts(connection, conversationId, currentUserId) {
  await connection.execute(
    `INSERT INTO message_receipts (message_id, user_id, delivered_at)
    SELECT messages.id, ?, CURRENT_TIMESTAMP
    FROM messages
    WHERE messages.conversation_id = ?
      AND messages.sender_id <> ?
      AND messages.deleted_at IS NULL
    ON DUPLICATE KEY UPDATE
      delivered_at = COALESCE(delivered_at, VALUES(delivered_at))`,
    [currentUserId, conversationId, currentUserId],
  )
}

async function loadConversationSummary(connection, conversationId, currentUserId) {
  await ensureMessageHiddenEntriesTable()
  await ensureConversationParticipantHiddenAtColumn()

  const [conversationRows] = await connection.execute(
    `SELECT
      conversations.id,
      conversations.public_id,
      conversations.type,
      conversations.title,
      conversations.avatar_url,
      last_messages.created_at AS visible_last_message_at,
      conversations.is_archived,
      participant_settings.is_pinned,
      participant_settings.is_muted,
      participant_settings.last_read_message_id,
      last_messages.body AS last_message_body,
      last_messages.type AS last_message_type,
      last_messages.sender_id AS last_message_sender_id,
      other_users.full_name AS direct_name,
      other_users.avatar_url AS direct_avatar_url,
      other_users.bio AS direct_role,
      other_users.status_message AS direct_status,
      other_users.last_seen_at AS direct_last_seen_at,
      other_users.online_since AS direct_online_since,
      direct_contacts.id AS direct_contact_id,
      direct_contacts.status AS direct_friendship_status,
      direct_contacts.nickname AS direct_nickname,
      member_counts.member_count,
      CASE
        WHEN other_users.presence = 'online'
          AND other_users.last_seen_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
          THEN 'online'
        WHEN other_users.presence IN ('away', 'busy') THEN other_users.presence
        ELSE 'offline'
      END AS direct_presence
    FROM conversations
    INNER JOIN conversation_participants AS participant_settings
      ON participant_settings.conversation_id = conversations.id
      AND participant_settings.user_id = ?
      AND participant_settings.left_at IS NULL
      AND participant_settings.hidden_at IS NULL
    LEFT JOIN messages AS last_messages
      ON last_messages.id = (
        SELECT visible_messages.id
        FROM messages AS visible_messages
        LEFT JOIN message_hidden_entries AS hidden_messages
          ON hidden_messages.message_id = visible_messages.id
          AND hidden_messages.user_id = ?
        WHERE visible_messages.conversation_id = conversations.id
          AND visible_messages.deleted_at IS NULL
          AND hidden_messages.id IS NULL
        ORDER BY visible_messages.created_at DESC, visible_messages.id DESC
        LIMIT 1
      )
    LEFT JOIN (
      SELECT
        conversation_id,
        MIN(user_id) AS user_id
      FROM conversation_participants
      WHERE user_id <> ?
        AND left_at IS NULL
      GROUP BY conversation_id
    ) AS other_participants
      ON other_participants.conversation_id = conversations.id
    LEFT JOIN users AS other_users
      ON other_users.id = other_participants.user_id
    LEFT JOIN contacts AS direct_contacts
      ON direct_contacts.owner_user_id = ?
      AND direct_contacts.contact_user_id = other_users.id
    LEFT JOIN (
      SELECT conversation_id, COUNT(*) AS member_count
      FROM conversation_participants
      WHERE left_at IS NULL
      GROUP BY conversation_id
    ) AS member_counts
      ON member_counts.conversation_id = conversations.id
    WHERE conversations.id = ?
      AND conversations.deleted_at IS NULL
    LIMIT 1`,
    [currentUserId, currentUserId, currentUserId, currentUserId, conversationId],
  )

  const row = conversationRows[0]

  if (!row) {
    return null
  }

  const isDirect = row.type === 'direct'
  const name = isDirect ? row.direct_nickname || row.direct_name : row.title
  const avatar = isDirect ? row.direct_avatar_url : row.avatar_url
  const memberCount = Number(row.member_count || 0)
  const lastMessagePreview = getConversationLastMessagePreview(row)

  return {
    id: String(row.id),
    publicId: row.public_id,
    type: row.type,
    name: name || 'Hội thoại',
    role: isDirect ? row.direct_role || 'Thành viên' : row.type === 'support' ? 'Nhóm hỗ trợ' : `${memberCount} thành viên`,
    status: isDirect
      ? row.direct_status || getPresenceLabel(row.direct_presence, row.direct_last_seen_at)
      : row.type === 'support'
        ? 'Đang xử lý hỗ trợ'
        : `${memberCount} thành viên`,
    avatar: avatar || null,
    accent: accentColors[0],
    lastMessage: lastMessagePreview.text,
    lastMessageByMe: row.last_message_sender_id === currentUserId,
    lastMessageIsAttachment: lastMessagePreview.isAttachment,
    lastTime: formatRelativeTime(row.visible_last_message_at),
    lastMessageAt: row.visible_last_message_at || null,
    unread: 0,
    pinned: Boolean(row.is_pinned),
    muted: Boolean(row.is_muted),
    archived: Boolean(row.is_archived),
    contactId: row.direct_contact_id ? String(row.direct_contact_id) : null,
    nickname: isDirect ? row.direct_nickname || null : null,
    onlineSince: isDirect ? row.direct_online_since || null : null,
    friendshipStatus: row.direct_friendship_status || null,
    blocked: row.direct_friendship_status === 'blocked',
    presence: isDirect ? row.direct_presence || 'offline' : 'online',
    memberCount,
    messages: [],
    attachments: [],
  }
}

async function listConversations(request, response, next) {
  try {
    const currentUserId = request.user.id
    const includeArchived = request.query.archived === 'true'

    await ensureMessageHiddenEntriesTable()
    await ensureConversationParticipantHiddenAtColumn()

    const [conversationRows] = await pool.execute(
      `SELECT
        conversations.id,
        conversations.public_id,
        conversations.type,
        conversations.title,
        conversations.avatar_url,
        last_messages.created_at AS visible_last_message_at,
        conversations.is_archived,
        participant_settings.is_pinned,
        participant_settings.is_muted,
        participant_settings.last_read_message_id,
        last_messages.body AS last_message_body,
        last_messages.type AS last_message_type,
        last_messages.id AS last_message_id,
        last_messages.sender_id AS last_message_sender_id,
        other_users.full_name AS direct_name,
        other_users.avatar_url AS direct_avatar_url,
        other_users.bio AS direct_role,
        other_users.status_message AS direct_status,
        other_users.last_seen_at AS direct_last_seen_at,
        other_users.online_since AS direct_online_since,
        direct_contacts.id AS direct_contact_id,
        direct_contacts.status AS direct_friendship_status,
        direct_contacts.nickname AS direct_nickname,
        member_counts.member_count,
        CASE
          WHEN other_users.presence = 'online'
            AND other_users.last_seen_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
            THEN 'online'
          WHEN other_users.presence IN ('away', 'busy') THEN other_users.presence
          ELSE 'offline'
        END AS direct_presence
      FROM conversations
      INNER JOIN conversation_participants AS participant_settings
        ON participant_settings.conversation_id = conversations.id
        AND participant_settings.user_id = ?
        AND participant_settings.left_at IS NULL
        AND participant_settings.hidden_at IS NULL
      LEFT JOIN messages AS last_messages
        ON last_messages.id = (
          SELECT visible_messages.id
          FROM messages AS visible_messages
          LEFT JOIN message_hidden_entries AS hidden_messages
            ON hidden_messages.message_id = visible_messages.id
            AND hidden_messages.user_id = ?
          WHERE visible_messages.conversation_id = conversations.id
            AND visible_messages.deleted_at IS NULL
            AND hidden_messages.id IS NULL
          ORDER BY visible_messages.created_at DESC, visible_messages.id DESC
          LIMIT 1
        )
      LEFT JOIN (
        SELECT
          conversation_id,
          MIN(user_id) AS user_id
        FROM conversation_participants
        WHERE user_id <> ?
          AND left_at IS NULL
        GROUP BY conversation_id
      ) AS other_participants
        ON other_participants.conversation_id = conversations.id
      LEFT JOIN users AS other_users
        ON other_users.id = other_participants.user_id
      LEFT JOIN contacts AS direct_contacts
        ON direct_contacts.owner_user_id = ?
        AND direct_contacts.contact_user_id = other_users.id
      LEFT JOIN (
        SELECT conversation_id, COUNT(*) AS member_count
        FROM conversation_participants
        WHERE left_at IS NULL
        GROUP BY conversation_id
      ) AS member_counts
        ON member_counts.conversation_id = conversations.id
      WHERE conversations.deleted_at IS NULL
        AND conversations.is_archived = ?
      ORDER BY participant_settings.is_pinned DESC, visible_last_message_at DESC, conversations.updated_at DESC`,
      [currentUserId, currentUserId, currentUserId, currentUserId, includeArchived ? 1 : 0],
    )

    const conversationIds = conversationRows.map((row) => row.id)
    let attachmentRows = []
    let unreadRows = []
    let unreadSenderRows = []

    if (conversationIds.length > 0) {
      const placeholders = conversationIds.map(() => '?').join(',')

      ;[attachmentRows] = await pool.execute(
        `SELECT
          messages.conversation_id,
          message_attachments.original_name,
          message_attachments.mime_type,
          message_attachments.file_size_bytes
        FROM message_attachments
        INNER JOIN messages ON messages.id = message_attachments.message_id
        LEFT JOIN message_hidden_entries
          ON message_hidden_entries.message_id = messages.id
          AND message_hidden_entries.user_id = ?
        WHERE messages.conversation_id IN (${placeholders})
          AND messages.deleted_at IS NULL
          AND message_hidden_entries.id IS NULL
        ORDER BY message_attachments.created_at DESC`,
        [currentUserId, ...conversationIds],
      )

      ;[unreadRows] = await pool.execute(
        `SELECT
          conversation_participants.conversation_id,
          COUNT(messages.id) AS unread_count
        FROM conversation_participants
        LEFT JOIN messages
          ON messages.conversation_id = conversation_participants.conversation_id
          AND messages.sender_id <> conversation_participants.user_id
          AND messages.deleted_at IS NULL
          AND (
            conversation_participants.last_read_message_id IS NULL
            OR messages.id > conversation_participants.last_read_message_id
          )
        LEFT JOIN message_hidden_entries
          ON message_hidden_entries.message_id = messages.id
          AND message_hidden_entries.user_id = conversation_participants.user_id
        WHERE conversation_participants.user_id = ?
          AND conversation_participants.conversation_id IN (${placeholders})
          AND (messages.id IS NULL OR message_hidden_entries.id IS NULL)
        GROUP BY conversation_participants.conversation_id`,
        [currentUserId, ...conversationIds],
      )

      ;[unreadSenderRows] = await pool.execute(
        `SELECT
          messages.conversation_id,
          users.public_id,
          users.full_name,
          users.avatar_url,
          CASE
            WHEN users.presence = 'online'
              AND users.last_seen_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
              THEN 'online'
            WHEN users.presence IN ('away', 'busy') THEN users.presence
            ELSE 'offline'
          END AS presence,
          MAX(messages.created_at) AS latest_unread_at
        FROM conversation_participants
        INNER JOIN messages
          ON messages.conversation_id = conversation_participants.conversation_id
          AND messages.sender_id <> conversation_participants.user_id
          AND messages.deleted_at IS NULL
          AND (
            conversation_participants.last_read_message_id IS NULL
            OR messages.id > conversation_participants.last_read_message_id
          )
        LEFT JOIN message_hidden_entries
          ON message_hidden_entries.message_id = messages.id
          AND message_hidden_entries.user_id = conversation_participants.user_id
        INNER JOIN users ON users.id = messages.sender_id
        WHERE conversation_participants.user_id = ?
          AND conversation_participants.conversation_id IN (${placeholders})
          AND message_hidden_entries.id IS NULL
        GROUP BY
          messages.conversation_id,
          users.public_id,
          users.full_name,
          users.avatar_url,
          users.presence,
          users.last_seen_at
        ORDER BY latest_unread_at DESC`,
        [currentUserId, ...conversationIds],
      )
    }

    const attachmentsByConversation = attachmentRows.reduce((result, row) => {
      const key = row.conversation_id
      result[key] = result[key] || []
      result[key].push(mapAttachment(row))
      return result
    }, {})

    const unreadByConversation = unreadRows.reduce((result, row) => {
      result[row.conversation_id] = Number(row.unread_count || 0)
      return result
    }, {})

    const unreadSendersByConversation = unreadSenderRows.reduce((result, row) => {
      const key = row.conversation_id
      result[key] = result[key] || []
      result[key].push({
        id: row.public_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        presence: row.presence,
      })
      return result
    }, {})

    const conversations = conversationRows.map((row, index) => {
      const isDirect = row.type === 'direct'
      const name = isDirect ? row.direct_nickname || row.direct_name : row.title
      const avatar = isDirect ? row.direct_avatar_url : row.avatar_url
      const memberCount = Number(row.member_count || 0)
      const lastMessagePreview = getConversationLastMessagePreview(row)

      return {
        id: String(row.id),
        publicId: row.public_id,
        type: row.type,
        name: name || 'Hội thoại',
        role: isDirect ? row.direct_role || 'Thành viên' : row.type === 'support' ? 'Nhóm hỗ trợ' : `${memberCount} thành viên`,
        status: isDirect
          ? row.direct_status || getPresenceLabel(row.direct_presence, row.direct_last_seen_at)
          : row.type === 'support'
            ? 'Đang xử lý hỗ trợ'
            : `${memberCount} thành viên`,
        avatar: avatar || null,
        accent: accentColors[index % accentColors.length],
        lastMessage: lastMessagePreview.text,
        lastMessageByMe: row.last_message_sender_id === currentUserId,
        lastMessageIsAttachment: lastMessagePreview.isAttachment,
        lastTime: formatRelativeTime(row.visible_last_message_at),
        lastMessageAt: row.visible_last_message_at || null,
        unread: unreadByConversation[row.id] || 0,
        pinned: Boolean(row.is_pinned),
        muted: Boolean(row.is_muted),
        archived: Boolean(row.is_archived),
        contactId: row.direct_contact_id ? String(row.direct_contact_id) : null,
        nickname: isDirect ? row.direct_nickname || null : null,
        onlineSince: isDirect ? row.direct_online_since || null : null,
        friendshipStatus: row.direct_friendship_status || null,
        blocked: row.direct_friendship_status === 'blocked',
        presence: isDirect ? row.direct_presence || 'offline' : 'online',
        unreadSenders: unreadSendersByConversation[row.id] || [],
        memberCount,
        messages: [],
        attachments: attachmentsByConversation[row.id] || [],
      }
    })

    response.json({
      conversations,
    })
  } catch (error) {
    next(error)
  }
}

async function createGroupConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const title = typeof request.body.title === 'string' ? request.body.title.trim() : ''
    let memberIds = []

    try {
      memberIds = JSON.parse(request.body.memberIds || '[]')
    } catch {
      memberIds = []
    }

    if (!title) {
      return response.status(422).json({
        message: 'Tên nhóm là bắt buộc!',
      })
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return response.status(422).json({
        message: 'Cần chọn ít nhất một thành viên!',
      })
    }

    const uniquePublicIds = [...new Set(memberIds.filter((id) => typeof id === 'string'))]

    if (uniquePublicIds.length === 0) {
      return response.status(422).json({
        message: 'Danh sách thành viên không hợp lệ!',
      })
    }

    const placeholders = uniquePublicIds.map(() => '?').join(',')
    const [memberRows] = await connection.execute(
      `SELECT id, full_name
      FROM users
      WHERE public_id IN (${placeholders})
        AND id <> ?
        AND deleted_at IS NULL
        AND is_active = 1`,
      [...uniquePublicIds, currentUserId],
    )

    if (memberRows.length === 0) {
      return response.status(422).json({
        message: 'Không tìm thấy thành viên phù hợp!',
      })
    }

    const avatarUrl = request.file
      ? request.file.cloudinary?.secureUrl || request.file.cloudinary?.url
      : null

    await connection.beginTransaction()

    const [conversationResult] = await connection.execute(
      `INSERT INTO conversations (
        public_id,
        type,
        title,
        avatar_url,
        created_by,
        last_message_at
      ) VALUES (?, 'group', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), title, avatarUrl, currentUserId],
    )
    const conversationId = conversationResult.insertId

    await connection.execute(
      `INSERT INTO conversation_participants (
        conversation_id,
        user_id,
        role,
        last_read_at
      ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
      [conversationId, currentUserId],
    )

    for (const member of memberRows) {
      await connection.execute(
        `INSERT INTO conversation_participants (
          conversation_id,
          user_id,
          role,
          last_read_at
        ) VALUES (?, ?, 'member', CURRENT_TIMESTAMP)`,
        [conversationId, member.id],
      )
    }

    await createSystemMessage(connection, conversationId, currentUserId, `Đã tạo nhóm ${title}!`)

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:created')

    response.status(201).json({
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function getConversationMembers(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    if (!members) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    response.json({
      members,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function getGroupInvite(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureGroupInviteTables()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (!canManageGroup(participant.role)) {
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể tạo liên kết mời!',
      })
    }

    const [existingRows] = await connection.execute(
      `SELECT token
      FROM group_invite_tokens
      WHERE conversation_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
      [conversationId],
    )
    const existingToken = existingRows[0]?.token

    if (existingToken) {
      return response.json({
        token: existingToken,
      })
    }

    const token = randomUUID()

    await connection.execute(
      `INSERT INTO group_invite_tokens (
        conversation_id,
        token,
        created_by
      ) VALUES (?, ?, ?)`,
      [conversationId, token, currentUserId],
    )

    response.status(201).json({
      token,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function resetGroupInvite(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureGroupInviteTables()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (!canManageGroup(participant.role)) {
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể đổi liên kết mời!',
      })
    }

    await connection.beginTransaction()
    await connection.execute(
      `UPDATE group_invite_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND revoked_at IS NULL`,
      [conversationId],
    )

    const token = randomUUID()

    await connection.execute(
      `INSERT INTO group_invite_tokens (
        conversation_id,
        token,
        created_by
      ) VALUES (?, ?, ?)`,
      [conversationId, token, currentUserId],
    )

    await connection.commit()

    response.status(201).json({
      token,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function requestGroupJoin(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureGroupInviteTables()
    const currentUserId = request.user.id
    const token = typeof request.params.token === 'string' ? request.params.token.trim() : ''

    if (!token) {
      return response.status(400).json({
        message: 'Link mời không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const [inviteRows] = await connection.execute(
      `SELECT
        group_invite_tokens.id,
        group_invite_tokens.conversation_id,
        conversations.title
      FROM group_invite_tokens
      INNER JOIN conversations ON conversations.id = group_invite_tokens.conversation_id
      WHERE group_invite_tokens.token = ?
        AND group_invite_tokens.revoked_at IS NULL
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [token],
    )
    const invite = inviteRows[0]

    if (!invite) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Link mời đã hết hạn hoặc không tồn tại!',
      })
    }

    const [memberRows] = await connection.execute(
      `SELECT role
      FROM conversation_participants
      WHERE conversation_id = ?
        AND user_id = ?
        AND left_at IS NULL
      LIMIT 1`,
      [invite.conversation_id, currentUserId],
    )

    if (memberRows[0]) {
      const conversation = await loadConversationSummary(connection, invite.conversation_id, currentUserId)
      await connection.commit()
      return response.json({
        status: 'joined',
        conversation,
      })
    }

    await connection.execute(
      `INSERT INTO group_join_requests (
        public_id,
        conversation_id,
        user_id,
        invite_token_id,
        status
      ) VALUES (?, ?, ?, ?, 'pending')
      ON DUPLICATE KEY UPDATE
        invite_token_id = VALUES(invite_token_id),
        status = 'pending',
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), invite.conversation_id, currentUserId, invite.id],
    )

    await connection.commit()
    await emitConversationChanged(connection, invite.conversation_id, currentUserId, 'group:join:requested')

    response.status(202).json({
      status: 'pending',
      message: `Đã gửi yêu cầu tham gia ${invite.title || 'nhóm'}!`,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function listGroupJoinRequests(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureGroupInviteTables()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (!canManageGroup(participant.role)) {
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể xem yêu cầu tham gia!',
      })
    }

    const [rows] = await connection.execute(
      `SELECT
        group_join_requests.public_id,
        group_join_requests.created_at,
        users.public_id AS user_public_id,
        users.id AS user_id,
        users.full_name,
        users.email,
        users.avatar_url
      FROM group_join_requests
      INNER JOIN users ON users.id = group_join_requests.user_id
      WHERE group_join_requests.conversation_id = ?
        AND group_join_requests.status = 'pending'
        AND users.deleted_at IS NULL
      ORDER BY group_join_requests.created_at ASC`,
      [conversationId],
    )

    response.json({
      requests: rows.map((row) => ({
        id: row.public_id,
        user: {
          id: row.user_public_id,
          userId: Number(row.user_id),
          fullName: row.full_name,
          email: row.email,
          avatarUrl: row.avatar_url,
        },
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function reviewGroupJoinRequest(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureGroupInviteTables()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const requestPublicId = request.params.requestId
    const action = request.body.action === 'approve' ? 'approve' : 'decline'

    if (!Number.isInteger(conversationId) || !requestPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu duyệt thành viên không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (!canManageGroup(participant.role)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ owner hoặc admin mới có thể duyệt thành viên!',
      })
    }

    const [joinRequestRows] = await connection.execute(
      `SELECT
        group_join_requests.id,
        group_join_requests.user_id,
        users.full_name
      FROM group_join_requests
      INNER JOIN users ON users.id = group_join_requests.user_id
      WHERE group_join_requests.public_id = ?
        AND group_join_requests.conversation_id = ?
        AND group_join_requests.status = 'pending'
      LIMIT 1`,
      [requestPublicId, conversationId],
    )
    const joinRequest = joinRequestRows[0]

    if (!joinRequest) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy yêu cầu đang chờ!',
      })
    }

    await connection.execute(
      `UPDATE group_join_requests
      SET status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [action === 'approve' ? 'approved' : 'declined', currentUserId, joinRequest.id],
    )

    if (action === 'approve') {
      await connection.execute(
        `INSERT INTO conversation_participants (
          conversation_id,
          user_id,
          role,
          joined_at,
          left_at,
          last_read_at
        ) VALUES (?, ?, 'member', CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          role = IF(role = 'owner', role, 'member'),
          left_at = NULL,
          joined_at = CURRENT_TIMESTAMP`,
        [conversationId, joinRequest.user_id],
      )

      await createSystemMessage(connection, conversationId, currentUserId, `${joinRequest.full_name} da tham gia nhom`)
    }

    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:join:reviewed')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function updateGroupMemberRole(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const targetPublicId = request.params.userId
    const nextRole = request.body.role === 'admin' ? 'admin' : 'member'

    if (!Number.isInteger(conversationId) || !targetPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu cập nhật quyền không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const actor = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!actor) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (actor.role !== 'owner') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ Owner mới có thể cập nhật quyền Admin!',
      })
    }

    const [targetRows] = await connection.execute(
      `SELECT users.id, users.full_name, conversation_participants.role
      FROM users
      INNER JOIN conversation_participants
        ON conversation_participants.user_id = users.id
        AND conversation_participants.conversation_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE users.public_id = ?
      LIMIT 1`,
      [conversationId, targetPublicId],
    )
    const target = targetRows[0]

    if (!target) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy thành viên trong nhóm!',
      })
    }

    if (!canManageMemberRole(actor.role, target.role)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Không thể thay đổi quyền của Owner!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET role = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
      [nextRole, conversationId, target.id],
    )

    await createSystemMessage(
      connection,
      conversationId,
      currentUserId,
      `${target.full_name} đã được ${nextRole === 'admin' ? 'nâng lên Admin' : 'hạ xuống thành viên'}`,
    )

    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:member:role')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function transferGroupOwner(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const targetPublicId = request.params.userId

    if (!Number.isInteger(conversationId) || !targetPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu chuyển quyền Owner không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const actor = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!actor) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (actor.role !== 'owner') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ Owner hiện tại mới có thể chuyển Owner!',
      })
    }

    const [targetRows] = await connection.execute(
      `SELECT users.id, users.full_name
      FROM users
      INNER JOIN conversation_participants
        ON conversation_participants.user_id = users.id
        AND conversation_participants.conversation_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE users.public_id = ?
        AND users.id <> ?
      LIMIT 1`,
      [conversationId, targetPublicId, currentUserId],
    )
    const target = targetRows[0]

    if (!target) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy thành viên nhận Owner!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET role = CASE
          WHEN user_id = ? THEN 'owner'
          WHEN user_id = ? THEN 'admin'
          ELSE role
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ?
        AND user_id IN (?, ?)
        AND left_at IS NULL`,
      [target.id, currentUserId, conversationId, target.id, currentUserId],
    )

    await createSystemMessage(connection, conversationId, currentUserId, `${target.full_name} đã trở thành owner nhóm`)
    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:owner:transferred')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function updateGroupConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const title = typeof request.body.title === 'string' ? request.body.title.trim() : ''

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    if (!title && !request.file) {
      return response.status(422).json({
        message: 'Cần tên nhóm hoặc avatar mới!',
      })
    }

    await connection.beginTransaction()

    const [conversationRows] = await connection.execute(
      `SELECT conversations.id
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )

    if (!conversationRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!canManageGroup(participant?.role)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể cập nhật nhóm!',
      })
    }

    const updates = []
    const params = []

    if (title) {
      updates.push('title = ?')
      params.push(title)
    }

    if (request.file) {
      updates.push('avatar_url = ?')
      params.push(request.file.cloudinary?.secureUrl || request.file.cloudinary?.url)
    }

    await connection.execute(
      `UPDATE conversations
      SET ${updates.join(', ')}
      WHERE id = ?`,
      [...params, conversationId],
    )

    if (title) {
      await createSystemMessage(connection, conversationId, currentUserId, `Đã đổi tên nhóm thành ${title}`)
    }

    if (request.file) {
      await createSystemMessage(connection, conversationId, currentUserId, 'Đã cập nhật avatar nhóm')
    }

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:updated')

    response.json({
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function addGroupMember(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const targetPublicId = typeof request.body.userId === 'string' ? request.body.userId : ''

    if (!Number.isInteger(conversationId) || !targetPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu thêm thành viên không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const [groupRows] = await connection.execute(
      `SELECT conversations.id
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )

    if (!groupRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!canManageGroup(participant?.role)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể thêm thành viên!',
      })
    }

    const [targetRows] = await connection.execute(
      `SELECT id, full_name
      FROM users
      WHERE public_id = ?
        AND id <> ?
        AND deleted_at IS NULL
        AND is_active = 1
      LIMIT 1`,
      [targetPublicId, currentUserId],
    )
    const targetUser = targetRows[0]

    if (!targetUser) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy thành viên!',
      })
    }

    await connection.execute(
      `INSERT INTO conversation_participants (
        conversation_id,
        user_id,
        role,
        joined_at,
        left_at,
        last_read_at
      ) VALUES (?, ?, 'member', CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        left_at = NULL,
        joined_at = CURRENT_TIMESTAMP`,
      [conversationId, targetUser.id],
    )

    await createSystemMessage(connection, conversationId, currentUserId, `${targetUser.full_name} đã tham gia nhóm`)
    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:members')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function removeGroupMember(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const targetPublicId = request.params.userId

    if (!Number.isInteger(conversationId) || !targetPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu xóa thành viên không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const [groupRows] = await connection.execute(
      `SELECT conversations.id
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )

    if (!groupRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    const participant = await findActiveGroupParticipant(connection, conversationId, currentUserId)

    if (!canManageGroup(participant?.role)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ Owner hoặc Admin mới có thể xoá thành viên!',
      })
    }

    const [targetRows] = await connection.execute(
      `SELECT users.id, users.full_name, conversation_participants.role
      FROM users
      INNER JOIN conversation_participants
        ON conversation_participants.user_id = users.id
        AND conversation_participants.conversation_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE users.public_id = ?
      LIMIT 1`,
      [conversationId, targetPublicId],
    )
    const targetUser = targetRows[0]

    if (!targetUser) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy thành viên trong nhóm!',
      })
    }

    if (targetUser.id === currentUserId || targetUser.role === 'owner') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Không thể xóa Owner hoặc chính bạn khỏi nhóm!',
      })
    }

    if (participant.role === 'admin' && targetUser.role !== 'member') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Admin chỉ có thể xóa thành viên thường!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, targetUser.id],
    )

    await createSystemMessage(connection, conversationId, currentUserId, `${targetUser.full_name} đã rời nhóm!`)
    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:members')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function updateGroupMemberNickname(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const targetPublicId = request.params.userId
    const nickname = normalizeNickname(request.body.nickname)

    if (!Number.isInteger(conversationId) || !targetPublicId) {
      return response.status(400).json({
        message: 'Yêu cầu cập nhật biệt danh không hợp lệ!',
      })
    }

    if (nickname === false) {
      return response.status(400).json({
        message: 'Biệt danh không được vượt quá 80 ký tự!',
      })
    }

    await connection.beginTransaction()

    const [groupRows] = await connection.execute(
      `SELECT conversations.id
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )

    if (!groupRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    const [targetRows] = await connection.execute(
      `SELECT users.id, users.full_name
      FROM users
      INNER JOIN conversation_participants
        ON conversation_participants.user_id = users.id
        AND conversation_participants.conversation_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE users.public_id = ?
      LIMIT 1`,
      [conversationId, targetPublicId],
    )
    const targetUser = targetRows[0]

    if (!targetUser) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy thành viên trong nhóm!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET custom_title = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
      [nickname, conversationId, targetUser.id],
    )

    const members = await loadConversationMembers(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:member:nickname')

    response.json({
      members,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function leaveGroupConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const [memberRows] = await connection.execute(
      `SELECT users.full_name
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      INNER JOIN users ON users.id = conversation_participants.user_id
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )
    const currentMember = memberRows[0]

    if (!currentMember) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, currentUserId],
    )

    await createSystemMessage(connection, conversationId, currentUserId, `${currentMember.full_name} đã rời nhóm!`)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'group:members')

    response.status(204).send()
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function disbandGroupConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const [groupRows] = await connection.execute(
      `SELECT conversations.id, conversations.title, conversation_participants.role
      FROM conversations
      INNER JOIN conversation_participants
        ON conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = ?
        AND conversation_participants.left_at IS NULL
      WHERE conversations.id = ?
        AND conversations.type = 'group'
        AND conversations.deleted_at IS NULL
      LIMIT 1`,
      [currentUserId, conversationId],
    )
    const group = groupRows[0]

    if (!group) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy nhóm!',
      })
    }

    if (group.role !== 'owner') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Chỉ owner nhóm mới có quyền giải tán!',
      })
    }

    const [participantRows] = await connection.execute(
      `SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = ? AND left_at IS NULL`,
      [conversationId],
    )
    const participantUserIds = participantRows.map((row) => Number(row.user_id))

    await createSystemMessage(
      connection,
      conversationId,
      currentUserId,
      `${group.title || 'Nhóm'} đã bị giải tán bởi ${request.user.fullName}!`,
    )

    await connection.execute(
      `UPDATE conversations
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [conversationId],
    )

    await connection.execute(
      `UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND left_at IS NULL`,
      [conversationId],
    )

    await connection.commit()
    emitToUsers(participantUserIds, 'conversation:changed', {
      conversationId: String(conversationId),
      actorUserId: String(currentUserId),
      eventType: 'group:disbanded',
      userIds: participantUserIds,
    })

    response.json({
      message: 'Nhóm đã được giải tán!',
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function getMessages(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const messagePage = await loadConversationMessages(connection, conversationId, currentUserId, {
      aroundMessageId: request.query.around,
      beforeMessageId: request.query.before,
      limit: request.query.limit,
    })

    response.json({
      ...messagePage,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function searchConversationMessages(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureMessagePinsTable()
    await ensureMessageHiddenEntriesTable()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const rawQuery = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const senderId = Number(request.query.senderId)
    const hasSenderId = Number.isInteger(senderId) && senderId > 0
    const type = typeof request.query.type === 'string' ? request.query.type : 'all'
    const dateFrom = typeof request.query.dateFrom === 'string' ? request.query.dateFrom : ''
    const dateTo = typeof request.query.dateTo === 'string' ? request.query.dateTo : ''
    const requestedLimit = Number(request.query.limit)
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 30

    const filters = [
      'messages.conversation_id = ?',
      'messages.deleted_at IS NULL',
      'message_hidden_entries.id IS NULL',
    ]
    const params = [currentUserId, conversationId]

    if (rawQuery) {
      filters.push(`(
        messages.body LIKE ?
        OR message_attachments.original_name LIKE ?
      )`)
      params.push(`%${rawQuery}%`, `%${rawQuery}%`)
    }

    if (hasSenderId) {
      filters.push('messages.sender_id = ?')
      params.push(senderId)
    }

    if (type === 'text') {
      filters.push("messages.type = 'text'")
    } else if (type === 'image') {
      filters.push("messages.type = 'image'")
    } else if (type === 'audio') {
      filters.push("messages.type = 'audio'")
    } else if (type === 'attachment') {
      filters.push("messages.type IN ('image', 'audio', 'file', 'video')")
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      filters.push('messages.created_at >= ?')
      params.push(`${dateFrom} 00:00:00`)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      filters.push('messages.created_at <= ?')
      params.push(`${dateTo} 23:59:59`)
    }

    const [messageRows] = await connection.execute(
      `SELECT
        messages.id,
        messages.parent_message_id,
        messages.sender_id,
        messages.type,
        messages.body,
        messages.status,
        messages.edited_at,
        messages.created_at,
        messages.updated_at,
        MIN(message_pins.created_at) AS pinned_at,
        users.full_name AS sender_name,
        users.avatar_url AS sender_avatar_url,
        parent_messages.sender_id AS parent_sender_id,
        parent_messages.type AS parent_type,
        parent_messages.body AS parent_body,
        parent_messages.deleted_at AS parent_deleted_at,
        parent_users.full_name AS parent_sender_name,
        MAX(message_receipts.delivered_at) AS latest_delivered_at,
        MAX(message_receipts.read_at) AS latest_read_at
      FROM messages
      INNER JOIN users ON users.id = messages.sender_id
      LEFT JOIN messages AS parent_messages
        ON parent_messages.id = messages.parent_message_id
        AND parent_messages.conversation_id = messages.conversation_id
      LEFT JOIN users AS parent_users ON parent_users.id = parent_messages.sender_id
      LEFT JOIN message_attachments ON message_attachments.message_id = messages.id
      LEFT JOIN message_receipts
        ON message_receipts.message_id = messages.id
        AND message_receipts.user_id <> messages.sender_id
      LEFT JOIN message_pins
        ON message_pins.message_id = messages.id
        AND (message_pins.conversation_id = messages.conversation_id OR message_pins.conversation_id IS NULL)
      LEFT JOIN message_hidden_entries
        ON message_hidden_entries.message_id = messages.id
        AND message_hidden_entries.user_id = ?
      WHERE ${filters.join('\n        AND ')}
      GROUP BY
        messages.id,
        messages.parent_message_id,
        messages.sender_id,
        messages.type,
        messages.body,
        messages.status,
        messages.edited_at,
        messages.created_at,
        messages.updated_at,
        users.full_name,
        users.avatar_url,
        parent_messages.sender_id,
        parent_messages.type,
        parent_messages.body,
        parent_messages.deleted_at,
        parent_users.full_name
      ORDER BY messages.created_at DESC, messages.id DESC
      LIMIT ${limit}`,
      params,
    )

    const messageIds = messageRows.map((row) => row.id)
    let attachmentRows = []

    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',')
      ;[attachmentRows] = await connection.execute(
        `SELECT
          message_id,
          original_name,
          mime_type,
          file_size_bytes,
          storage_url
        FROM message_attachments
        WHERE message_id IN (${placeholders})
        ORDER BY created_at ASC`,
        messageIds,
      )
    }

    const attachmentsByMessage = attachmentRows.reduce((result, row) => {
      result[row.message_id] = result[row.message_id] || []
      result[row.message_id].push(mapAttachment(row))
      return result
    }, {})

    response.json({
      messages: messageRows.map((row) => mapMessage(row, currentUserId, attachmentsByMessage)),
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function listConversationCalls(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [rows] = await connection.execute(
      `SELECT
        call_logs.public_id,
        call_logs.started_by,
        call_logs.type,
        call_logs.status,
        call_logs.started_at,
        call_logs.ended_at,
        call_logs.duration_seconds,
        callers.public_id AS caller_public_id,
        callers.full_name AS caller_name,
        callers.avatar_url AS caller_avatar_url,
        current_participant.status AS participant_status
      FROM call_logs
      INNER JOIN users AS callers ON callers.id = call_logs.started_by
      LEFT JOIN call_participants AS current_participant
        ON current_participant.call_log_id = call_logs.id
        AND current_participant.user_id = ?
      WHERE call_logs.conversation_id = ?
      ORDER BY call_logs.started_at DESC, call_logs.id DESC
      LIMIT 30`,
      [currentUserId, conversationId],
    )

    const calls = rows.map((row) => {
      const durationSeconds = Number(row.duration_seconds || 0)
      const direction = row.started_by === currentUserId ? 'outgoing' : 'incoming'
      const isMissed =
        row.participant_status === 'missed' ||
        (row.status === 'missed' && direction === 'incoming')

      return {
        id: String(row.public_id),
        type: row.type,
        status: row.status,
        direction,
        startedAt: row.started_at,
        endedAt: row.ended_at || null,
        durationSeconds,
        time: formatCallDateTime(row.started_at),
        durationLabel: formatCallDuration(durationSeconds),
        statusLabel: getCallStatusLabel(row.status, row.participant_status),
        isMissed,
        caller: {
          id: String(row.caller_public_id),
          userId: Number(row.started_by),
          fullName: row.caller_name,
          avatarUrl: row.caller_avatar_url || null,
        },
      }
    })

    response.json({
      calls,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function getTypingStatus(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const now = Date.now()
    pruneTypingIndicators(now)

    const typingUsers = Array.from(typingIndicators.values()).filter(
      (indicator) =>
        indicator.conversationId === conversationId &&
        indicator.userId !== currentUserId &&
        indicator.expiresAt > now,
    )

    response.json({
      isTyping: typingUsers.length > 0,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function updateTypingStatus(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const isTyping = Boolean(request.body.isTyping)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const key = getTypingKey(conversationId, currentUserId)

    if (isTyping) {
      typingIndicators.set(key, {
        conversationId,
        userId: currentUserId,
        expiresAt: Date.now() + TYPING_TTL_MS,
      })
    } else {
      typingIndicators.delete(key)
    }

    response.json({
      isTyping,
    })
  } catch (error) {
    next(error)
  } finally {
    connection.release()
  }
}

async function createMessage(request, response, next) {
  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const text = typeof request.body.text === 'string' ? request.body.text.trim() : ''
    const parentMessageId =
      request.body.parentMessageId === null || request.body.parentMessageId === undefined
        ? null
        : Number(request.body.parentMessageId)

    if (!text) {
      return response.status(422).json({
        message: 'Nội dung tin nhắn là bắt buộc!',
      })
    }

    if (parentMessageId !== null && !Number.isInteger(parentMessageId)) {
      return response.status(400).json({
        message: 'Tin nhắn được trả lời không hợp lệ.',
      })
    }

    const [participantRows] = await pool.execute(
      `SELECT id FROM conversation_participants
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
      LIMIT 1`,
      [conversationId, currentUserId],
    )

    if (!participantRows[0]) {
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      if (await hasBlockedDirectContact(connection, conversationId, currentUserId)) {
        await connection.rollback()
        return response.status(403).json({
          message: 'Hội thoại đã bị chặn!',
        })
      }

      if (parentMessageId !== null) {
        const [parentRows] = await connection.execute(
          `SELECT id
          FROM messages
          WHERE id = ?
            AND conversation_id = ?
            AND deleted_at IS NULL
          LIMIT 1`,
          [parentMessageId, conversationId],
        )

        if (!parentRows[0]) {
          await connection.rollback()
          return response.status(404).json({
            message: 'Không tìm thấy tin nhắn được trả lời.',
          })
        }
      }

      const [result] = await connection.execute(
        `INSERT INTO messages (
          public_id,
          conversation_id,
          sender_id,
          parent_message_id,
          type,
          body,
          status
        ) VALUES (?, ?, ?, ?, 'text', ?, 'sent')`,
        [randomUUID(), conversationId, currentUserId, parentMessageId, text],
      )

      const [conversationRows] = await connection.execute(
        `SELECT type, title
        FROM conversations
        WHERE id = ?
        LIMIT 1`,
        [conversationId],
      )
      const conversation = conversationRows[0]
      let mentionedMembers = []

      if (conversation?.type === 'group' || conversation?.type === 'support') {
        const members = await loadConversationMembers(connection, conversationId, currentUserId)
        mentionedMembers = resolveMentionedMembers(text, members || [], currentUserId)

        for (const member of mentionedMembers) {
          await connection.execute(
            `INSERT INTO notifications (
              user_id,
              actor_id,
              conversation_id,
              message_id,
              type,
              title,
              body
            ) VALUES (?, ?, ?, ?, 'mention', ?, ?)`,
            [
              member.userId,
              currentUserId,
              conversationId,
              result.insertId,
              `${request.user.full_name} đã nhắc đến bạn!`,
              text.slice(0, 500),
            ],
          )
        }
      }

      await connection.execute(
        `UPDATE conversations
        SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [result.insertId, conversationId],
      )

      await connection.execute(
        `UPDATE conversation_participants
        SET last_read_message_id = ?, last_read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND user_id = ?`,
        [result.insertId, conversationId, currentUserId],
      )

      await connection.execute(
      `INSERT INTO message_receipts (message_id, user_id, delivered_at, read_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          delivered_at = COALESCE(delivered_at, VALUES(delivered_at)),
          read_at = COALESCE(read_at, VALUES(read_at))`,
        [result.insertId, currentUserId],
      )

      const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
        messageId: result.insertId,
      })
      const createdMessage = messages.find((message) => message.id === String(result.insertId))
      const mentionedUserIds = mentionedMembers.map((member) => member.userId)
      const pushRecipientIds = (
        await loadConversationPushRecipientIds(
        connection,
        conversationId,
        currentUserId,
        )
      ).filter((userId) => !mentionedUserIds.includes(userId))

      await connection.commit()
      await emitConversationChanged(connection, conversationId, currentUserId, 'message:created')
      pushWebNotificationToUsers(pushRecipientIds, {
        title: request.user.full_name,
        body: text || 'Đã gửi một tin nhắn mới!',
        tag: `conversation:${conversationId}`,
        url: `/chat/${conversationId}`,
      })
      emitToUsers(
        mentionedUserIds,
        'notifications:changed',
        {
          eventType: 'mention',
          conversationId: String(conversationId),
          messageId: String(result.insertId),
          actorUserId: String(currentUserId),
        },
      )
      pushWebNotificationToUsers(
        mentionedUserIds,
        {
          title: `${request.user.full_name} đã nhắc đến bạn!`,
          body: text.slice(0, 500),
          tag: `mention:${result.insertId}`,
          url: `/chat/${conversationId}`,
        },
      )

      response.status(201).json({
        message: createdMessage,
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    next(error)
  }
}

async function createAttachmentMessage(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!request.file) {
      return response.status(422).json({
        message: 'Vui lòng chọn file cần gửi!',
      })
    }

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    if (await hasBlockedDirectContact(connection, conversationId, currentUserId)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Hội thoại đã bị chặn!',
      })
    }

    const normalizedFilename = request.file.cloudinary?.publicId || request.file.originalname
    const storageUrl = request.file.cloudinary?.secureUrl || request.file.cloudinary?.url
    const messageType = request.file.mimetype.startsWith('audio/') ? 'audio' : 'image'
    const body = request.file.originalname

    const [result] = await connection.execute(
      `INSERT INTO messages (
        public_id,
        conversation_id,
        sender_id,
        type,
        body,
        status
      ) VALUES (?, ?, ?, ?, ?, 'sent')`,
      [randomUUID(), conversationId, currentUserId, messageType, body],
    )

    await connection.execute(
      `INSERT INTO message_attachments (
        message_id,
        uploader_id,
        file_name,
        original_name,
        mime_type,
        file_size_bytes,
        storage_url,
        thumbnail_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        currentUserId,
        normalizedFilename,
        request.file.originalname,
        request.file.mimetype,
        request.file.size,
        storageUrl,
        messageType === 'image' ? storageUrl : null,
      ],
    )

    await connection.execute(
      `UPDATE conversations
      SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [result.insertId, conversationId],
    )

    await connection.execute(
      `UPDATE conversation_participants
      SET last_read_message_id = ?, last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?`,
      [result.insertId, conversationId, currentUserId],
    )

    await connection.execute(
      `INSERT INTO message_receipts (message_id, user_id, delivered_at, read_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        delivered_at = COALESCE(delivered_at, VALUES(delivered_at)),
        read_at = COALESCE(read_at, VALUES(read_at))`,
      [result.insertId, currentUserId],
    )

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
      messageId: result.insertId,
    })
    const createdMessage = messages.find((message) => message.id === String(result.insertId))
    const pushRecipientIds = await loadConversationPushRecipientIds(
      connection,
      conversationId,
      currentUserId,
    )

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:created')
    pushWebNotificationToUsers(pushRecipientIds, {
      title: request.user.full_name,
      body:
        messageType === 'image'
          ? 'Đã gửi một ảnh!'
          : messageType === 'audio'
            ? 'Đã gửi một tin nhắn thoại!'
            : 'Đã gửi một tệp!',
      tag: `conversation:${conversationId}`,
      url: `/chat/${conversationId}`,
    })

    response.status(201).json({
      message: createdMessage,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function updateMessage(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)
    const text = typeof request.body.text === 'string' ? request.body.text.trim() : ''

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId)) {
      return response.status(400).json({
        message: 'Đường dẫn tin nhắn không hợp lệ!',
      })
    }

    if (!text) {
      return response.status(422).json({
        message: 'Nội dung tin nhắn là bắt buộc!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id, sender_id, status
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [messageId, conversationId],
    )

    const message = messageRows[0]

    if (!message) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn!',
      })
    }

    if (message.sender_id !== currentUserId) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Bạn chỉ có thể sửa tin nhắn của mình!',
      })
    }

    await connection.execute(
      `UPDATE messages
      SET body = ?, edited_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [text, messageId],
    )

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
      messageId,
    })
    const updatedMessage = messages.find((item) => item.id === String(messageId))

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:updated')

    response.json({
      message: updatedMessage,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function deleteMessage(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureMessageHiddenEntriesTable()
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId)) {
      return response.status(400).json({
        message: 'Đường dẫn tin nhắn không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id, sender_id
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [messageId, conversationId],
    )

    const message = messageRows[0]

    if (!message) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn!',
      })
    }

    await connection.execute(
      `INSERT INTO message_hidden_entries (message_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = created_at`,
      [messageId, currentUserId],
    )

    
    await connection.commit()
    emitToUsers([currentUserId], 'conversation:changed', {
      conversationId: String(conversationId),
      actorUserId: String(currentUserId),
      eventType: 'message:hidden',
    })

    response.status(204).send()
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function recallMessage(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId)) {
      return response.status(400).json({
        message: 'Đường dẫn tin nhắn không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id, sender_id, type
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [messageId, conversationId],
    )

    const message = messageRows[0]

    if (!message) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn!',
      })
    }

    if (message.sender_id !== currentUserId || message.type === 'system') {
      await connection.rollback()
      return response.status(403).json({
        message: 'Bạn chỉ có thể thu hồi tin nhắn do mình đã gửi!',
      })
    }

    await connection.execute(
      `UPDATE messages
      SET deleted_at = CURRENT_TIMESTAMP,
        status = 'deleted'
      WHERE id = ?`,
      [messageId],
    )

    await updateConversationLastMessage(connection, conversationId)

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:recalled')

    response.json({
      conversation,
      messageId: String(messageId),
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function toggleMessagePin(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureMessagePinsTable()

    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId)) {
      return response.status(400).json({
        message: 'Đường dẫn tin nhắn không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [messageId, conversationId],
    )

    if (!messageRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn!',
      })
    }

    const [existingRows] = await connection.execute(
      `SELECT id FROM message_pins
      WHERE message_id = ?
        AND (conversation_id = ? OR conversation_id IS NULL)
      LIMIT 1`,
      [messageId, conversationId],
    )

    if (existingRows[0]) {
      await connection.execute(
        `DELETE FROM message_pins
        WHERE message_id = ?
          AND (conversation_id = ? OR conversation_id IS NULL)`,
        [messageId, conversationId],
      )
    } else {
      await connection.execute(
        `INSERT INTO message_pins (message_id, user_id, conversation_id)
        VALUES (?, ?, ?)`,
        [messageId, currentUserId, conversationId],
      )
    }

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
      messageId,
    })
    const message = messages.find((item) => item.id === String(messageId))

    await connection.commit()
    emitToConversation(conversationId, 'conversation:changed', {
      conversationId: String(conversationId),
      actorUserId: String(currentUserId),
      eventType: 'message:pinned',
    })

    response.json({
      message,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function forwardMessage(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)
    const targetConversationId = Number(request.body.targetConversationId)

    if (
      !Number.isInteger(conversationId) ||
      !Number.isInteger(messageId) ||
      !Number.isInteger(targetConversationId)
    ) {
      return response.status(400).json({
        message: 'Yêu cầu chuyển tiếp tin nhắn không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const sourceParticipant = await findActiveParticipant(connection, conversationId, currentUserId)
    const targetParticipant = await findActiveParticipant(
      connection,
      targetConversationId,
      currentUserId,
    )

    if (!sourceParticipant || !targetParticipant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại phù hợp!',
      })
    }

    if (await hasBlockedDirectContact(connection, targetConversationId, currentUserId)) {
      await connection.rollback()
      return response.status(403).json({
        message: 'Hội thoại đích đã bị chặn!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id, type, body
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
        AND type <> 'system'
      LIMIT 1`,
      [messageId, conversationId],
    )

    const sourceMessage = messageRows[0]

    if (!sourceMessage) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn cần chuyển tiếp!',
      })
    }

    const [result] = await connection.execute(
      `INSERT INTO messages (
        public_id,
        conversation_id,
        sender_id,
        type,
        body,
        status
      ) VALUES (?, ?, ?, ?, ?, 'sent')`,
      [
        randomUUID(),
        targetConversationId,
        currentUserId,
        sourceMessage.type,
        sourceMessage.body,
      ],
    )

    await connection.execute(
      `INSERT INTO message_attachments (
        message_id,
        uploader_id,
        file_name,
        original_name,
        mime_type,
        file_size_bytes,
        storage_url,
        thumbnail_url
      )
      SELECT
        ?,
        ?,
        file_name,
        original_name,
        mime_type,
        file_size_bytes,
        storage_url,
        thumbnail_url
      FROM message_attachments
      WHERE message_id = ?`,
      [result.insertId, currentUserId, messageId],
    )

    await connection.execute(
      `UPDATE conversations
      SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [result.insertId, targetConversationId],
    )

    await connection.execute(
      `UPDATE conversation_participants
      SET last_read_message_id = ?, last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?`,
      [result.insertId, targetConversationId, currentUserId],
    )

    await connection.execute(
      `INSERT INTO message_receipts (message_id, user_id, delivered_at, read_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        delivered_at = COALESCE(delivered_at, VALUES(delivered_at)),
        read_at = COALESCE(read_at, VALUES(read_at))`,
      [result.insertId, currentUserId],
    )

    const { messages } = await loadConversationMessages(connection, targetConversationId, currentUserId, {
      messageId: result.insertId,
    })
    const message = messages.find((item) => item.id === String(result.insertId))
    const conversation = await loadConversationSummary(connection, targetConversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(
      connection,
      targetConversationId,
      currentUserId,
      'message:forwarded',
    )

    response.status(201).json({
      message,
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function toggleMessageReaction(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)
    const emoji = typeof request.body.emoji === 'string' ? request.body.emoji.trim() : ''

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId)) {
      return response.status(400).json({
        message: 'Đường dẫn tin nhắn không hợp lệ!',
      })
    }

    if (!emoji || emoji.length > 16) {
      return response.status(422).json({
        message: 'Emoji không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [messageRows] = await connection.execute(
      `SELECT id
      FROM messages
      WHERE id = ?
        AND conversation_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [messageId, conversationId],
    )

    if (!messageRows[0]) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy tin nhắn!',
      })
    }

    const [existingRows] = await connection.execute(
      `SELECT id
      FROM message_reactions
      WHERE message_id = ? AND user_id = ? AND emoji = ?
      LIMIT 1`,
      [messageId, currentUserId, emoji],
    )

    if (existingRows[0]) {
      await connection.execute(
        `DELETE FROM message_reactions
        WHERE message_id = ? AND user_id = ? AND emoji = ?`,
        [messageId, currentUserId, emoji],
      )
    } else {
      await connection.execute(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
        VALUES (?, ?, ?)`,
        [messageId, currentUserId, emoji],
      )
    }

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
      messageId,
    })
    const message = messages.find((item) => item.id === String(messageId))

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:reaction')

    response.json({
      message,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function removeMessageReaction(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const messageId = Number(request.params.messageId)
    const emoji = typeof request.params.emoji === 'string' ? decodeURIComponent(request.params.emoji) : ''

    if (!Number.isInteger(conversationId) || !Number.isInteger(messageId) || !emoji) {
      return response.status(400).json({
        message: 'Yêu cầu thu hồi Reaction không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    await connection.execute(
      `DELETE FROM message_reactions
      WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      [messageId, currentUserId, emoji],
    )

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId, {
      messageId,
    })
    const message = messages.find((item) => item.id === String(messageId))

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:reaction')

    response.json({
      message,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function markConversationRead(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const [lastMessageRows] = await connection.execute(
      `SELECT id FROM messages
      WHERE conversation_id = ?
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
      [conversationId],
    )
    const lastMessageId = lastMessageRows[0]?.id ?? null

    await connection.execute(
      `INSERT INTO message_receipts (message_id, user_id, delivered_at, read_at)
      SELECT messages.id, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM messages
      WHERE messages.conversation_id = ?
        AND messages.sender_id <> ?
        AND messages.deleted_at IS NULL
      ON DUPLICATE KEY UPDATE
        delivered_at = COALESCE(delivered_at, VALUES(delivered_at)),
        read_at = CURRENT_TIMESTAMP`,
      [currentUserId, conversationId, currentUserId],
    )

    await connection.execute(
      `UPDATE conversation_participants
      SET last_read_message_id = ?, last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?`,
      [lastMessageId, conversationId, currentUserId],
    )

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:read')

    response.json({
      messages,
      readMessageId: lastMessageId ? String(lastMessageId) : null,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function markConversationDelivered(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    await touchDeliveredReceipts(connection, conversationId, currentUserId)

    const { messages } = await loadConversationMessages(connection, conversationId, currentUserId)

    await connection.commit()
    await emitConversationChanged(connection, conversationId, currentUserId, 'message:delivered')

    response.json({
      messages,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function updateConversationSettings(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)
    const hasPinned = typeof request.body.pinned === 'boolean'
    const hasMuted = typeof request.body.muted === 'boolean'

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    if (!hasPinned && !hasMuted) {
      return response.status(422).json({
        message: 'Cần chọn thiết lập cần cập nhật!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    const updates = []
    const params = []

    if (hasPinned) {
      updates.push('is_pinned = ?')
      params.push(request.body.pinned ? 1 : 0)
    }

    if (hasMuted) {
      updates.push('is_muted = ?')
      params.push(request.body.muted ? 1 : 0)
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET ${updates.join(', ')}
      WHERE conversation_id = ? AND user_id = ?`,
      [...params, conversationId, currentUserId],
    )

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()

    response.json({
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function archiveConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    await connection.execute(
      `UPDATE conversations
      SET is_archived = 1
      WHERE id = ?`,
      [conversationId],
    )

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()

    response.json({
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function hideConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    await ensureConversationParticipantHiddenAtColumn()

    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    await connection.execute(
      `UPDATE conversation_participants
      SET hidden_at = CURRENT_TIMESTAMP,
        is_pinned = 0
      WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, currentUserId],
    )

    await connection.commit()

    emitToUsers([currentUserId], 'conversation:changed', {
      conversationId: String(conversationId),
      actorUserId: String(currentUserId),
      eventType: 'conversation:hidden',
    })

    response.status(204).end()
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function unarchiveConversation(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const currentUserId = request.user.id
    const conversationId = Number(request.params.conversationId)

    if (!Number.isInteger(conversationId)) {
      return response.status(400).json({
        message: 'Đường dẫn hội thoại không hợp lệ!',
      })
    }

    await connection.beginTransaction()

    const participant = await findActiveParticipant(connection, conversationId, currentUserId)

    if (!participant) {
      await connection.rollback()
      return response.status(404).json({
        message: 'Không tìm thấy hội thoại!',
      })
    }

    await connection.execute(
      `UPDATE conversations
      SET is_archived = 0
      WHERE id = ?`,
      [conversationId],
    )

    const conversation = await loadConversationSummary(connection, conversationId, currentUserId)

    await connection.commit()

    response.json({
      conversation,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  addGroupMember,
  archiveConversation,
  createAttachmentMessage,
  createGroupConversation,
  createMessage,
  deleteMessage,
  disbandGroupConversation,
  forwardMessage,
  getConversationMembers,
  getGroupInvite,
  getMessages,
  getTypingStatus,
  hideConversation,
  leaveGroupConversation,
  listConversationCalls,
  listGroupJoinRequests,
  listConversations,
  markConversationDelivered,
  markConversationRead,
  requestGroupJoin,
  resetGroupInvite,
  removeMessageReaction,
  recallMessage,
  removeGroupMember,
  reviewGroupJoinRequest,
  searchConversationMessages,
  toggleMessageReaction,
  toggleMessagePin,
  transferGroupOwner,
  unarchiveConversation,
  updateConversationSettings,
  updateGroupConversation,
  updateGroupMemberNickname,
  updateGroupMemberRole,
  updateTypingStatus,
  updateMessage,
}
