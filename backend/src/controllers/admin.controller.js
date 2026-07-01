const { pool } = require('../config/db')

const ALLOWED_ROLES = new Set(['user', 'agent', 'owner'])
const MAX_PAGE_SIZE = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toAdminStatus(row) {
  if (!row.is_active) {
    return 'suspended'
  }

  return row.presence === 'offline' ? 'inactive' : 'active'
}

function toAdminUser(row) {
  return {
    id: row.public_id,
    name: row.display_name || row.full_name,
    fullName: row.full_name,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: toAdminStatus(row),
    presence: row.presence,
    isActive: Boolean(row.is_active),
    avatarUrl: row.avatar_url,
    lastLogin: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getAdminStats(_request, response, next) {
  try {
    const [[userStats], [alertStats]] = await Promise.all([
      pool.execute(
        `SELECT
          COUNT(*) AS total_users,
          SUM(CASE WHEN is_active = 1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_active = 0 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS suspended_users,
          SUM(CASE WHEN presence <> 'offline' AND is_active = 1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS online_users
        FROM users
        WHERE deleted_at IS NULL
          AND role <> 'admin'`,
      ),
      pool.execute(
        `SELECT COUNT(*) AS unread_system_alerts
        FROM notifications
        WHERE type = 'system'
          AND read_at IS NULL`,
      ),
    ])

    const stats = userStats[0] || {}
    const alerts = alertStats[0] || {}

    response.json({
      stats: {
        totalUsers: Number(stats.total_users || 0),
        activeUsers: Number(stats.active_users || 0),
        suspendedUsers: Number(stats.suspended_users || 0),
        onlineUsers: Number(stats.online_users || 0),
        alertCount: Number(alerts.unread_system_alerts || 0),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function getAdminUsers(request, response, next) {
  try {
    const page = toPositiveInteger(request.query.page, 1)
    const limit = Math.min(toPositiveInteger(request.query.limit, 20), MAX_PAGE_SIZE)
    const offset = (page - 1) * limit
    const search = typeof request.query.search === 'string' ? request.query.search.trim() : ''
    const filters = ['deleted_at IS NULL', 'role <> ?']
    const params = ['admin']

    if (search) {
      const term = `%${escapeLike(search)}%`
      filters.push('(full_name LIKE ? ESCAPE \'\\\\\' OR display_name LIKE ? ESCAPE \'\\\\\' OR email LIKE ? ESCAPE \'\\\\\')')
      params.push(term, term, term)
    }

    const whereClause = filters.join(' AND ')
    const [[countRows], [userRows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM users
        WHERE ${whereClause}`,
        params,
      ),
      pool.execute(
        `SELECT
          public_id,
          full_name,
          display_name,
          email,
          avatar_url,
          role,
          presence,
          is_active,
          last_seen_at,
          created_at,
          updated_at
        FROM users
        WHERE ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ])

    const total = Number((countRows[0] && countRows[0].total) || 0)

    response.json({
      users: userRows.map(toAdminUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updateAdminUser(request, response, next) {
  try {
    const userId = String(request.params.id || '').trim()
    const payload = request.body && typeof request.body === 'object' ? request.body : {}
    const role = typeof payload.role === 'string' ? payload.role.trim() : undefined
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : undefined
    const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim() : undefined
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined
    const errors = {}

    if (role !== undefined && !ALLOWED_ROLES.has(role)) {
      errors.role = 'Vai trò không hợp lệ!'
    }

    if (fullName !== undefined && fullName.length < 2) {
      errors.fullName = 'Họ tên phải có ít nhất 2 ký tự!'
    }

    if (displayName !== undefined && displayName.length > 80) {
      errors.displayName = 'Tên hiển thị không được vượt quá 80 ký tự!'
    }

    if (email !== undefined && !EMAIL_PATTERN.test(email)) {
      errors.email = 'Email không hợp lệ!'
    }

    if (role === undefined && fullName === undefined && displayName === undefined && email === undefined) {
      errors.form = 'Vui lòng chọn thông tin cần cập nhật!'
    }

    if (Object.keys(errors).length > 0) {
      return response.status(422).json({
        message: 'Dữ liệu cập nhật người dùng không hợp lệ!',
        errors,
      })
    }

    const assignments = []
    const params = []

    if (role !== undefined) {
      assignments.push('role = ?')
      params.push(role)
    }

    if (fullName !== undefined) {
      assignments.push('full_name = ?')
      params.push(fullName)
    }

    if (displayName !== undefined) {
      assignments.push('display_name = ?')
      params.push(displayName || null)
    }

    if (email !== undefined) {
      const [emailRows] = await pool.execute(
        `SELECT public_id
        FROM users
        WHERE email = ?
          AND public_id <> ?
          AND deleted_at IS NULL
        LIMIT 1`,
        [email, userId],
      )

      if (emailRows[0]) {
        return response.status(422).json({
          message: 'Dữ liệu cập nhật người dùng không hợp lệ!',
          errors: {
            email: 'Email này đã được sử dụng!',
          },
        })
      }

      assignments.push('email = ?')
      params.push(email)
    }

    assignments.push('updated_at = CURRENT_TIMESTAMP')

    const [result] = await pool.execute(
      `UPDATE users
      SET ${assignments.join(', ')}
      WHERE public_id = ?
        AND deleted_at IS NULL
        AND role <> 'admin'`,
      [...params, userId],
    )

    if (!result.affectedRows) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng!',
      })
    }

    const [rows] = await pool.execute(
      `SELECT
        public_id,
        full_name,
        display_name,
        email,
        avatar_url,
        role,
        presence,
        is_active,
        last_seen_at,
        created_at,
        updated_at
      FROM users
      WHERE public_id = ?
        AND role <> 'admin'
      LIMIT 1`,
      [userId],
    )

    response.json({
      message: 'Cập nhật người dùng thành công!',
      user: toAdminUser(rows[0]),
    })
  } catch (error) {
    next(error)
  }
}

async function setAdminUserLockState(request, response, next, shouldLock) {
  const connection = await pool.getConnection()

  try {
    const userId = String(request.params.id || '').trim()
    const [rows] = await connection.execute(
      `SELECT id
      FROM users
      WHERE public_id = ?
        AND deleted_at IS NULL
        AND role <> 'admin'
      LIMIT 1`,
      [userId],
    )
    const user = rows[0]

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng!',
      })
    }

    await connection.beginTransaction()
    await connection.execute(
      `UPDATE users
      SET is_active = ?,
        presence = 'offline',
        online_since = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [shouldLock ? 0 : 1, user.id],
    )

    if (shouldLock) {
      await connection.execute(
        `UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND revoked_at IS NULL`,
        [user.id],
      )
    }

    await connection.commit()

    const [updatedRows] = await pool.execute(
      `SELECT
        public_id,
        full_name,
        display_name,
        email,
        avatar_url,
        role,
        presence,
        is_active,
        last_seen_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1`,
      [user.id],
    )

    response.json({
      message: shouldLock ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản thành công!',
      user: toAdminUser(updatedRows[0]),
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

function lockAdminUser(request, response, next) {
  return setAdminUserLockState(request, response, next, true)
}

function unlockAdminUser(request, response, next) {
  return setAdminUserLockState(request, response, next, false)
}

async function deleteAdminUser(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const userId = String(request.params.id || '').trim()
    const [rows] = await connection.execute(
      `SELECT id
      FROM users
      WHERE public_id = ?
        AND deleted_at IS NULL
        AND role <> 'admin'
      LIMIT 1`,
      [userId],
    )
    const user = rows[0]

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng!',
      })
    }

    await connection.beginTransaction()
    await connection.execute(
      `DELETE FROM conversations
      WHERE created_by = ?`,
      [user.id],
    )
    await connection.execute(
      `DELETE FROM message_attachments
      WHERE uploader_id = ?`,
      [user.id],
    )
    await connection.execute(
      `DELETE FROM messages
      WHERE sender_id = ?`,
      [user.id],
    )
    await connection.execute(
      `DELETE FROM call_logs
      WHERE started_by = ?`,
      [user.id],
    )
    await connection.execute(
      `DELETE FROM users
      WHERE id = ?`,
      [user.id],
    )
    await connection.commit()

    response.json({
      message: 'Đã xóa vĩnh viễn người dùng khỏi hệ thống!',
      deletedUserId: userId,
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  lockAdminUser,
  unlockAdminUser,
  updateAdminUser,
}
