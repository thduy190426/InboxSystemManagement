const { createHash } = require('crypto')
const { pool } = require('../config/db')

const sessionCache = new Map()
const CACHE_TTL = 30000 
const MAX_CACHE_SIZE = 1000

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

    const hashedToken = hashToken(token)

    if (sessionCache.has(hashedToken)) {
      const cached = sessionCache.get(hashedToken)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        request.user = cached.user
        return next()
      } else {
        sessionCache.delete(hashedToken)
      }
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
      [hashedToken],
    )

    if (!rows[0]) {
      return response.status(401).json({
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn!',
      })
    }

    if (sessionCache.size >= MAX_CACHE_SIZE) {
      const firstKey = sessionCache.keys().next().value
      sessionCache.delete(firstKey)
    }

    sessionCache.set(hashedToken, {
      user: rows[0],
      timestamp: Date.now()
    })

    request.user = rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

function requireAdmin(request, response, next) {
  if (!request.user) {
    return response.status(401).json({
      message: 'Bạn cần đăng nhập để tiếp tục!',
    })
  }

  if (request.user.role !== 'admin') {
    return response.status(403).json({
      message: 'Bạn không có quyền truy cập khu vực quản trị!',
    })
  }

  next()
}

module.exports = {
  authenticate,
  requireAdmin,
}
