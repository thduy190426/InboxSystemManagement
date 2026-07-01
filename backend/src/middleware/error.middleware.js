const { sanitizeValue } = require('./requestLogger.middleware')

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

function logRequestError(error, request, statusCode) {
  console.error('[BE][ERROR][DETAIL]', {
    requestId: request.requestId,
    method: request.method,
    url: request.originalUrl,
    statusCode,
    user: getUserContext(request),
    message: error.message,
    name: error.name,
    code: error.code,
    details: sanitizeValue(error.details),
    stack: error.stack,
  })
}

function notFoundHandler(request, response) {
  console.warn('[BE][ERROR][NOT_FOUND]', {
    requestId: request.requestId,
    method: request.method,
    url: request.originalUrl,
    user: getUserContext(request),
  })

  response.status(404).json({
    message: `Tuyến đường ${request.method} ${request.originalUrl} không tìm thấy!`,
  })
}

function errorHandler(error, request, response, _next) {
  if (error.name === 'MulterError') {
    const isFileSizeError = error.code === 'LIMIT_FILE_SIZE'
    logRequestError(error, request, 422)

    return response.status(422).json({
      message: isFileSizeError
        ? 'File tải lên vượt quá dung lượng cho phép!'
        : 'Không thể xử lý file tải lên!',
    })
  }

  const statusCode = error.statusCode || 500
  logRequestError(error, request, statusCode)

  response.status(statusCode).json({
    message: error.message || 'Internal server error!',
    details: error.details,
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
