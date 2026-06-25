function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Route ${request.method} ${request.originalUrl} not found!`,
  })
}

function errorHandler(error, _request, response, _next) {
  if (error.name === 'MulterError') {
    const isFileSizeError = error.code === 'LIMIT_FILE_SIZE'

    return response.status(422).json({
      message: isFileSizeError
        ? 'File tải lên vượt quá dung lượng cho phép!'
        : 'Không thể xử lý file tải lên!',
    })
  }

  const statusCode = error.statusCode || 500

  response.status(statusCode).json({
    message: error.message || 'Internal server error!',
    details: error.details,
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
