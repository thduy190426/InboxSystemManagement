const bcrypt = require('bcryptjs')
const { createHash, randomBytes, randomUUID } = require('crypto')
const { pool } = require('../config/db')
const { emitToUsers } = require('../realtime/socket')
const {
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateRegisterPayload,
  validateResendVerificationPayload,
  validateResetPasswordPayload,
  validateVerificationPayload,
} = require('../utils/validation')
const { ensureUserProfileColumns } = require('../utils/userProfileColumns')
const { sendEmailVerificationCode } = require('../services/mail.service')

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
    isPhoneVerified: Boolean(row.is_phone_verified),
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
      is_phone_verified,
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
      is_phone_verified,
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

function createPasswordResetCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0')
}

function createVerificationCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0')
}

function hashPasswordResetCode(email, code) {
  return hashToken(`${email}:${code}`)
}

function hashVerificationCode(email, channel, code) {
  return hashToken(`${email}:${channel}:${code}`)
}

function getUnverifiedChannels(user) {
  return [
    !user.is_email_verified ? 'email' : null,
  ].filter(Boolean)
}

function isVerificationRequired(user) {
  return getUnverifiedChannels(user).length > 0
}

async function deliverEmailVerificationCode(payload) {
  try {
    return await sendEmailVerificationCode(payload)
  } catch (error) {
    console.error('Không thể gửi mã xác thực Email:', error)

    return {
      failed: true,
      skipped: false,
    }
  }
}

async function createVerificationToken({ userId, email, channel, code, connection = pool }) {
  const tokenHash = hashVerificationCode(email, channel, code)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

  await connection.execute(
    `UPDATE user_verification_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND channel = ? AND used_at IS NULL`,
    [userId, channel],
  )

  await connection.execute(
    `INSERT INTO user_verification_tokens (
      user_id,
      channel,
      token_hash,
      expires_at
    ) VALUES (?, ?, ?, ?)`,
    [userId, channel, tokenHash, expiresAt],
  )

  return expiresAt
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
    console.error('Không thể phát ra sự kiện hiện diện thời gian thực:', error)
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
  let connection

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
        errors.email = 'Email này đã được sử dụng!'
      }

      if (phone && existingUser.phone === phone) {
        errors.phone = 'Số điện thoại này đã được sử dụng!'
      }

      return response.status(409).json({
        message: 'Tài khoản đã tồn tại!',
        errors,
      })
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const publicId = randomUUID()

    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [result] = await connection.execute(
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
        is_phone_verified,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 'offline', 'user', 0, 0, 1)`,
      [publicId, fullName, fullName, email, phone, passwordHash],
    )

    const emailCode = createVerificationCode()

    await createVerificationToken({
      channel: 'email',
      code: emailCode,
      connection,
      email,
      userId: result.insertId,
    })


    await connection.commit()
    connection.release()
    connection = null

    const mailResult = await deliverEmailVerificationCode({
      code: emailCode,
      email,
      fullName,
    })
    const createdUser = await getUserById(result.insertId)

    return response.status(201).json({
      message: mailResult.failed
        ? 'Đăng ký tài khoản thành công nhưng chưa gửi được mã xác thực Email. Vui lòng bấm gửi lại mã sau ít phút.'
        : mailResult.skipped
          ? 'Đăng ký tài khoản thành công! Mã xác thực đang hiển thị ở môi trường phát triển.'
          : 'Đăng ký tài khoản thành công! Vui lòng kiểm tra Gmail để lấy mã xác thực.',
      user: toPublicUser(createdUser),
      verification: {
        requiredChannels: ['email'],
        emailCode: mailResult.skipped ? emailCode : null,
      },
    })
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => undefined)
      connection.release()
    }

    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409
      error.message = 'Email hoặc số điện thoại này đã được sử dụng!'
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

    if (isVerificationRequired(user)) {
      return response.status(403).json({
        message: 'Tài khoản chưa được xác thực. Vui lòng xác thực Email/Số điện thoại trước khi đăng nhập!',
        errors: {
          verification: getUnverifiedChannels(user),
        },
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

async function verifyAccount(request, response, next) {
  try {
    const validation = validateVerificationPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu xác thực không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { channel, code, email } = validation.data
    const user = await getUserByEmail(email)

    if (!user || !user.is_active) {
      return response.status(404).json({
        message: 'Không tìm thấy tài khoản cần xác thực!',
      })
    }

    if (channel === 'phone' && !user.phone) {
      return response.status(400).json({
        message: 'ài khoản chưa có số điện thoại để xác thực!',
      })
    }

    if (channel === 'email' && user.is_email_verified) {
      return response.json({
        message: 'Email này đã được xác thực trước đó!',
        user: toPublicUser(user),
        verification: { requiredChannels: getUnverifiedChannels(user) },
      })
    }

    if (channel === 'phone' && user.is_phone_verified) {
      return response.json({
        message: 'Số điện thoại này đã được xác thực trước đó!',
        user: toPublicUser(user),
        verification: { requiredChannels: getUnverifiedChannels(user) },
      })
    }

    const tokenHash = hashVerificationCode(email, channel, code)
    const [rows] = await pool.execute(
      `SELECT id, expires_at, used_at
      FROM user_verification_tokens
      WHERE user_id = ? AND channel = ? AND token_hash = ?
      LIMIT 1`,
      [user.id, channel, tokenHash],
    )
    const token = rows[0] || null

    if (!token || token.used_at || new Date(token.expires_at).getTime() <= Date.now()) {
      return response.status(400).json({
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!',
      })
    }

    await pool.execute(
      `UPDATE users
      SET ${channel === 'email' ? 'is_email_verified' : 'is_phone_verified'} = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [user.id],
    )

    await pool.execute(
      `UPDATE user_verification_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [token.id],
    )

    const updatedUser = await getUserByEmail(email)

    return response.json({
      message: channel === 'email' ? 'Xác thực Email thành công!' : 'Xác thực số điện thoại thành công!',
      user: toPublicUser(updatedUser),
      verification: {
        requiredChannels: getUnverifiedChannels(updatedUser),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function resendVerification(request, response, next) {
  try {
    const validation = validateResendVerificationPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu gửi lại mã không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { channel, email } = validation.data
    const user = await getUserByEmail(email)

    if (!user || !user.is_active) {
      return response.status(404).json({
        message: 'Không tìm thấy tài khoản cần xác thực!',
      })
    }

    if (channel === 'email' && user.is_email_verified) {
      return response.json({
        message: 'Email này đã được xác thực trước đó!',
      })
    }

    if (channel === 'phone' && (!user.phone || user.is_phone_verified)) {
      return response.json({
        message: user.phone ? 'Số điện thoại này đã được xác thực trước đó!' : 'Tài khoản chưa có số điện thoại để xác thực!',
      })
    }

    const code = createVerificationCode()
    await createVerificationToken({
      channel,
      code,
      email,
      userId: user.id,
    })

    const mailResult =
      channel === 'email'
        ? await deliverEmailVerificationCode({
            code,
            email,
            fullName: user.full_name,
          })
        : { skipped: true }

    return response.json({
      message:
        channel === 'email'
          ? mailResult.failed
            ? 'Chưa gửi được mã xác thực Email. Vui lòng thử lại sau ít phút.'
            : mailResult.skipped
              ? 'Đã tạo lại mã xác thực Email! Mã đang hiển thị ở môi trường phát triển.'
              : 'Đã gửi lại mã xác thực Email! Vui lòng kiểm tra Gmail.'
          : 'Đã tạo lại mã xác thực số điện thoại!',
      verificationCode: mailResult.skipped ? code : null,
    })
  } catch (error) {
    next(error)
  }
}

async function forgotPassword(request, response, next) {
  try {
    const validation = validateForgotPasswordPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu quên mật khẩu không hợp lệ!',
        errors: validation.errors,
      })
    }

    const { email } = validation.data
    const user = await getUserByEmail(email)
    let devResetCode = null

    if (user && user.is_active) {
      const code = createPasswordResetCode()
      const tokenHash = hashPasswordResetCode(email, code)
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

      await pool.execute(
        `UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND used_at IS NULL`,
        [user.id],
      )

      await pool.execute(
        `INSERT INTO password_reset_tokens (
          user_id,
          token_hash,
          expires_at
        ) VALUES (?, ?, ?)`,
        [user.id, tokenHash, expiresAt],
      )

      devResetCode = code
    }

    return response.json({
      message: 'Nếu Email tồn tại, hệ thống đã gửi mã đặt lại mật khẩu!',
      resetCode: devResetCode,
    })
  } catch (error) {
    next(error)
  }
}

async function resetPassword(request, response, next) {
  try {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const token = typeof request.body?.token === 'string' ? request.body.token.trim() : ''
    const tokenHash = email && token ? hashPasswordResetCode(email, token) : ''

    const [rows] = tokenHash
      ? await pool.execute(
          `SELECT
            password_reset_tokens.id,
            password_reset_tokens.user_id,
            password_reset_tokens.expires_at,
            password_reset_tokens.used_at,
            users.full_name,
            users.email,
            users.is_active
          FROM password_reset_tokens
          INNER JOIN users ON users.id = password_reset_tokens.user_id
          WHERE password_reset_tokens.token_hash = ?
            AND users.email = ?
            AND users.deleted_at IS NULL
          LIMIT 1`,
          [tokenHash, email],
        )
      : [[]]
    const resetToken = rows[0] || null
    const validation = validateResetPasswordPayload(request.body, {
      fullName: resetToken?.full_name || '',
      email: resetToken?.email || '',
    })

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu đặt lại mật khẩu không hợp lệ!',
        errors: validation.errors,
      })
    }

    if (
      !resetToken ||
      !resetToken.is_active ||
      resetToken.used_at ||
      new Date(resetToken.expires_at).getTime() <= Date.now()
    ) {
      return response.status(400).json({
        message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!',
      })
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const passwordHash = await bcrypt.hash(validation.data.password, saltRounds)

    await pool.execute(
      `UPDATE users
      SET password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [passwordHash, resetToken.user_id],
    )

    await pool.execute(
      `UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [resetToken.id],
    )

    await pool.execute(
      `UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL`,
      [resetToken.user_id],
    )

    await updateUserPresenceFromSessions(resetToken.user_id)

    return response.json({
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới!',
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
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  touchPresence,
  verifyAccount,
}
