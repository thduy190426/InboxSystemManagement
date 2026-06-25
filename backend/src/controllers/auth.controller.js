const bcrypt = require('bcryptjs')
const { createHash, randomBytes, randomUUID } = require('crypto')
const { pool } = require('../config/db')
const { emitToUsers } = require('../realtime/socket')
const {
  validateLoginPayload,
  validateRegisterPayload,
} = require('../utils/validation')
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
    birthDate: row.birth_date,
    avatarUrl: row.avatar_url,
    role: row.role,
    presence: row.presence,
    isEmailVerified: Boolean(row.is_email_verified),
    lastSeenAt: row.last_seen_at,
    onlineSince: row.online_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function findExistingUser(email, phone) {
  const params = [email]
  let query = 'SELECT id, email, phone FROM users WHERE email = ?'

  if (phone) {
    query += ' OR phone = ?'
    params.push(phone)
  }

  const [rows] = await pool.execute(query, params)

  return rows[0] || null
}

async function getUserById(userId) {
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
      role,
      presence,
      is_email_verified,
      last_seen_at,
      online_since,
      created_at,
      updated_at
    FROM users
    WHERE id = ?`,
    [userId],
  )

  return rows[0] || null
}

async function getUserByEmail(email) {
  await ensureUserProfileColumns()

  const [rows] = await pool.execute(
    `SELECT
      id,
      public_id,
      full_name,
      display_name,
      email,
      phone,
      gender,
      address,
      birth_date,
      password_hash,
      avatar_url,
      role,
      presence,
      is_email_verified,
      is_active,
      last_seen_at,
      online_since,
      created_at,
      updated_at
    FROM users
    WHERE email = ? AND deleted_at IS NULL
    LIMIT 1`,
    [email],
  )

  return rows[0] || null
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function createRefreshToken() {
  return randomBytes(48).toString('hex')
}

function getTokenFromRequest(request) {
  const authorization = request.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')

  return scheme === 'Bearer' ? token : null
}

async function updateUserPresenceFromSessions(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS active_session_count
    FROM user_sessions
    WHERE user_id = ?
      AND revoked_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP`,
    [userId],
  )

  const hasActiveSession = Number(rows[0]?.active_session_count || 0) > 0

  await pool.execute(
    `UPDATE users
    SET presence = ?,
      last_seen_at = CURRENT_TIMESTAMP,
      online_since = IF(? = 'online', COALESCE(online_since, CURRENT_TIMESTAMP), NULL),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [hasActiveSession ? 'online' : 'offline', hasActiveSession ? 'online' : 'offline', userId],
  )

  await emitPresenceChanged(userId, hasActiveSession ? 'online' : 'offline')
}

async function emitPresenceChanged(userId, presence) {
  try {
    const [rows] = await pool.execute(
      `SELECT contact_user_id AS user_id
      FROM contacts
      WHERE owner_user_id = ? AND status = 'accepted'`,
      [userId],
    )

    emitToUsers(
      rows.map((row) => Number(row.user_id)),
      'presence:changed',
      {
        userId: String(userId),
        presence,
      },
    )
  } catch (error) {
    console.error('Failed to emit presence realtime event:', error)
  }
}

async function createUserSession(userId, request) {
  const refreshToken = createRefreshToken()
  const refreshTokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  const deviceName = request.get('x-device-name') || null
  const userAgent = request.get('user-agent') || null
  const ipAddress = request.ip || null

  await pool.execute(
    `INSERT INTO user_sessions (
      user_id,
      refresh_token_hash,
      device_name,
      ip_address,
      user_agent,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, refreshTokenHash, deviceName, ipAddress, userAgent, expiresAt],
  )

  return {
    refreshToken,
    expiresAt,
  }
}

async function register(request, response, next) {
  try {
    const validation = validateRegisterPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu đăng kí không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { fullName, email, phone, password } = validation.data
    const existingUser = await findExistingUser(email, phone)

    if (existingUser) {
      const errors = {}

      if (existingUser.email === email) {
        errors.email = 'Email đã được sử dụng!'
      }

      if (phone && existingUser.phone === phone) {
        errors.phone = 'Số điện thoại đã được sử dụng!'
      }

      return response.status(409).json({
        message: 'Tài khoản đã tồn tại!',
        errors,
      })
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const publicId = randomUUID()

    const [result] = await pool.execute(
      `INSERT INTO users (
        public_id,
        full_name,
        display_name,
        email,
        phone,
        password_hash,
        presence,
        role,
        is_email_verified,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 'offline', 'user', 0, 1)`,
      [publicId, fullName, fullName, email, phone, passwordHash],
    )

    const createdUser = await getUserById(result.insertId)

    return response.status(201).json({
      message: 'Đăng kí tài khoản thành công!',
      user: toPublicUser(createdUser),
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409
      error.message = 'Email hoặc số điện thoại đã được sử dụng!'
    }

    next(error)
  }
}

async function login(request, response, next) {
  try {
    const validation = validateLoginPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu đăng nhập không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { email, password } = validation.data
    const user = await getUserByEmail(email)

    if (!user || !user.is_active) {
      return response.status(401).json({
        message: 'Email hoặc mật khẩu không đúng!',
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return response.status(401).json({
        message: 'Email hoặc mật khẩu không đúng!',
      })
    }

    const session = await createUserSession(user.id, request)

    await pool.execute(
      `UPDATE users
      SET presence = 'online',
        last_seen_at = CURRENT_TIMESTAMP,
        online_since = COALESCE(online_since, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [user.id],
    )
    await emitPresenceChanged(user.id, 'online')

    return response.json({
      message: 'Đăng nhập thành công!',
      user: toPublicUser({
        ...user,
        presence: 'online',
        online_since: user.online_since || new Date(),
      }),
      session: {
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function logout(request, response, next) {
  try {
    const token = getTokenFromRequest(request)

    if (token) {
      await pool.execute(
        `UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE refresh_token_hash = ? AND user_id = ?`,
        [hashToken(token), request.user.id],
      )
    }

    await updateUserPresenceFromSessions(request.user.id)

    response.json({
      message: 'Đăng xuất thành công!',
    })
  } catch (error) {
    next(error)
  }
}

async function touchPresence(request, response, next) {
  try {
    await pool.execute(
      `UPDATE users
      SET presence = 'online',
        last_seen_at = CURRENT_TIMESTAMP,
        online_since = COALESCE(online_since, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [request.user.id],
    )
    await emitPresenceChanged(request.user.id, 'online')

    response.json({
      presence: 'online',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  login,
  logout,
  register,
  touchPresence,
}