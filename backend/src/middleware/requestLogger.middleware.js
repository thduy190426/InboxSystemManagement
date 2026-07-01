const SENSITIVE_KEY_PATTERN = /password|token|authorization|cookie|secret|code|otp|refresh/i
const MAX_LOG_STRING_LENGTH = 1200
const MAX_LOG_ARRAY_LENGTH = 20

function truncateString(value) {
  if (value.length <= MAX_LOG_STRING_LENGTH) {
    return value
  }

  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}... [truncated ${value.length - MAX_LOG_STRING_LENGTH} chars]`
}

function sanitizeValue(value, key = '') {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
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

  console.info('[BE][REQUEST][START]', {
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
    const level = _response.statusCode >= 500 ? 'error' : _response.statusCode >= 400 ? 'warn' : 'info'
    const label = _response.statusCode >= 400 ? 'ERROR' : 'SUCCESS'

    console[level](`[BE][REQUEST][${label}]`, {
      requestId,
      method: request.method,
      url: request.originalUrl,
      statusCode: _response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      user: getUserContext(request),
      response: getResponsePayload(responsePayload),
    })
  })

  next()
}

module.exports = {
  logRequest,
  sanitizeValue,
}
