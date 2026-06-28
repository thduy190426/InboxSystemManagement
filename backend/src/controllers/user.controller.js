const bcrypt = require('bcryptjs')
const { createHash } = require('crypto')
const { pool } = require('../config/db')
const { validateChangePasswordPayload } = require('../utils/validation')
const { ensureUserProfileColumns } = require('../utils/userProfileColumns')

function toPublicUser(row) {
  return {
    id: row.public_id,
    fullName: row.full_name,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    address: row.address,
    birthDate: formatDateOnly(row.birth_date),
    avatarUrl: row.avatar_url,
    bio: row.bio,
    statusMessage: row.status_message,
    role: row.role,
    presence: row.presence,
    isEmailVerified: Boolean(row.is_email_verified),
    lastSeenAt: row.last_seen_at,
    onlineSince: row.online_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function formatDateOnly(value) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  return null
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function getTokenFromRequest(request) {
  const authorization = request.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')

  return scheme === 'Bearer' ? token : null
}

async function getCurrentUser(userId) {
  await ensureUserProfileColumns()

  const [rows] = await pool.execute(
    `SELECT
      public_id,
      full_name,
      display_name,
      email,
      phone,
      gender,
      address,
      birth_date,
      avatar_url,
      bio,
      status_message,
      role,
      presence,
      is_email_verified,
      last_seen_at,
      online_since,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId],
  )

  return rows[0] || null
}

async function getUserPasswordRecord(userId) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      full_name,
      email,
      password_hash
    FROM users
    WHERE id = ?
      AND is_active = 1
      AND deleted_at IS NULL
    LIMIT 1`,
    [userId],
  )

  return rows[0] || null
}

function normalizeRequiredString(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function normalizeBirthDate(value) {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (!normalized) {
    return { error: 'Ngày sinh là bắt buộc!' }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return { error: 'Ngày sinh không hợp lệ!' }
  }

  const date = new Date(`${normalized}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    return { error: 'Ngày sinh không hợp lệ!' }
  }

  if (normalized > new Date().toISOString().slice(0, 10)) {
    return { error: 'Ngày sinh không được lớn hơn ngày hiện tại!' }
  }

  return { value: normalized }
}

function validateProfilePayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const displayName = normalizeRequiredString(source.displayName)
  const phone = normalizeRequiredString(source.phone)
  const gender = normalizeRequiredString(source.gender)
  const address = normalizeRequiredString(source.address)
  const birthDate = normalizeBirthDate(source.birthDate)
  const bio = normalizeRequiredString(source.bio)
  const statusMessage = normalizeRequiredString(source.statusMessage)
  const errors = {}
  const allowedGenders = new Set(['male', 'female', 'other', 'prefer_not_to_say'])

  if (!displayName) {
    errors.displayName = 'Tên hiển thị là bắt buộc!'
  }

  if (!phone) {
    errors.phone = 'Số điện thoại là bắt buộc!'
  }

  if (!gender) {
    errors.gender = 'Giới tính là bắt buộc!'
  }

  if (!address) {
    errors.address = 'Địa chỉ là bắt buộc!'
  }

  if (!bio) {
    errors.bio = 'Giới thiệu là bắt buộc!'
  }

  if (!statusMessage) {
    errors.statusMessage = 'Trạng thái cá nhân là bắt buộc!'
  }

  if (displayName && displayName.length > 80) {
    errors.displayName = 'Tên hiển thị không được vượt quá 80 ký tự!'
  }

  if (phone && !/^\+?[0-9\s.-]{8,32}$/.test(phone)) {
    errors.phone = 'Số điện thoại không hợp lệ!'
  }

  if (gender && !allowedGenders.has(gender)) {
    errors.gender = 'Giới tính không hợp lệ!'
  }

  if (address && address.length > 255) {
    errors.address = 'Địa chỉ không được vượt quá 255 ký tự!'
  }

  if (birthDate.error) {
    errors.birthDate = birthDate.error
  }

  if (bio && bio.length > 255) {
    errors.bio = 'Giới thiệu không được vượt quá 255 ký tự!'
  }

  if (statusMessage && statusMessage.length > 120) {
    errors.statusMessage = 'Trạng thái không được vượt quá 120 ký tự!'
  }

  return {
    data: {
      displayName,
      phone,
      gender,
      address,
      birthDate: birthDate.value,
      bio,
      statusMessage,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

function validateDeleteAccountPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const password = typeof source.password === 'string' ? source.password : ''
  const confirmationText =
    typeof source.confirmationText === 'string' ? source.confirmationText.trim() : ''
  const errors = {}

  if (!password) {
    errors.password = 'Mật khẩu hiện tại là bắt buộc!'
  }

  if (confirmationText !== 'XOA TAI KHOAN') {
    errors.confirmationText = 'Vui lòng nhập chính xác XOA TAI KHOAN để xác nhận!'
  }

  return {
    data: {
      password,
      confirmationText,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

async function getProfile(request, response, next) {
  try {
    const user = await getCurrentUser(request.user.id)

    response.json({
      user: toPublicUser(user),
    })
  } catch (error) {
    next(error)
  }
}

async function updateProfile(request, response, next) {
  try {
    const validation = validateProfilePayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu hồ sơ không hợp lệ!',
        errors: validation.errors,
      })
    }

    await ensureUserProfileColumns()

    const { displayName, phone, gender, address, birthDate, bio, statusMessage } = validation.data

    try {
      await pool.execute(
        `UPDATE users
        SET
          display_name = ?,
          phone = ?,
          gender = ?,
          address = ?,
          birth_date = ?,
          bio = ?,
          status_message = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [displayName, phone, gender, address, birthDate, bio, statusMessage, request.user.id],
      )
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return response.status(409).json({
          message: 'Số điện thoại đã được sử dụng!',
          errors: {
            phone: 'Số điện thoại đã được sử dụng!',
          },
        })
      }

      throw error
    }

    const user = await getCurrentUser(request.user.id)

    response.json({
      message: 'Cập nhật hồ sơ thành công!',
      user: toPublicUser(user),
    })
  } catch (error) {
    next(error)
  }
}

async function updateAvatar(request, response, next) {
  try {
    if (!request.file) {
      return response.status(422).json({
        message: 'Vui lòng chọn ảnh đại diện!',
      })
    }

    const avatarUrl = request.file.cloudinary?.secureUrl || request.file.cloudinary?.url

    await pool.execute(
      `UPDATE users
      SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [avatarUrl, request.user.id],
    )

    const user = await getCurrentUser(request.user.id)

    response.json({
      message: 'Cập nhật ảnh đại diện thành công!',
      user: toPublicUser(user),
    })
  } catch (error) {
    next(error)
  }
}

async function changePassword(request, response, next) {
  try {
    const user = await getUserPasswordRecord(request.user.id)

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy tài khoản!',
      })
    }

    const validation = validateChangePasswordPayload(request.body, {
      fullName: user.full_name,
      email: user.email,
    })

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu đổi mật khẩu không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { currentPassword, newPassword } = validation.data
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)

    if (!isCurrentPasswordValid) {
      return response.status(401).json({
        message: 'Mật khẩu hiện tại không đúng!',
        errors: {
          currentPassword: 'Mật khẩu hiện tại không đúng!',
        },
      })
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)
    const refreshToken = getTokenFromRequest(request)
    const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null

    await pool.execute(
      `UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [passwordHash, request.user.id],
    )

    if (refreshTokenHash) {
      await pool.execute(
        `UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND refresh_token_hash <> ?
          AND revoked_at IS NULL`,
        [request.user.id, refreshTokenHash],
      )
    }

    response.json({
      message: 'Đổi mật khẩu thành công!',
    })
  } catch (error) {
    next(error)
  }
}

function toPublicSession(row, currentRefreshTokenHash) {
  return {
    id: String(row.id),
    deviceName: row.device_name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    isCurrent: currentRefreshTokenHash ? row.refresh_token_hash === currentRefreshTokenHash : false,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function listSessions(request, response, next) {
  try {
    const refreshToken = getTokenFromRequest(request)
    const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null
    const [rows] = await pool.execute(
      `SELECT
        id,
        refresh_token_hash,
        device_name,
        ip_address,
        user_agent,
        expires_at,
        revoked_at,
        created_at,
        updated_at
      FROM user_sessions
      WHERE user_id = ?
      ORDER BY revoked_at IS NULL DESC, updated_at DESC, created_at DESC`,
      [request.user.id],
    )

    response.json({
      sessions: rows.map((row) => toPublicSession(row, refreshTokenHash)),
    })
  } catch (error) {
    next(error)
  }
}

async function revokeSession(request, response, next) {
  try {
    const sessionId = Number(request.params.sessionId)

    if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
      return response.status(400).json({
        message: 'Phiên đăng nhập không hợp lệ!',
      })
    }

    const refreshToken = getTokenFromRequest(request)
    const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null
    const [rows] = await pool.execute(
      `SELECT id, refresh_token_hash, revoked_at
      FROM user_sessions
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
      [sessionId, request.user.id],
    )
    const session = rows[0] || null

    if (!session) {
      return response.status(404).json({
        message: 'Không tìm thấy phiên đăng nhập!',
      })
    }

    if (!session.revoked_at) {
      await pool.execute(
        `UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`,
        [sessionId, request.user.id],
      )
      await updateUserPresenceFromSessions(request.user.id)
    }

    response.json({
      message: 'Đã thu hồi phiên đăng nhập!',
      revokedSessionId: String(session.id),
      revokedCurrentSession: refreshTokenHash
        ? session.refresh_token_hash === refreshTokenHash
        : false,
    })
  } catch (error) {
    next(error)
  }
}

async function revokeOtherSessions(request, response, next) {
  try {
    const refreshToken = getTokenFromRequest(request)
    const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null

    if (!refreshTokenHash) {
      return response.status(401).json({
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn!',
      })
    }

    const [result] = await pool.execute(
      `UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND refresh_token_hash <> ?
        AND revoked_at IS NULL`,
      [request.user.id, refreshTokenHash],
    )

    await updateUserPresenceFromSessions(request.user.id)

    response.json({
      message: 'Đã đăng xuất khỏi các thiết bị khác!',
      revokedCount: result.affectedRows || 0,
    })
  } catch (error) {
    next(error)
  }
}

async function deleteAccount(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const user = await getUserPasswordRecord(request.user.id)

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy tài khoản!',
      })
    }

    const validation = validateDeleteAccountPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu xác nhận xoá tài khoản không hợp lệ!',
        errors: validation.errors,
      })
    }

    const isPasswordValid = await bcrypt.compare(validation.data.password, user.password_hash)

    if (!isPasswordValid) {
      return response.status(401).json({
        message: 'Mật khẩu hiện tại không đúng!',
        errors: {
          password: 'Mật khẩu hiện tại không đúng!',
        },
      })
    }

    const deletedMarker = `deleted-${user.id}-${Date.now()}`

    await connection.beginTransaction()
    await connection.execute(
      `UPDATE users
      SET
        full_name = 'Tài khoản đã xoá',
        display_name = NULL,
        email = ?,
        phone = NULL,
        gender = NULL,
        address = NULL,
        birth_date = NULL,
        avatar_url = NULL,
        bio = NULL,
        status_message = NULL,
        presence = 'offline',
        online_since = NULL,
        is_active = 0,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [`${deletedMarker}@deleted.local`, request.user.id],
    )
    await connection.execute(
      `UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL`,
      [request.user.id],
    )
    await connection.commit()

    response.json({
      message: 'Tài khoản đã được xoá!',
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  changePassword,
  deleteAccount,
  getProfile,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  updateAvatar,
  updateProfile,
}
