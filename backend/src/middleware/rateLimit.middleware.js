const buckets = new Map()

function getClientIp(request) {
  const forwardedFor = request.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.ip || request.socket.remoteAddress || 'unknown'
}

function createRateLimiter({
  limit,
  windowMs,
  keyPrefix,
  message = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau!',
  keyGenerator,
}) {
  return function rateLimiter(request, response, next) {
    const identity = keyGenerator
      ? keyGenerator(request)
      : request.user?.id
        ? `user:${request.user.id}`
        : `ip:${getClientIp(request)}`
    const key = `${keyPrefix}:${identity}`
    const now = Date.now()
    const bucket = buckets.get(key) || []
    const recentHits = bucket.filter((timestamp) => now - timestamp < windowMs)

    if (recentHits.length >= limit) {
      const oldestHit = recentHits[0]
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestHit)) / 1000))

      response.setHeader('Retry-After', String(retryAfterSeconds))
      return response.status(429).json({
        message,
        retryAfterSeconds,
      })
    }

    recentHits.push(now)
    buckets.set(key, recentHits)

    next()
  }
}

const authRateLimitKey = (request) => `ip:${getClientIp(request)}`
const userRateLimitKey = (request) =>
  request.user?.id ? `user:${request.user.id}` : `ip:${getClientIp(request)}`

const loginRateLimit = createRateLimiter({
  keyPrefix: 'auth:login',
  keyGenerator: authRateLimitKey,
  limit: 8,
  windowMs: 15 * 60 * 1000,
  message: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau!',
})

const registerRateLimit = createRateLimiter({
  keyPrefix: 'auth:register',
  keyGenerator: authRateLimitKey,
  limit: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Đăng ký quá nhiều lần. Vui lòng thử lại sau!',
})

const forgotPasswordRateLimit = createRateLimiter({
  keyPrefix: 'auth:forgot-password',
  keyGenerator: authRateLimitKey,
  limit: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau!',
})

const resetPasswordRateLimit = createRateLimiter({
  keyPrefix: 'auth:reset-password',
  keyGenerator: authRateLimitKey,
  limit: 10,
  windowMs: 60 * 60 * 1000,
  message: 'Thử đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau!',
})

const searchRateLimit = createRateLimiter({
  keyPrefix: 'contacts:search',
  keyGenerator: userRateLimitKey,
  limit: 30,
  windowMs: 60 * 1000,
  message: 'Tìm kiếm quá nhiều lần. Vui lòng chậm lại một chút!',
})

const sendMessageRateLimit = createRateLimiter({
  keyPrefix: 'messages:create',
  keyGenerator: userRateLimitKey,
  limit: 20,
  windowMs: 60 * 1000,
  message: 'Gửi tin nhắn quá nhanh. Vui lòng thử lại sau!',
})

module.exports = {
  createRateLimiter,
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resetPasswordRateLimit,
  searchRateLimit,
  sendMessageRateLimit,
}
