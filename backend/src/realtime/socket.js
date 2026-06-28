const { createHash } = require('crypto')
const { randomUUID } = require('crypto')
const { Server } = require('socket.io')
const { pool } = require('../config/db')
const { sendWebPushToUsers } = require('../services/push.service')

let io = null
const activeCallTimers = new Map()

function pushWebNotificationToUsers(userIds, payload) {
  sendWebPushToUsers(userIds, payload).catch((error) => {
    console.error('Không thể gửi thông báo đẩy trên Web:', error)
  })
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function getUserRoom(userId) {
  return `user:${userId}`
}

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`
}

async function findConversationParticipant(connection, conversationId, userId) {
  const [rows] = await connection.execute(
    `SELECT id
    FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    LIMIT 1`,
    [conversationId, userId],
  )

  return rows[0]
}

async function loadConversationCallPayload(connection, conversationId, currentUserId) {
  const [conversationRows] = await connection.execute(
    `SELECT
      conversations.id,
      conversations.type,
      conversations.title,
      conversations.avatar_url,
      direct_users.full_name AS direct_name,
      direct_users.avatar_url AS direct_avatar_url
    FROM conversations
    LEFT JOIN conversation_participants AS direct_participants
      ON direct_participants.conversation_id = conversations.id
      AND direct_participants.user_id <> ?
      AND direct_participants.left_at IS NULL
    LEFT JOIN users AS direct_users
      ON direct_users.id = direct_participants.user_id
    WHERE conversations.id = ?
      AND conversations.deleted_at IS NULL
    LIMIT 1`,
    [currentUserId, conversationId],
  )

  const conversation = conversationRows[0]

  if (!conversation) {
    return null
  }

  const [participantRows] = await connection.execute(
    `SELECT
      users.id,
      users.public_id,
      users.full_name,
      users.avatar_url
    FROM conversation_participants
    INNER JOIN users ON users.id = conversation_participants.user_id
    WHERE conversation_participants.conversation_id = ?
      AND conversation_participants.left_at IS NULL
      AND users.is_active = 1
      AND users.deleted_at IS NULL`,
    [conversationId],
  )

  return {
    conversationId: String(conversation.id),
    conversationName:
      conversation.type === 'direct'
        ? conversation.direct_name || 'Hội thoại'
        : conversation.title || 'Nhóm chat',
    conversationAvatar:
      conversation.type === 'direct'
        ? conversation.direct_avatar_url || null
        : conversation.avatar_url || null,
    participants: participantRows.map((row) => ({
      id: String(row.public_id),
      userId: Number(row.id),
      fullName: row.full_name,
      avatarUrl: row.avatar_url || null,
    })),
  }
}

async function loadCall(connection, callId) {
  const [rows] = await connection.execute(
    `SELECT
      call_logs.id,
      call_logs.public_id,
      call_logs.conversation_id,
      call_logs.started_by,
      call_logs.type,
      call_logs.status,
      call_logs.started_at,
      call_logs.ended_at,
      call_logs.duration_seconds,
      conversations.type AS conversation_type,
      users.public_id AS caller_public_id,
      users.full_name AS caller_name,
      users.avatar_url AS caller_avatar_url
    FROM call_logs
    INNER JOIN conversations ON conversations.id = call_logs.conversation_id
    INNER JOIN users ON users.id = call_logs.started_by
    WHERE call_logs.public_id = ?
    LIMIT 1`,
    [callId],
  )

  return rows[0]
}

async function loadActiveCallParticipants(connection, callLogId) {
  const [rows] = await connection.execute(
    `SELECT
      users.id,
      users.public_id,
      users.full_name,
      users.avatar_url
    FROM call_participants
    INNER JOIN users ON users.id = call_participants.user_id
    WHERE call_participants.call_log_id = ?
      AND call_participants.status = 'joined'
      AND users.is_active = 1
      AND users.deleted_at IS NULL`,
    [callLogId],
  )

  return rows.map((row) => ({
    id: String(row.public_id),
    userId: Number(row.id),
    fullName: row.full_name,
    avatarUrl: row.avatar_url || null,
  }))
}

function formatDateTime(value) {
  if (!value) {
    return 'Chưa có!'
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

    return `${hours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`
  }

  if (minutes > 0) {
    return `${minutes} phút ${remainingSeconds} giây`
  }

  return `${remainingSeconds} giây`
}

function getCallStatusLabel(status) {
  if (status === 'completed') {
    return 'Đã kết thúc!'
  }

  if (status === 'declined') {
    return 'Đã từ chối!'
  }

  if (status === 'missed') {
    return 'Cuộc gọi nhỡ!'
  }

  if (status === 'cancelled') {
    return 'Đã hủy!'
  }

  return status
}

async function createCallDetailMessage(connection, call, endedAt, durationSeconds, endedByUserId) {
  if (call.conversation_type !== 'direct') {
    return null
  }

  const durationLabel = formatCallDuration(durationSeconds)
  const body =
    call.status === 'cancelled'
      ? 'Cu\u1ed9c g\u1ecdi: \u0110\u00e3 h\u1ee7y.'
      : call.status === 'completed'
        ? `Cu\u1ed9c g\u1ecdi: K\u1ebft th\u00fac, Th\u1eddi l\u01b0\u1ee3ng: ${durationLabel}`
        : call.status === 'ongoing'
          ? `Cu\u1ed9c g\u1ecdi \u0111ang di\u1ec5n ra: Th\u1eddi l\u01b0\u1ee3ng ${durationLabel}`
          : call.status === 'missed'
            ? 'Cu\u1ed9c g\u1ecdi nh\u1ee1'
            : getCallStatusLabel(call.status)
  const [result] = await connection.execute(
    `INSERT INTO messages (
      public_id,
      conversation_id,
      sender_id,
      type,
      body,
      status
    ) VALUES (?, ?, ?, 'system', ?, 'sent')`,
    [randomUUID(), call.conversation_id, call.started_by, body],
  )

  await connection.execute(
    `UPDATE conversations
    SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [result.insertId, call.conversation_id],
  )

  return result.insertId
}

async function emitCallChanged(connection, call, eventName, extraPayload = {}) {
  const conversationPayload = await loadConversationCallPayload(
    connection,
    call.conversation_id,
    call.started_by,
  )

  if (!conversationPayload) {
    return
  }

  const payload = {
    callId: call.public_id,
    conversationId: String(call.conversation_id),
    conversationName: conversationPayload.conversationName,
    conversationAvatar: conversationPayload.conversationAvatar,
    type: call.type,
    status: call.status,
    startedAt: call.started_at,
    caller: {
      id: String(call.caller_public_id),
      userId: Number(call.started_by),
      fullName: call.caller_name,
      avatarUrl: call.caller_avatar_url || null,
    },
    participants: conversationPayload.participants,
    activeParticipants: await loadActiveCallParticipants(connection, call.id),
    ...extraPayload,
  }

  emitToConversation(call.conversation_id, eventName, payload)
}

function clearCallTimer(callId) {
  const timer = activeCallTimers.get(callId)

  if (timer) {
    clearTimeout(timer)
    activeCallTimers.delete(callId)
  }
}

function scheduleMissedCall(callId) {
  clearCallTimer(callId)

  activeCallTimers.set(
    callId,
    setTimeout(async () => {
      const connection = await pool.getConnection()

      try {
        await connection.beginTransaction()
        const call = await loadCall(connection, callId)

        if (!call || call.status !== 'ringing') {
          await connection.rollback()
          return
        }

        await connection.execute(
          `UPDATE call_logs
          SET status = 'missed', ended_at = CURRENT_TIMESTAMP, duration_seconds = 0
          WHERE id = ?`,
          [call.id],
        )
        await connection.execute(
          `UPDATE call_participants
          SET status = CASE WHEN user_id = ? THEN 'left' ELSE 'missed' END,
            left_at = CURRENT_TIMESTAMP
          WHERE call_log_id = ?`,
          [call.started_by, call.id],
        )

        const endedAt = new Date()
        const updatedCall = {
          ...call,
          status: 'missed',
          ended_at: endedAt,
          duration_seconds: 0,
        }

        await createCallDetailMessage(connection, updatedCall, endedAt, 0, call.started_by)

        await connection.commit()
        await emitCallChanged(connection, updatedCall, 'call:missed')
        emitToConversation(call.conversation_id, 'conversation:changed', {
          conversationId: String(call.conversation_id),
          actorUserId: String(call.started_by),
          eventType: 'call:missed',
        })
      } catch (error) {
        await connection.rollback()
        console.error('Không đánh dấu cuộc gọi nhỡ:', error)
      } finally {
        connection.release()
        activeCallTimers.delete(callId)
      }
    }, 45_000),
  )
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token

    if (!token) {
      next(new Error('Missing auth token!'))
      return
    }

    const [rows] = await pool.execute(
      `SELECT
        users.id,
        users.public_id,
        users.full_name
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.refresh_token_hash = ?
        AND user_sessions.revoked_at IS NULL
        AND user_sessions.expires_at > CURRENT_TIMESTAMP
        AND users.is_active = 1
        AND users.deleted_at IS NULL
      LIMIT 1`,
      [hashToken(token)],
    )

    if (!rows[0]) {
      next(new Error('Invalid auth token!'))
      return
    }

    socket.user = rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

async function joinConversationRooms(socket) {
  const [rows] = await pool.execute(
    `SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = ? AND left_at IS NULL`,
    [socket.user.id],
  )

  rows.forEach((row) => {
    socket.join(getConversationRoom(row.conversation_id))
  })
}

function initRealtime(server, corsOrigin) {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  })

  io.use(authenticateSocket)

  io.on('connection', async (socket) => {
    socket.join(getUserRoom(socket.user.id))
    await joinConversationRooms(socket)

    socket.on('realtime:refresh-conversations', async () => {
      await joinConversationRooms(socket)
    })

    socket.on('call:start', async (payload = {}, ack) => {
      const connection = await pool.getConnection()

      try {
        const conversationId = Number(payload.conversationId)
        const type = payload.type === 'video' ? 'video' : 'audio'

        if (!Number.isInteger(conversationId)) {
          ack?.({ ok: false, message: 'Hội thoại không hợp lệ!' })
          return
        }

        await connection.beginTransaction()
        const participant = await findConversationParticipant(connection, conversationId, socket.user.id)

        if (!participant) {
          await connection.rollback()
          ack?.({ ok: false, message: 'Bạn không có quyền gọi trong hội thoại này!' })
          return
        }

        const conversationPayload = await loadConversationCallPayload(
          connection,
          conversationId,
          socket.user.id,
        )

        if (!conversationPayload || conversationPayload.participants.length < 2) {
          await connection.rollback()
          ack?.({ ok: false, message: 'Hội thoại cần ít nhất 2 thành viên để gọi!' })
          return
        }

        const callId = randomUUID()
        const [result] = await connection.execute(
          `INSERT INTO call_logs (public_id, conversation_id, started_by, type, status)
          VALUES (?, ?, ?, ?, 'ringing')`,
          [callId, conversationId, socket.user.id, type],
        )

        await connection.execute(
          `INSERT INTO call_participants (call_log_id, user_id, status, joined_at)
          VALUES (?, ?, 'joined', CURRENT_TIMESTAMP)`,
          [result.insertId, socket.user.id],
        )
        await connection.execute(
          `INSERT INTO call_participants (call_log_id, user_id, status)
          SELECT ?, conversation_participants.user_id, 'invited'
          FROM conversation_participants
          WHERE conversation_participants.conversation_id = ?
            AND conversation_participants.left_at IS NULL
            AND conversation_participants.user_id <> ?`,
          [result.insertId, conversationId, socket.user.id],
        )

        const call = await loadCall(connection, callId)
        await connection.commit()

        const callPayload = {
          callId,
          conversationId: String(conversationId),
          conversationName: conversationPayload.conversationName,
          conversationAvatar: conversationPayload.conversationAvatar,
          type,
          status: 'ringing',
          startedAt: call.started_at,
          caller: {
            id: String(socket.user.public_id),
            userId: Number(socket.user.id),
            fullName: socket.user.full_name,
            avatarUrl: null,
          },
          participants: conversationPayload.participants,
          activeParticipants: conversationPayload.participants.filter(
            (participant) => participant.userId === Number(socket.user.id),
          ),
        }

        socket.emit('call:ringing', callPayload)
        socket.to(getConversationRoom(conversationId)).emit('call:incoming', callPayload)
        pushWebNotificationToUsers(
          conversationPayload.participants
            .filter((participant) => participant.userId !== Number(socket.user.id))
            .map((participant) => participant.userId),
          {
            title: `Cuộc gọi ${type === 'video' ? 'video' : 'audio'} đến`,
            body: socket.user.full_name,
            tag: `call:${callId}`,
            url: `/chat/${conversationId}`,
          },
        )
        scheduleMissedCall(callId)
        ack?.({ ok: true, call: callPayload })
      } catch (error) {
        await connection.rollback()
        console.error('Không thể bắt đầu cuộc gọi:', error)
        ack?.({ ok: false, message: 'Không thể bắt đầu cuộc gọi!' })
      } finally {
        connection.release()
      }
    })

    socket.on('call:accept', async (payload = {}, ack) => {
      const connection = await pool.getConnection()

      try {
        const callId = String(payload.callId || '')

        await connection.beginTransaction()
        const call = await loadCall(connection, callId)

        if (!call || !['ringing', 'ongoing'].includes(call.status)) {
          await connection.rollback()
          ack?.({ ok: false, message: 'Cuộc gọi không khả dụng!' })
          return
        }

        const participant = await findConversationParticipant(
          connection,
          call.conversation_id,
          socket.user.id,
        )

        if (!participant) {
          await connection.rollback()
          ack?.({ ok: false, message: 'Bạn không ở trong hội thoại này!' })
          return
        }

        if (call.status === 'ringing') {
          await connection.execute(
            `UPDATE call_logs
            SET status = 'ongoing'
            WHERE id = ?`,
            [call.id],
          )
        }
        await connection.execute(
          `UPDATE call_participants
          SET status = 'joined', joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP)
          WHERE call_log_id = ? AND user_id = ?`,
          [call.id, socket.user.id],
        )

        const updatedCall = {
          ...call,
          status: 'ongoing',
        }

        await connection.commit()
        clearCallTimer(callId)
        await emitCallChanged(connection, updatedCall, 'call:accepted', {
          acceptedBy: {
            id: String(socket.user.public_id),
            userId: Number(socket.user.id),
            fullName: socket.user.full_name,
            avatarUrl: socket.user.avatar_url || null,
          },
        })
        ack?.({ ok: true })
      } catch (error) {
        await connection.rollback()
        console.error('Không thể nhận cuộc gọi:', error)
        ack?.({ ok: false, message: 'Không thể nhận cuộc gọi!' })
      } finally {
        connection.release()
      }
    })

    async function finishCall(callId, status, participantStatus, ack) {
      const connection = await pool.getConnection()

      try {
        await connection.beginTransaction()
        const call = await loadCall(connection, callId)

        if (!call || !['ringing', 'ongoing'].includes(call.status)) {
          await connection.rollback()
          ack?.({ ok: false })
          return
        }

        const participant = await findConversationParticipant(
          connection,
          call.conversation_id,
          socket.user.id,
        )

        if (!participant) {
          await connection.rollback()
          ack?.({ ok: false })
          return
        }

        if (call.status === 'ongoing' && status === 'completed') {
          await connection.execute(
            `UPDATE call_participants
            SET status = ?, left_at = CURRENT_TIMESTAMP
            WHERE call_log_id = ? AND user_id = ?`,
            [participantStatus, call.id, socket.user.id],
          )

          const activeParticipants = await loadActiveCallParticipants(connection, call.id)

          if (activeParticipants.length >= 2) {
            const updatedCall = {
              ...call,
              status: 'ongoing',
            }

            await connection.commit()
            await emitCallChanged(connection, updatedCall, 'call:left', {
              leftBy: {
                id: String(socket.user.public_id),
                userId: Number(socket.user.id),
                fullName: socket.user.full_name,
                avatarUrl: socket.user.avatar_url || null,
              },
            })
            ack?.({ ok: true })
            return
          }
        }

        const nextStatus = call.status === 'ongoing' && status === 'cancelled' ? 'completed' : status
        const endedAt = new Date()
        const durationSeconds = Math.max(
          Math.floor((endedAt.getTime() - new Date(call.started_at).getTime()) / 1000),
          0,
        )

        await connection.execute(
          `UPDATE call_logs
          SET status = ?, ended_at = CURRENT_TIMESTAMP,
            duration_seconds = GREATEST(TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP), 0)
          WHERE id = ?`,
          [nextStatus, call.id],
        )
        await connection.execute(
          `UPDATE call_participants
          SET status = CASE
              WHEN user_id = ? THEN ?
              WHEN status = 'invited' THEN 'missed'
              ELSE 'left'
            END,
            left_at = CURRENT_TIMESTAMP
          WHERE call_log_id = ?`,
          [socket.user.id, participantStatus, call.id],
        )

        const updatedCall = {
          ...call,
          status: nextStatus,
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        }

        await createCallDetailMessage(
          connection,
          updatedCall,
          endedAt,
          durationSeconds,
          socket.user.id,
        )

        await connection.commit()
        clearCallTimer(callId)
        await emitCallChanged(connection, updatedCall, `call:${nextStatus}`)
        emitToConversation(call.conversation_id, 'conversation:changed', {
          conversationId: String(call.conversation_id),
          actorUserId: String(socket.user.id),
          eventType: `call:${nextStatus}`,
        })
        ack?.({ ok: true })
      } catch (error) {
        await connection.rollback()
        console.error('Không thể hoàn thành cuộc gọi:', error)
        ack?.({ ok: false })
      } finally {
        connection.release()
      }
    }

    socket.on('call:decline', (payload = {}, ack) => {
      finishCall(String(payload.callId || ''), 'declined', 'declined', ack)
    })

    socket.on('call:cancel', (payload = {}, ack) => {
      finishCall(String(payload.callId || ''), 'cancelled', 'left', ack)
    })

    socket.on('call:end', (payload = {}, ack) => {
      finishCall(String(payload.callId || ''), 'completed', 'left', ack)
    })

    socket.on('call:signal', async (payload = {}) => {
      const callId = String(payload.callId || '')
      const connection = await pool.getConnection()

      try {
        const call = await loadCall(connection, callId)

        if (!call) {
          return
        }

        const participant = await findConversationParticipant(
          connection,
          call.conversation_id,
          socket.user.id,
        )

        if (!participant) {
          return
        }

        const signalPayload = {
          callId,
          conversationId: String(call.conversation_id),
          toUserId: Number(payload.toUserId) || undefined,
          from: {
            id: String(socket.user.public_id),
            userId: Number(socket.user.id),
            fullName: socket.user.full_name,
            avatarUrl: socket.user.avatar_url || null,
          },
          data: payload.data,
        }

        if (signalPayload.toUserId) {
          io.to(getUserRoom(signalPayload.toUserId)).emit('call:signal', signalPayload)
          return
        }

        socket.to(getConversationRoom(call.conversation_id)).emit('call:signal', signalPayload)
      } catch (error) {
        console.error('Không thể chuyển tiếp tín hiệu cuộc gọi:', error)
      } finally {
        connection.release()
      }
    })
  })

  return io
}

function emitToUsers(userIds, eventName, payload = {}) {
  if (!io) {
    return
  }

  ;[...new Set(userIds.filter(Boolean))].forEach((userId) => {
    io.to(getUserRoom(userId)).emit(eventName, payload)
  })
}

function emitToConversation(conversationId, eventName, payload = {}) {
  if (!io) {
    return
  }

  io.to(getConversationRoom(conversationId)).emit(eventName, payload)
}

module.exports = {
  emitToConversation,
  emitToUsers,
  initRealtime,
}

