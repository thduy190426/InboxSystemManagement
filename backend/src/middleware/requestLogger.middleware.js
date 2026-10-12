const logger = require('../utils/logger')
const SENSITIVE_KEY_PATTERN = /password|token|authorization|cookie|secret|otp|refresh|verification_?code|backup_?codes?/i
const MAX_LOG_STRING_LENGTH = 1200
const MAX_LOG_ARRAY_LENGTH = 20

const isProduction = process.env.NODE_ENV === 'production'
const isDebug = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug'

function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false
  if (key === 'statusCode' || key === 'status' || key === 'code' || key === 'errorCode') {
    return false
  }
  return SENSITIVE_KEY_PATTERN.test(key)
}

function truncateString(value) {
  if (value.length <= MAX_LOG_STRING_LENGTH) {
    return value
  }

  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}... [truncated ${value.length - MAX_LOG_STRING_LENGTH} chars]`
}

function sanitizeValue(value, key = '') {
  if (isSensitiveKey(key)) {
    return '[REDACTED]'
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return truncateString(value)
  }

  if (typeof value !== 'object') {
    return value
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_LOG_ARRAY_LENGTH).map((item) => sanitizeValue(item))
  }

  return Object.entries(value).reduce((result, [entryKey, entryValue]) => {
    result[entryKey] = sanitizeValue(entryValue, entryKey)
    return result
  }, {})
}

function sanitizeHeaders(headers) {
  return sanitizeValue({
    authorization: headers.authorization,
    'content-type': headers['content-type'],
    origin: headers.origin,
    referer: headers.referer,
    'user-agent': headers['user-agent'],
    'x-forwarded-for': headers['x-forwarded-for'],
  })
}

function getRequestIp(request) {
  const forwardedFor = request.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.ip || request.socket?.remoteAddress || null
}

function getUserContext(request) {
  if (!request.user) {
    return null
  }

  return {
    id: request.user.public_id || request.user.id,
    email: request.user.email,
    role: request.user.role,
  }
}

function getResponsePayload(payload) {
  if (payload === undefined) {
    return undefined
  }

  if (Buffer.isBuffer(payload)) {
    return `[Buffer ${payload.length} bytes]`
  }

  if (typeof payload === 'string') {
    try {
      return sanitizeValue(JSON.parse(payload))
    } catch (_error) {
      return truncateString(payload)
    }
  }

  return sanitizeValue(payload)
}

function logRequest(request, _response, next) {
  const isSpammy = request.originalUrl.includes('/typing') || request.originalUrl.includes('/presence') || request.originalUrl.includes('/stats')
  
  if (isSpammy) {
    return next()
  }

  const startedAt = process.hrtime.bigint()
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const originalJson = _response.json.bind(_response)
  const originalSend = _response.send.bind(_response)
  let responsePayload

  request.requestId = requestId

  _response.json = (payload) => {
    responsePayload = payload
    return originalJson(payload)
  }

  _response.send = (payload) => {
    if (responsePayload === undefined) {
      responsePayload = payload
    }

    return originalSend(payload)
  }

  logger.debug('[BE][REQUEST][START]', {
    requestId,
    method: request.method,
    url: request.originalUrl,
    ip: getRequestIp(request),
    headers: sanitizeHeaders(request.headers),
    query: sanitizeValue(request.query),
    body: sanitizeValue(request.body),
  })

  _response.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const statusCode = _response.statusCode
    const isError = statusCode >= 400
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const label = isError ? 'ERROR' : 'SUCCESS'

    const logData = {
      requestId,
      method: request.method,
      url: request.originalUrl,
      statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      user: getUserContext(request),
    }

    if (isError || !isProduction || isDebug) {
      logData.response = getResponsePayload(responsePayload)
      if (isError) {
        logData.query = sanitizeValue(request.query)
        logData.body = sanitizeValue(request.body)
      }
    }

    logger[level](`[BE][REQUEST][${label}]`, logData)
  })

  next()
}

module.exports = {
  logRequest,
  sanitizeValue,
}
