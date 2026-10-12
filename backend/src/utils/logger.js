const SENSITIVE_KEY_PATTERN = /password|token|authorization|cookie|secret|otp|refresh|verification_?code|backup_?codes?/i
const MAX_LOG_STRING_LENGTH = 1000

function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false
  if (key === 'statusCode' || key === 'status' || key === 'code' || key === 'errorCode') {
    return false
  }
  return SENSITIVE_KEY_PATTERN.test(key)
}

function truncateString(value) {
  if (typeof value !== 'string') return value
  if (value.length <= MAX_LOG_STRING_LENGTH) return value
  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}... [truncated ${value.length - MAX_LOG_STRING_LENGTH} chars]`
}

function sanitizeLogValue(value, key = '') {
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
    return value.slice(0, 20).map((item) => sanitizeLogValue(item))
  }

  return Object.entries(value).reduce((result, [entryKey, entryValue]) => {
    result[entryKey] = sanitizeLogValue(entryValue, entryKey)
    return result
  }, {})
}

const isProduction = process.env.NODE_ENV === 'production'
const isDebugEnabled = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug' || !isProduction

const logger = {
  debug(message, meta) {
    if (!isDebugEnabled) return
    if (meta !== undefined) {
      console.debug(`[DEBUG] ${message}`, sanitizeLogValue(meta))
    } else {
      console.debug(`[DEBUG] ${message}`)
    }
  },

  info(message, meta) {
    if (meta !== undefined) {
      console.info(`[INFO] ${message}`, sanitizeLogValue(meta))
    } else {
      console.info(`[INFO] ${message}`)
    }
  },

  warn(message, meta) {
    if (meta !== undefined) {
      console.warn(`[WARN] ${message}`, sanitizeLogValue(meta))
    } else {
      console.warn(`[WARN] ${message}`)
    }
  },

  error(message, errorOrMeta) {
    if (errorOrMeta instanceof Error) {
      console.error(`[ERROR] ${message}:`, errorOrMeta.message, errorOrMeta.stack || '')
    } else if (errorOrMeta !== undefined) {
      console.error(`[ERROR] ${message}`, sanitizeLogValue(errorOrMeta))
    } else {
      console.error(`[ERROR] ${message}`)
    }
  },

  sanitize: sanitizeLogValue,
}

module.exports = logger
