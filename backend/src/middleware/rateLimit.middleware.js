const buckets = new Map()

function getClientIp(request) {
  const forwardedFor = request.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.ip || request.socket?.remoteAddress || 'unknown'
}

/**
 * Dọn dẹp các bucket hết hạn để tránh rò rỉ bộ nhớ (Memory Leak)
 */
function cleanupExpiredBuckets(maxIdleTimeMs = 15 * 60 * 1000) {
  const now = Date.now()
  for (const [key, timestamps] of buckets.entries()) {
    if (!Array.isArray(timestamps) || timestamps.length === 0) {
      buckets.delete(key)
      continue
    }

    const newestHit = timestamps[timestamps.length - 1]
    if (now - newestHit >= maxIdleTimeMs) {
      buckets.delete(key)
    }
  }
}

// Chạy dọn dẹp định kỳ mỗi 5 phút một lần
const cleanupInterval = setInterval(() => {
  cleanupExpiredBuckets()
}, 5 * 60 * 1000)

if (cleanupInterval.unref) {
  cleanupInterval.unref()
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
      response.setHeader('X-RateLimit-Limit', String(limit))
      response.setHeader('X-RateLimit-Remaining', '0')
      return response.status(429).json({
        message,
        retryAfterSeconds,
      })
    }

    recentHits.push(now)
    buckets.set(key, recentHits)

    response.setHeader('X-RateLimit-Limit', String(limit))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - recentHits.length)))

    next()
  }
}

const authRateLimitKey = (request) => `ip:${getClientIp(request)}`
const userRateLimitKey = (request) =>
  request.user?.id ? `user:${request.user.id}` : `ip:${getClientIp(request)}`

// --- 1. XÁC THỰC & BẢO MẬT (AUTH) ---
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

const oauthRateLimit = createRateLimiter({
  keyPrefix: 'auth:oauth',
  keyGenerator: authRateLimitKey,
  limit: 15,
  windowMs: 15 * 60 * 1000,
  message: 'Đăng nhập mạng xã hội quá nhanh. Vui lòng thử lại sau!',
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

const verificationRateLimit = createRateLimiter({
  keyPrefix: 'auth:verification',
  keyGenerator: authRateLimitKey,
  limit: 10,
  windowMs: 60 * 60 * 1000,
  message: 'Thử xác thực quá nhiều lần. Vui lòng thử lại sau!',
})

const resendVerificationRateLimit = createRateLimiter({
  keyPrefix: 'auth:resend-verification',
  keyGenerator: authRateLimitKey,
  limit: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Yêu cầu gửi lại mã quá nhiều lần. Vui lòng thử lại sau!',
})

const verify2FASetupRateLimit = createRateLimiter({
  keyPrefix: 'auth:verify-2fa',
  keyGenerator: userRateLimitKey,
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Thử mã xác thực 2FA quá nhiều lần. Vui lòng thử lại sau!',
})

const presenceRateLimit = createRateLimiter({
  keyPrefix: 'auth:presence',
  keyGenerator: userRateLimitKey,
  limit: 60,
  windowMs: 60 * 1000,
  message: 'Cập nhật trạng thái trực tuyến quá thường xuyên!',
})

// --- 2. BẢN TIN / STORY (HEAVY MEDIA) ---
const createStoryRateLimit = createRateLimiter({
  keyPrefix: 'stories:create',
  keyGenerator: userRateLimitKey,
  limit: 5,
  windowMs: 10 * 60 * 1000,
  message: 'Bạn đăng story quá nhanh. Vui lòng chờ vài phút rồi thử lại!',
})

// --- 3. TIN NHẮN & HỘI THOẠI (CONVERSATIONS) ---
const sendMessageRateLimit = createRateLimiter({
  keyPrefix: 'messages:create',
  keyGenerator: userRateLimitKey,
  limit: 20,
  windowMs: 60 * 1000,
  message: 'Gửi tin nhắn quá nhanh. Vui lòng thử lại sau!',
})

const attachmentUploadRateLimit = createRateLimiter({
  keyPrefix: 'messages:attachments',
  keyGenerator: userRateLimitKey,
  limit: 10,
  windowMs: 60 * 1000,
  message: 'Bạn tải tệp lên quá nhanh. Vui lòng chờ trong giây lát!',
})

const createConversationRateLimit = createRateLimiter({
  keyPrefix: 'conversations:direct',
  keyGenerator: userRateLimitKey,
  limit: 15,
  windowMs: 60 * 1000,
  message: 'Tạo cuộc trò chuyện quá nhanh. Vui lòng thử lại sau!',
})

const createGroupRateLimit = createRateLimiter({
  keyPrefix: 'conversations:create-group',
  keyGenerator: userRateLimitKey,
  limit: 5,
  windowMs: 10 * 60 * 1000,
  message: 'Bạn tạo nhóm quá nhiều lần. Vui lòng thử lại sau vài phút!',
})

const typingRateLimit = createRateLimiter({
  keyPrefix: 'conversations:typing',
  keyGenerator: userRateLimitKey,
  limit: 30,
  windowMs: 60 * 1000,
  message: 'Thao tác gõ phím quá nhanh!',
})

const reactionRateLimit = createRateLimiter({
  keyPrefix: 'conversations:reactions',
  keyGenerator: userRateLimitKey,
  limit: 60,
  windowMs: 60 * 1000,
  message: 'Thả cảm xúc quá nhanh. Vui lòng chậm lại một chút!',
})

const reportMessageRateLimit = createRateLimiter({
  keyPrefix: 'conversations:report',
  keyGenerator: userRateLimitKey,
  limit: 5,
  windowMs: 10 * 60 * 1000,
  message: 'Bạn gửi báo cáo quá nhiều lần. Vui lòng thử lại sau!',
})

const groupInviteRateLimit = createRateLimiter({
  keyPrefix: 'conversations:invite',
  keyGenerator: userRateLimitKey,
  limit: 10,
  windowMs: 5 * 60 * 1000,
  message: 'Thao tác mời hoặc tham gia nhóm quá nhanh. Vui lòng thử lại sau!',
})

// --- 4. DANH BẠ & TÌM KIẾM (CONTACTS & SEARCH) ---
const friendRequestRateLimit = createRateLimiter({
  keyPrefix: 'contacts:friend-request',
  keyGenerator: userRateLimitKey,
  limit: 10,
  windowMs: 60 * 1000,
  message: 'Bạn gửi lời mời kết bạn quá nhanh. Vui lòng đợi một lát!',
})

const searchRateLimit = createRateLimiter({
  keyPrefix: 'contacts:search',
  keyGenerator: userRateLimitKey,
  limit: 30,
  windowMs: 60 * 1000,
  message: 'Tìm kiếm quá nhiều lần. Vui lòng chậm lại một chút!',
})

// --- 5. TÀI KHOẢN & NGƯỜI DÙNG (USER & SETTINGS) ---
const changePasswordRateLimit = createRateLimiter({
  keyPrefix: 'user:change-password',
  keyGenerator: userRateLimitKey,
  limit: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau!',
})

const uploadAvatarRateLimit = createRateLimiter({
  keyPrefix: 'user:upload-avatar',
  keyGenerator: userRateLimitKey,
  limit: 3,
  windowMs: 60 * 1000,
  message: 'Bạn thay đổi ảnh đại diện quá nhiều lần. Vui lòng thử lại sau!',
})

const updateProfileRateLimit = createRateLimiter({
  keyPrefix: 'user:update-profile',
  keyGenerator: userRateLimitKey,
  limit: 20,
  windowMs: 60 * 1000,
  message: 'Cập nhật hồ sơ quá nhiều lần. Vui lòng chậm lại!',
})

// --- 6. TIỆN ÍCH NGOẠI VI (LINK PREVIEW) ---
const linkPreviewRateLimit = createRateLimiter({
  keyPrefix: 'utils:link-preview',
  keyGenerator: userRateLimitKey,
  limit: 15,
  windowMs: 60 * 1000,
  message: 'Tải trước liên kết quá nhanh. Vui lòng thử lại sau!',
})

// --- 7. TOÀN CỤC (GLOBAL) ---
const globalRateLimit = createRateLimiter({
  keyPrefix: 'global',
  keyGenerator: (request) => `ip:${getClientIp(request)}`,
  limit: 10000,
  windowMs: 15 * 60 * 1000,
  message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau!',
})

module.exports = {
  createRateLimiter,
  cleanupExpiredBuckets,
  _buckets: buckets,
  // Auth
  loginRateLimit,
  registerRateLimit,
  oauthRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  verificationRateLimit,
  resendVerificationRateLimit,
  verify2FASetupRateLimit,
  presenceRateLimit,
  // Story
  createStoryRateLimit,
  // Conversations
  sendMessageRateLimit,
  attachmentUploadRateLimit,
  createConversationRateLimit,
  createGroupRateLimit,
  typingRateLimit,
  reactionRateLimit,
  reportMessageRateLimit,
  groupInviteRateLimit,
  // Contacts & Search
  friendRequestRateLimit,
  searchRateLimit,
  // User & Settings
  changePasswordRateLimit,
  uploadAvatarRateLimit,
  updateProfileRateLimit,
  // Utilities
  linkPreviewRateLimit,
  // Global
  globalRateLimit,
}
