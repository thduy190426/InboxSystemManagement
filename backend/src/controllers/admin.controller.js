const { pool } = require('../config/db')

const ALLOWED_ROLES = new Set(['user', 'agent', 'admin', 'owner'])
const ALLOWED_STATUSES = new Set(['active', 'inactive', 'suspended'])
const MAX_PAGE_SIZE = 100

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

function getStatusUpdate(status) {
  if (status === 'active') {
    return {
      isActive: 1,
      presence: null,
    }
  }

  return {
    isActive: status === 'inactive' ? 1 : 0,
    presence: 'offline',
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
        WHERE deleted_at IS NULL`,
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
    const filters = ['deleted_at IS NULL']
    const params = []

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
    const status = typeof payload.status === 'string' ? payload.status.trim() : undefined
    const errors = {}

    if (role !== undefined && !ALLOWED_ROLES.has(role)) {
      errors.role = 'Vai trò không hợp lệ!'
    }

    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      errors.status = 'Trạng thái người dùng không hợp lệ!'
    }

    if (role === undefined && status === undefined) {
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

    if (status !== undefined) {
      const statusUpdate = getStatusUpdate(status)
      assignments.push('is_active = ?')
      params.push(statusUpdate.isActive)

      if (statusUpdate.presence) {
        assignments.push('presence = ?', 'online_since = NULL')
        params.push(statusUpdate.presence)
      }
    }

    assignments.push('updated_at = CURRENT_TIMESTAMP')

    const [result] = await pool.execute(
      `UPDATE users
      SET ${assignments.join(', ')}
      WHERE public_id = ?
        AND deleted_at IS NULL`,
      [...params, userId],
    )

    if (!result.affectedRows) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng!',
      })
    }

    if (status === 'suspended') {
      await pool.execute(
        `UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = (
          SELECT id FROM users WHERE public_id = ? LIMIT 1
        )
          AND revoked_at IS NULL`,
        [userId],
      )
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

async function deleteAdminUser(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const userId = String(request.params.id || '').trim()
    const [rows] = await connection.execute(
      `SELECT id, email
      FROM users
      WHERE public_id = ?
        AND deleted_at IS NULL
      LIMIT 1`,
      [userId],
    )
    const user = rows[0]

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy người dùng!',
      })
    }

    const deletedMarker = `deleted-${user.id}-${Date.now()}`

    await connection.beginTransaction()
    await connection.execute(
      `UPDATE users
      SET
        full_name = 'Tai khoan da xoa',
        display_name = NULL,
        email = ?,
        phone = NULL,
        avatar_url = NULL,
        bio = NULL,
        status_message = NULL,
        presence = 'offline',
        online_since = NULL,
        is_active = 0,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [`${deletedMarker}@deleted.local`, user.id],
    )
    await connection.execute(
      `UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND revoked_at IS NULL`,
      [user.id],
    )
    await connection.commit()

    response.json({
      message: 'Đã xóa người dùng khỏi hệ thống!',
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
  updateAdminUser,
}
