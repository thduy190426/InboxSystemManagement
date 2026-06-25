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

function normalizeKeyword(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

async function globalSearch(request, response, next) {
  try {
    const currentUserId = request.user.id
    const keyword = normalizeKeyword(request.query.q)

    if (keyword.length < 2) {
      return response.json({
        conversations: [],
        messages: [],
        users: [],
      })
    }

    const likeKeyword = `%${keyword}%`
    const fullTextKeyword = keyword
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `+${part.replace(/[+\-<>()~*"@]+/g, '')}*`)
      .filter((part) => part.length > 2)
      .join(' ')

    const [conversationRows] = await pool.execute(
      `SELECT
        conversations.id,
        conversations.type,
        conversations.title,
        conversations.avatar_url,
        conversations.last_message_at,
        other_users.full_name AS direct_name,
        other_users.avatar_url AS direct_avatar_url,
        direct_contacts.nickname AS direct_nickname,
        last_messages.body AS last_message_body
      FROM conversations
      INNER JOIN conversation_participants AS participant
        ON participant.conversation_id = conversations.id
        AND participant.user_id = ?
        AND participant.left_at IS NULL
      LEFT JOIN messages AS last_messages ON last_messages.id = conversations.last_message_id
      LEFT JOIN (
        SELECT conversation_id, MIN(user_id) AS user_id
        FROM conversation_participants
        WHERE user_id <> ?
          AND left_at IS NULL
        GROUP BY conversation_id
      ) AS other_participants ON other_participants.conversation_id = conversations.id
      LEFT JOIN users AS other_users ON other_users.id = other_participants.user_id
      LEFT JOIN contacts AS direct_contacts
        ON direct_contacts.owner_user_id = ?
        AND direct_contacts.contact_user_id = other_users.id
      WHERE conversations.deleted_at IS NULL
        AND conversations.is_archived = 0
        AND (
          conversations.title LIKE ?
          OR other_users.full_name LIKE ?
          OR direct_contacts.nickname LIKE ?
          OR last_messages.body LIKE ?
        )
      ORDER BY participant.is_pinned DESC, conversations.last_message_at DESC
      LIMIT 8`,
      [currentUserId, currentUserId, currentUserId, likeKeyword, likeKeyword, likeKeyword, likeKeyword],
    )

    const [messageRows] = fullTextKeyword
      ? await pool.execute(
          `SELECT
            messages.id,
            messages.conversation_id,
            messages.body,
            messages.type,
            messages.created_at,
            users.full_name AS sender_name,
            conversations.type AS conversation_type,
            conversations.title AS conversation_title,
            other_users.full_name AS direct_name,
            direct_contacts.nickname AS direct_nickname,
            MATCH(messages.body) AGAINST (? IN BOOLEAN MODE) AS score
          FROM messages
          INNER JOIN conversation_participants AS participant
            ON participant.conversation_id = messages.conversation_id
            AND participant.user_id = ?
            AND participant.left_at IS NULL
          INNER JOIN conversations ON conversations.id = messages.conversation_id
          INNER JOIN users ON users.id = messages.sender_id
          LEFT JOIN (
            SELECT conversation_id, MIN(user_id) AS user_id
            FROM conversation_participants
            WHERE user_id <> ?
              AND left_at IS NULL
            GROUP BY conversation_id
          ) AS other_participants ON other_participants.conversation_id = conversations.id
          LEFT JOIN users AS other_users ON other_users.id = other_participants.user_id
          LEFT JOIN contacts AS direct_contacts
            ON direct_contacts.owner_user_id = ?
            AND direct_contacts.contact_user_id = other_users.id
          WHERE conversations.deleted_at IS NULL
            AND conversations.is_archived = 0
            AND messages.deleted_at IS NULL
            AND messages.type <> 'system'
            AND messages.body IS NOT NULL
            AND (
              MATCH(messages.body) AGAINST (? IN BOOLEAN MODE)
              OR messages.body LIKE ?
            )
          ORDER BY score DESC, messages.created_at DESC
          LIMIT 12`,
          [
            fullTextKeyword,
            currentUserId,
            currentUserId,
            currentUserId,
            fullTextKeyword,
            likeKeyword,
          ],
        )
      : await pool.execute(
          `SELECT
            messages.id,
            messages.conversation_id,
            messages.body,
            messages.type,
            messages.created_at,
            users.full_name AS sender_name,
            conversations.type AS conversation_type,
            conversations.title AS conversation_title,
            other_users.full_name AS direct_name,
            direct_contacts.nickname AS direct_nickname
          FROM messages
          INNER JOIN conversation_participants AS participant
            ON participant.conversation_id = messages.conversation_id
            AND participant.user_id = ?
            AND participant.left_at IS NULL
          INNER JOIN conversations ON conversations.id = messages.conversation_id
          INNER JOIN users ON users.id = messages.sender_id
          LEFT JOIN (
            SELECT conversation_id, MIN(user_id) AS user_id
            FROM conversation_participants
            WHERE user_id <> ?
              AND left_at IS NULL
            GROUP BY conversation_id
          ) AS other_participants ON other_participants.conversation_id = conversations.id
          LEFT JOIN users AS other_users ON other_users.id = other_participants.user_id
          LEFT JOIN contacts AS direct_contacts
            ON direct_contacts.owner_user_id = ?
            AND direct_contacts.contact_user_id = other_users.id
          WHERE conversations.deleted_at IS NULL
            AND conversations.is_archived = 0
            AND messages.deleted_at IS NULL
            AND messages.type <> 'system'
            AND messages.body LIKE ?
          ORDER BY messages.created_at DESC
          LIMIT 12`,
          [currentUserId, currentUserId, currentUserId, likeKeyword],
        )

    const [userRows] = await pool.execute(
      `SELECT
        users.public_id,
        users.full_name,
        users.email,
        users.avatar_url,
        users.bio,
        contacts.status AS friendship_status,
        contacts.id AS contact_id
      FROM users
      LEFT JOIN contacts
        ON contacts.owner_user_id = ?
        AND contacts.contact_user_id = users.id
      WHERE users.id <> ?
        AND users.deleted_at IS NULL
        AND users.is_active = 1
        AND (
          users.full_name LIKE ?
          OR users.email LIKE ?
          OR users.phone LIKE ?
        )
      ORDER BY
        CASE WHEN contacts.status = 'accepted' THEN 0 ELSE 1 END,
        users.full_name ASC
      LIMIT 8`,
      [currentUserId, currentUserId, likeKeyword, likeKeyword, likeKeyword],
    )

    response.json({
      conversations: conversationRows.map((row) => ({
        id: String(row.id),
        type: row.type,
        name:
          row.type === 'direct'
            ? row.direct_nickname || row.direct_name || 'Hội thoại'
            : row.title || 'Hội thoại',
        avatar: row.type === 'direct' ? row.direct_avatar_url || null : row.avatar_url || null,
        lastMessage: row.last_message_body || '',
        time: formatRelativeTime(row.last_message_at),
      })),
      messages: messageRows.map((row) => ({
        id: String(row.id),
        conversationId: String(row.conversation_id),
        conversationName:
          row.conversation_type === 'direct'
            ? row.direct_nickname || row.direct_name || 'Hội thoại'
            : row.conversation_title || 'Hội thoại',
        senderName: row.sender_name,
        text: row.body || '',
        type: row.type,
        time: formatRelativeTime(row.created_at),
      })),
      users: userRows.map((row) => ({
        id: row.public_id,
        fullName: row.full_name,
        email: row.email,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        friendshipStatus: row.friendship_status || 'none',
        contactId: row.contact_id ? String(row.contact_id) : null,
      })),
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  globalSearch,
}
