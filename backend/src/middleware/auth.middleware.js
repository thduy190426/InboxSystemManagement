const { createHash } = require('crypto')
const { pool } = require('../config/db')

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function authenticate(request, response, next) {
  try {
    const authorization = request.get('authorization') || ''
    const [scheme, token] = authorization.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return response.status(401).json({
        message: 'Bạn cần đăng nhập để tiếp tục!',
      })
    }

    const [rows] = await pool.execute(
      `SELECT
        users.id,
        users.public_id,
        users.full_name,
        users.email,
        users.avatar_url,
        users.role,
        users.presence
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
      return response.status(401).json({
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn!',
      })
    }

    request.user = rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  authenticate,
}
