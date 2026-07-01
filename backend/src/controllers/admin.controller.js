const { pool } = require('../config/db')

const ALLOWED_ROLES = new Set(['user', 'agent', 'owner'])
const ALLOWED_REPORT_STATUSES = new Set(['pending', 'reviewed', 'dismissed'])
const MAX_PAGE_SIZE = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const messageReportsTableReady = pool
  .execute(
    `CREATE TABLE IF NOT EXISTS message_reports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      public_id CHAR(36) NOT NULL,
      message_id BIGINT UNSIGNED NOT NULL,
      conversation_id BIGINT UNSIGNED NOT NULL,
      reporter_id BIGINT UNSIGNED NOT NULL,
      reported_user_id BIGINT UNSIGNED NOT NULL,
      reason VARCHAR(255) NULL,
      status ENUM('pending', 'reviewed', 'dismissed') NOT NULL DEFAULT 'pending',
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_message_reports_public_id (public_id),
      UNIQUE KEY uq_message_reports_message_reporter (message_id, reporter_id),
      INDEX idx_message_reports_status_created (status, created_at),
      INDEX idx_message_reports_reporter (reporter_id, created_at),
      INDEX idx_message_reports_reported_user (reported_user_id, created_at)
    )`,
  )
  .catch((error) => {
    console.error('Không thể đảm bảo bảng message_reports:', error)
    throw error
  })

async function ensureMessageReportsTable() {
  await messageReportsTableReady
}

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

function toMessageReport(row) {
  return {
    id: row.public_id,
    status: row.status,
    reason: row.reason,
    messageId: String(row.message_id),
    messageText: row.message_text || '',
    messageType: row.message_type,
    conversationId: String(row.conversation_id),
    conversationName: row.conversation_name || 'Hoi thoai',
    reporter: {
      id: row.reporter_public_id,
      name: row.reporter_name,
      email: row.reporter_email,
    },
    reportedUser: {
      id: row.reported_public_id,
      name: row.reported_name,
      email: row.reported_email,
    },
    reviewedBy: row.reviewer_public_id
      ? {
          id: row.reviewer_public_id,
          name: row.reviewer_name,
        }
      : null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getAdminStats(_request, response, next) {
  try {
    await ensureMessageReportsTable()

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
        `SELECT
          (
            SELECT COUNT(*)
            FROM notifications
            WHERE type = 'system'
              AND read_at IS NULL
          ) + (
            SELECT COUNT(*)
            FROM message_reports
            WHERE status = 'pending'
          ) AS unread_system_alerts`,
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

async function getMessageReports(request, response, next) {
  try {
    await ensureMessageReportsTable()

    const page = toPositiveInteger(request.query.page, 1)
    const limit = Math.min(toPositiveInteger(request.query.limit, 20), MAX_PAGE_SIZE)
    const offset = (page - 1) * limit
    const status = typeof request.query.status === 'string' ? request.query.status.trim() : ''
    const filters = []
    const params = []

    if (status && ALLOWED_REPORT_STATUSES.has(status)) {
      filters.push('message_reports.status = ?')
      params.push(status)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [[countRows], [reportRows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM message_reports
        ${whereClause}`,
        params,
      ),
      pool.execute(
        `SELECT
          message_reports.public_id,
          message_reports.message_id,
          message_reports.conversation_id,
          message_reports.reason,
          message_reports.status,
          message_reports.reviewed_at,
          message_reports.created_at,
          message_reports.updated_at,
          messages.body AS message_text,
          messages.type AS message_type,
          COALESCE(conversations.title, CONCAT('Hoi thoai #', conversations.id)) AS conversation_name,
          reporters.public_id AS reporter_public_id,
          reporters.full_name AS reporter_name,
          reporters.email AS reporter_email,
          reported_users.public_id AS reported_public_id,
          reported_users.full_name AS reported_name,
          reported_users.email AS reported_email,
          reviewers.public_id AS reviewer_public_id,
          reviewers.full_name AS reviewer_name
        FROM message_reports
        INNER JOIN messages ON messages.id = message_reports.message_id
        INNER JOIN conversations ON conversations.id = message_reports.conversation_id
        INNER JOIN users AS reporters ON reporters.id = message_reports.reporter_id
        INNER JOIN users AS reported_users ON reported_users.id = message_reports.reported_user_id
        LEFT JOIN users AS reviewers ON reviewers.id = message_reports.reviewed_by
        ${whereClause}
        ORDER BY
          CASE message_reports.status WHEN 'pending' THEN 0 ELSE 1 END,
          message_reports.created_at DESC,
          message_reports.id DESC
        LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ])

    const total = Number((countRows[0] && countRows[0].total) || 0)

    response.json({
      reports: reportRows.map(toMessageReport),
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

async function updateMessageReport(request, response, next) {
  try {
    await ensureMessageReportsTable()

    const reportId = String(request.params.id || '').trim()
    const status = String(request.body?.status || '').trim()

    if (!ALLOWED_REPORT_STATUSES.has(status) || status === 'pending') {
      return response.status(422).json({
        message: 'Trạng thái báo cáo không hợp lệ!',
      })
    }

    const [result] = await pool.execute(
      `UPDATE message_reports
      SET status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE public_id = ?`,
      [status, request.user.id, reportId],
    )

    if (!result.affectedRows) {
      return response.status(404).json({
        message: 'Không tìm thấy báo cáo!',
      })
    }

    const [rows] = await pool.execute(
      `SELECT
        message_reports.public_id,
        message_reports.message_id,
        message_reports.conversation_id,
        message_reports.reason,
        message_reports.status,
        message_reports.reviewed_at,
        message_reports.created_at,
        message_reports.updated_at,
        messages.body AS message_text,
        messages.type AS message_type,
        COALESCE(conversations.title, CONCAT('Hoi thoai #', conversations.id)) AS conversation_name,
        reporters.public_id AS reporter_public_id,
        reporters.full_name AS reporter_name,
        reporters.email AS reporter_email,
        reported_users.public_id AS reported_public_id,
        reported_users.full_name AS reported_name,
        reported_users.email AS reported_email,
        reviewers.public_id AS reviewer_public_id,
        reviewers.full_name AS reviewer_name
      FROM message_reports
      INNER JOIN messages ON messages.id = message_reports.message_id
      INNER JOIN conversations ON conversations.id = message_reports.conversation_id
      INNER JOIN users AS reporters ON reporters.id = message_reports.reporter_id
      INNER JOIN users AS reported_users ON reported_users.id = message_reports.reported_user_id
      LEFT JOIN users AS reviewers ON reviewers.id = message_reports.reviewed_by
      WHERE message_reports.public_id = ?
      LIMIT 1`,
      [reportId],
    )

    response.json({
      message: 'Đã cập nhật báo cáo!',
      report: toMessageReport(rows[0]),
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
  getMessageReports,
  lockAdminUser,
  unlockAdminUser,
  updateMessageReport,
  updateAdminUser,
}
