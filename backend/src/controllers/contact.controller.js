const { randomUUID } = require('crypto')
const { pool } = require('../config/db')
const { emitToUsers } = require('../realtime/socket')
const { sendWebPushToUsers } = require('../services/push.service')

function pushWebNotificationToUsers(userIds, payload) {
  sendWebPushToUsers(userIds, payload).catch((error) => {
    console.error('Không thể gửi thông báo đẩy trên Web:', error)
  })
}

function toContactUser(row) {
  return {
    id: row.public_id,
    userId: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender || null,
    address: row.address || null,
    birthDate: row.birth_date || null,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    statusMessage: row.status_message,
    presence: row.presence,
    friendshipStatus: row.friendship_status || 'none',
    requestDirection: row.request_direction || null,
    nickname: row.nickname || null,
    contactId: row.contact_id ? String(row.contact_id) : null,
    lastSeenAt: row.last_seen_at || null,
    onlineSince: row.online_since || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    contactCreatedAt: row.contact_created_at || null,
    contactUpdatedAt: row.contact_updated_at || null,
  }
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

const effectivePresenceSql = `CASE
  WHEN users.presence = 'online'
    AND users.last_seen_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
    THEN 'online'
  WHEN users.presence IN ('away', 'busy') THEN users.presence
  ELSE 'offline'
END`

async function searchUsers(request, response, next) {
  try {
    const currentUserId = request.user.id
    const keyword = typeof request.query.q === 'string' ? request.query.q.trim() : ''

    if (keyword.length < 2) {
      return response.json({
        users: [],
      })
    }

    const likeKeyword = `%${keyword}%`
    const [rows] = await pool.execute(
      `SELECT
        users.id,
        users.public_id,
        users.full_name,
        users.email,
        users.phone,
        users.gender,
        users.address,
        users.birth_date,
        users.avatar_url,
        users.bio,
        users.status_message,
        users.last_seen_at,
        users.online_since,
        users.created_at,
        users.updated_at,
        ${effectivePresenceSql} AS presence,
        contacts.id AS contact_id,
        contacts.nickname,
        contacts.status AS friendship_status,
        contacts.created_at AS contact_created_at,
        contacts.updated_at AS contact_updated_at,
        CASE
          WHEN contacts.requested_by = ? THEN 'outgoing'
          WHEN contacts.requested_by IS NOT NULL THEN 'incoming'
          ELSE NULL
        END AS request_direction
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
      ORDER BY users.full_name ASC
      LIMIT 20`,
      [currentUserId, currentUserId, currentUserId, likeKeyword, likeKeyword, likeKeyword],
    )

    response.json({
      users: rows.map(toContactUser),
    })
  } catch (error) {
    next(error)
  }
}

async function listIncomingRequests(request, response, next) {
  try {
    const currentUserId = request.user.id
    const [rows] = await pool.execute(
      `SELECT
        contacts.id AS contact_id,
        users.id,
        users.public_id,
        users.full_name,
        users.email,
        users.phone,
        users.gender,
        users.address,
        users.birth_date,
        users.avatar_url,
        users.bio,
        users.status_message,
        users.last_seen_at,
        users.online_since,
        users.created_at,
        users.updated_at,
        ${effectivePresenceSql} AS presence,
        contacts.status AS friendship_status,
        contacts.nickname,
        contacts.created_at AS contact_created_at,
        contacts.updated_at AS contact_updated_at,
        'incoming' AS request_direction
      FROM contacts
      INNER JOIN users ON users.id = contacts.owner_user_id
      WHERE contacts.contact_user_id = ?
        AND contacts.status = 'pending'
        AND contacts.requested_by <> ?
      ORDER BY contacts.created_at DESC`,
      [currentUserId, currentUserId],
    )

    response.json({
      requests: rows.map(toContactUser),
    })
  } catch (error) {
    next(error)
  }
}

async function listFriends(request, response, next) {
  try {
    const currentUserId = request.user.id
    const [rows] = await pool.execute(
      `SELECT
        contacts.id AS contact_id,
        users.id,
        users.public_id,
        users.full_name,
        users.email,
        users.phone,
        users.gender,
        users.address,
        users.birth_date,
        users.avatar_url,
        users.bio,
        users.status_message,
        users.last_seen_at,
        users.online_since,
        users.created_at,
        users.updated_at,
        ${effectivePresenceSql} AS presence,
        contacts.status AS friendship_status,
        contacts.nickname,
        contacts.created_at AS contact_created_at,
        contacts.updated_at AS contact_updated_at,
        NULL AS request_direction
      FROM contacts
      INNER JOIN users ON users.id = contacts.contact_user_id
      WHERE contacts.owner_user_id = ?
        AND contacts.status = 'accepted'
        AND users.deleted_at IS NULL
        AND users.is_active = 1
      ORDER BY users.full_name ASC`,
      [currentUserId],
    )

    response.json({
      friends: rows.map(toContactUser),
    })
  } catch (error) {
    next(error)
  }
}

async function listSuggestions(request, response, next) {
  try {
    const currentUserId = request.user.id
    const [rows] = await pool.execute(
      `SELECT
        users.id,
        users.public_id,
        users.full_name,
        users.email,
        users.phone,
        users.gender,
        users.address,
        users.birth_date,
        users.avatar_url,
        users.bio,
        users.status_message,
        users.last_seen_at,
        users.online_since,
        users.created_at,
        users.updated_at,
        ${effectivePresenceSql} AS presence,
        contacts.id AS contact_id,
        contacts.nickname,
        contacts.status AS friendship_status,
        contacts.created_at AS contact_created_at,
        contacts.updated_at AS contact_updated_at,
        CASE
          WHEN contacts.requested_by = ? THEN 'outgoing'
          WHEN contacts.requested_by IS NOT NULL THEN 'incoming'
          ELSE NULL
        END AS request_direction
      FROM users
      LEFT JOIN contacts
        ON contacts.owner_user_id = ?
        AND contacts.contact_user_id = users.id
      WHERE users.id <> ?
        AND users.deleted_at IS NULL
        AND users.is_active = 1
        AND (
          contacts.id IS NULL
          OR (
            contacts.status = 'pending'
            AND contacts.requested_by = ?
          )
        )
      ORDER BY users.created_at DESC
      LIMIT 20`,
      [currentUserId, currentUserId, currentUserId, currentUserId],
    )

    response.json({
      suggestions: rows.map(toContactUser),
    })
  } catch (error) {
    next(error)
  }
}

async function sendFriendRequest(request, response, next) {
  try {
    const currentUserId = request.user.id
    const targetPublicId = typeof request.body.userId === 'string' ? request.body.userId : ''

    const [targetRows] = await pool.execute(
      `SELECT id, public_id, full_name FROM users
      WHERE public_id = ? AND deleted_at IS NULL AND is_active = 1
      LIMIT 1`,
      [targetPublicId],
    )
    const targetUser = targetRows[0]

    if (!targetUser || targetUser.id === currentUserId) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng phù hợp!',
      })
    }

    const [existingRows] = await pool.execute(
      `SELECT id, status, requested_by
      FROM contacts
      WHERE owner_user_id = ? AND contact_user_id = ?
      LIMIT 1`,
      [currentUserId, targetUser.id],
    )

    if (existingRows[0]) {
      return response.status(409).json({
        message:
          existingRows[0].status === 'accepted'
            ? 'Hai người đã là bạn bè!'
            : 'Lời mời kết bạn đã tồn tại!',
      })
    }

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      await connection.execute(
        `INSERT INTO contacts (
          owner_user_id,
          contact_user_id,
          status,
          requested_by
        ) VALUES (?, ?, 'pending', ?)`,
        [currentUserId, targetUser.id, currentUserId],
      )

      await connection.execute(
        `INSERT INTO contacts (
          owner_user_id,
          contact_user_id,
          status,
          requested_by
        ) VALUES (?, ?, 'pending', ?)`,
        [targetUser.id, currentUserId, currentUserId],
      )

      await connection.execute(
        `INSERT INTO notifications (
          user_id,
          actor_id,
          type,
          title,
          body
        ) VALUES (?, ?, 'contact_request', ?, ?)`,
        [
          targetUser.id,
          currentUserId,
          `${request.user.full_name} đã gửi lời mời kết bạn!`,
          'Muốn kết bạn với bạn!',
        ],
      )

      await connection.commit()
      emitToUsers([currentUserId, targetUser.id], 'contacts:changed', {
        eventType: 'contact:request',
        actorUserId: String(currentUserId),
      })
      emitToUsers([targetUser.id], 'notifications:changed', {
        eventType: 'contact_request',
        actorUserId: String(currentUserId),
      })
      pushWebNotificationToUsers([targetUser.id], {
        title: `${request.user.full_name} đã gửi lời mời kết bạn!`,
        body: 'Muốn kết bạn với bạn!',
        tag: `contact-request:${currentUserId}`,
        url: '/notifications',
      })

      response.status(201).json({
        message: 'Đã gửi lời mời kết bạn!',
      })
    } catch (error) {
      await connection.rollback()

      if (error.code === 'ER_DUP_ENTRY') {
        return response.status(409).json({
          message: 'Lời mời kết bạn đã tồn tại!',
        })
      }

      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    next(error)
  }
}

async function findDirectConversation(connection, userAId, userBId) {
  const [rows] = await connection.execute(
    `SELECT conversations.id
    FROM conversations
    INNER JOIN conversation_participants AS participant_a
      ON participant_a.conversation_id = conversations.id
      AND participant_a.user_id = ?
      AND participant_a.left_at IS NULL
    INNER JOIN conversation_participants AS participant_b
      ON participant_b.conversation_id = conversations.id
      AND participant_b.user_id = ?
      AND participant_b.left_at IS NULL
    WHERE conversations.type = 'direct'
      AND conversations.deleted_at IS NULL
    LIMIT 1`,
    [userAId, userBId],
  )

  return rows[0]?.id || null
}

async function ensureDirectConversation(connection, userAId, userBId) {
  const existingConversationId = await findDirectConversation(connection, userAId, userBId)

  if (existingConversationId) {
    return existingConversationId
  }

  const [conversationResult] = await connection.execute(
    `INSERT INTO conversations (
      public_id,
      type,
      created_by
    ) VALUES (?, 'direct', ?)`,
    [randomUUID(), userAId],
  )
  const conversationId = conversationResult.insertId

  await connection.execute(
    `INSERT INTO conversation_participants (
      conversation_id,
      user_id,
      role,
      last_read_at
    ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP), (?, ?, 'member', CURRENT_TIMESTAMP)`,
    [conversationId, userAId, conversationId, userBId],
  )

  return conversationId
}

async function acceptFriendRequest(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [requestRows] = await pool.execute(
      `SELECT id, owner_user_id, contact_user_id, requested_by, status
      FROM contacts
      WHERE id = ?
        AND contact_user_id = ?
        AND status = 'pending'
      LIMIT 1`,
      [contactId, currentUserId],
    )
    const friendRequest = requestRows[0]

    if (!friendRequest) {
      return response.status(404).json({
        message: 'Không tìm thấy lời mời kết bạn!',
      })
    }

    const requesterId = friendRequest.owner_user_id
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      await connection.execute(
        `UPDATE contacts
        SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE owner_user_id IN (?, ?)
          AND contact_user_id IN (?, ?)
          AND requested_by = ?`,
        [currentUserId, requesterId, currentUserId, requesterId, friendRequest.requested_by],
      )

      const conversationId = await ensureDirectConversation(
        connection,
        currentUserId,
        requesterId,
      )

      await connection.commit()
      emitToUsers([currentUserId, requesterId], 'contacts:changed', {
        conversationId: String(conversationId),
        eventType: 'contact:accepted',
        actorUserId: String(currentUserId),
      })
      emitToUsers([currentUserId, requesterId], 'conversation:changed', {
        conversationId: String(conversationId),
        eventType: 'contact:accepted',
        actorUserId: String(currentUserId),
      })

      response.json({
        message: 'Đã chấp nhận lời mời kết bạn!',
        conversationId: String(conversationId),
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

async function cancelFriendRequest(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [requestRows] = await pool.execute(
      `SELECT owner_user_id, contact_user_id, requested_by, status
      FROM contacts
      WHERE id = ?
        AND owner_user_id = ?
        AND requested_by = ?
        AND status = 'pending'
      LIMIT 1`,
      [contactId, currentUserId, currentUserId],
    )
    const friendRequest = requestRows[0]

    if (!friendRequest) {
      return response.status(404).json({
        message: 'Không tìm thấy lời mời kết bạn phù hợp để hủy!',
      })
    }

    await pool.execute(
      `DELETE FROM contacts
      WHERE (owner_user_id = ? AND contact_user_id = ?)
        OR (owner_user_id = ? AND contact_user_id = ?)`,
      [
        currentUserId,
        friendRequest.contact_user_id,
        friendRequest.contact_user_id,
        currentUserId,
      ],
    )
    emitToUsers([currentUserId, friendRequest.contact_user_id], 'contacts:changed', {
      eventType: 'contact:cancelled',
      actorUserId: String(currentUserId),
    })

    response.json({
      message: 'Đã hủy lời mời kết bạn!',
    })
  } catch (error) {
    next(error)
  }
}

async function declineFriendRequest(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [requestRows] = await pool.execute(
      `SELECT owner_user_id, contact_user_id, requested_by, status
      FROM contacts
      WHERE id = ?
        AND contact_user_id = ?
        AND requested_by <> ?
        AND status = 'pending'
      LIMIT 1`,
      [contactId, currentUserId, currentUserId],
    )
    const friendRequest = requestRows[0]

    if (!friendRequest) {
      return response.status(404).json({
        message: 'Không tìm thấy lời mời kết bạn phù hợp để từ chối!',
      })
    }

    await pool.execute(
      `DELETE FROM contacts
      WHERE (owner_user_id = ? AND contact_user_id = ?)
        OR (owner_user_id = ? AND contact_user_id = ?)`,
      [
        currentUserId,
        friendRequest.owner_user_id,
        friendRequest.owner_user_id,
        currentUserId,
      ],
    )

    emitToUsers([currentUserId, friendRequest.owner_user_id], 'contacts:changed', {
      eventType: 'contact:declined',
      actorUserId: String(currentUserId),
    })

    response.json({
      message: 'Đã từ chối lời mời kết bạn!',
    })
  } catch (error) {
    next(error)
  }
}

async function blockContact(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [contactRows] = await pool.execute(
      `SELECT owner_user_id, contact_user_id, status
      FROM contacts
      WHERE id = ?
        AND owner_user_id = ?
        AND status IN ('accepted', 'blocked')
      LIMIT 1`,
      [contactId, currentUserId],
    )
    const contact = contactRows[0]

    if (!contact) {
      return response.status(404).json({
        message: 'Không tìm thấy liên hệ phù hợp để chặn!',
      })
    }

    await pool.execute(
      `UPDATE contacts
      SET status = 'blocked', updated_at = CURRENT_TIMESTAMP
      WHERE owner_user_id = ? AND contact_user_id = ?`,
      [currentUserId, contact.contact_user_id],
    )
    emitToUsers([currentUserId, contact.contact_user_id], 'contacts:changed', {
      eventType: 'contact:blocked',
      actorUserId: String(currentUserId),
    })

    response.json({
      message: 'Đã chặn người dùng!',
      contactId: String(contactId),
      friendshipStatus: 'blocked',
    })
  } catch (error) {
    next(error)
  }
}

async function unblockContact(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [contactRows] = await pool.execute(
      `SELECT owner_user_id, contact_user_id, status
      FROM contacts
      WHERE id = ?
        AND owner_user_id = ?
        AND status = 'blocked'
      LIMIT 1`,
      [contactId, currentUserId],
    )
    const contact = contactRows[0]

    if (!contact) {
      return response.status(404).json({
        message: 'Không tìm thấy liên hệ phù hợp để bỏ chặn!',
      })
    }

    await pool.execute(
      `UPDATE contacts
      SET status = 'accepted',
        accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE owner_user_id = ? AND contact_user_id = ?`,
      [currentUserId, contact.contact_user_id],
    )
    emitToUsers([currentUserId, contact.contact_user_id], 'contacts:changed', {
      eventType: 'contact:unblocked',
      actorUserId: String(currentUserId),
    })

    response.json({
      message: 'Đã bỏ chặn người dùng!',
      contactId: String(contactId),
      friendshipStatus: 'accepted',
    })
  } catch (error) {
    next(error)
  }
}

async function updateContactNickname(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)
    const nickname = normalizeNickname(request.body.nickname)

    if (!Number.isInteger(contactId)) {
      return response.status(400).json({
        message: 'Liên hệ không hợp lệ!',
      })
    }

    if (nickname === false) {
      return response.status(400).json({
        message: 'Biệt danh không được vượt quá 80 ký tự!',
      })
    }

    const [contactRows] = await pool.execute(
      `SELECT id, contact_user_id, status
      FROM contacts
      WHERE id = ?
        AND owner_user_id = ?
        AND status = 'accepted'
      LIMIT 1`,
      [contactId, currentUserId],
    )
    const contact = contactRows[0]

    if (!contact) {
      return response.status(404).json({
        message: 'Không tìm thấy liên hệ phù hợp!',
      })
    }

    await pool.execute(
      `UPDATE contacts
      SET nickname = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND owner_user_id = ?`,
      [nickname, contactId, currentUserId],
    )

    emitToUsers([currentUserId], 'contacts:changed', {
      eventType: nickname ? 'contact:nickname' : 'contact:nickname:removed',
      actorUserId: String(currentUserId),
      contactId: String(contactId),
      nickname,
    })

    response.json({
      message: nickname ? 'Đã cập nhật biệt danh!' : 'Đã xóa biệt danh!',
      contactId: String(contactId),
      nickname,
    })
  } catch (error) {
    next(error)
  }
}

async function unfriend(request, response, next) {
  try {
    const currentUserId = request.user.id
    const contactId = Number(request.params.contactId)

    const [contactRows] = await pool.execute(
      `SELECT owner_user_id, contact_user_id, status
      FROM contacts
      WHERE id = ?
        AND owner_user_id = ?
        AND status = 'accepted'
      LIMIT 1`,
      [contactId, currentUserId],
    )
    const contact = contactRows[0]

    if (!contact) {
      return response.status(404).json({
        message: 'Không tìm thấy bạn bè phù hợp để hủy kết bạn!',
      })
    }

    await pool.execute(
      `DELETE FROM contacts
      WHERE (owner_user_id = ? AND contact_user_id = ?)
        OR (owner_user_id = ? AND contact_user_id = ?)`,
      [currentUserId, contact.contact_user_id, contact.contact_user_id, currentUserId],
    )
    emitToUsers([currentUserId, contact.contact_user_id], 'contacts:changed', {
      eventType: 'contact:unfriend',
      actorUserId: String(currentUserId),
    })

    response.json({
      message: 'Đã hủy kết bạn!',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  acceptFriendRequest,
  blockContact,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listSuggestions,
  searchUsers,
  sendFriendRequest,
  unblockContact,
  updateContactNickname,
  unfriend,
}
