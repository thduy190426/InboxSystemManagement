const multer = require('multer')
const { v2: cloudinary } = require('cloudinary')

const avatarStorage = multer.memoryStorage()
const messageStorage = multer.memoryStorage()
const MESSAGE_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

function getCloudinaryFolder(folderName) {
  const rootFolder = process.env.CLOUDINARY_ROOT_FOLDER || 'inbox-system-management'

  return `${rootFolder}/${folderName}`
}

function assertCloudinaryConfigured() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const error = new Error('Cloudinary chua duoc cau hinh. Vui long kiem tra bien moi truong!')
    error.statusCode = 500
    throw error
  }
}

function imageFileFilter(_request, file, callback) {
  if (!file.mimetype.startsWith('image/')) {
    callback(new Error('Chỉ hỗ trợ upload file ảnh!'))
    return
  }

  callback(null, true)
}

function messageFileFilter(_request, file, callback) {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('audio/')) {
    callback(new Error('Chỉ hỗ trợ gửi ảnh hoặc tin nhắn thoại trong cuộc trò chuyện!'))
    return
  }

  callback(null, true)
}

function uploadBufferToCloudinary(file, options) {
  assertCloudinaryConfigured()

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resourceType,
        folder: getCloudinaryFolder(options.folder),
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve(result)
      },
    )

    uploadStream.end(file.buffer)
  })
}

function cloudinaryUploadMiddleware(options) {
  return async (request, _response, next) => {
    if (!request.file) {
      next()
      return
    }

    try {
      const result = await uploadBufferToCloudinary(request.file, options)

      request.file.cloudinary = {
        publicId: result.public_id,
        resourceType: result.resource_type,
        secureUrl: result.secure_url,
        url: result.secure_url || result.url,
        format: result.format || null,
        bytes: result.bytes || request.file.size,
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

const avatarMulter = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MESSAGE_UPLOAD_SIZE_BYTES,
  },
})

const messageMulter = multer({
  storage: messageStorage,
  fileFilter: messageFileFilter,
  limits: {
    fileSize: MESSAGE_UPLOAD_SIZE_BYTES,
  },
})

const avatarUpload = {
  single(fieldName) {
    return [
      avatarMulter.single(fieldName),
      cloudinaryUploadMiddleware({
        folder: 'avatars',
        resourceType: 'image',
      }),
    ]
  },
}

const messageUpload = {
  single(fieldName) {
    return [
      messageMulter.single(fieldName),
      cloudinaryUploadMiddleware({
        folder: 'messages',
        resourceType: 'auto',
      }),
    ]
  },
}

module.exports = {
  avatarUpload,
  messageUpload,
}
