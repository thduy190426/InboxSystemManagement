import type { ProfilePayload } from '../services/api/userApi'

export const PROFILE_LIMITS = {
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,
  HANDLE_MIN: 3,
  HANDLE_MAX: 32,
  PHONE_MIN_DIGITS: 9,
  PHONE_MAX_DIGITS: 15,
  ADDRESS_MAX: 200,
  BIO_MAX: 300,
  STATUS_MESSAGE_MAX: 100,
  POST_CONTENT_MAX: 2000,
  POST_MAX_MEDIA: 10,
  COMMENT_CONTENT_MAX: 500,
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_COVER_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_MEDIA_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export type ProfileErrors = Partial<Record<keyof ProfilePayload, string>>

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

function defaultTranslate(key: string, options?: Record<string, unknown>): string {
  if (options && typeof options.defaultValue === 'string') {
    return options.defaultValue
  }
  return key
}

/**
 * Validate image file by MIME type and size limit
 */
export function validateImageFile(
  file: File,
  options: {
    maxSizeBytes?: number
    allowedTypes?: string[]
    label?: string
  } = {},
  t: TranslateFn = defaultTranslate,
): { isValid: boolean; error?: string } {
  const maxSizeBytes = options.maxSizeBytes ?? PROFILE_LIMITS.MAX_AVATAR_SIZE
  const allowedTypes = options.allowedTypes ?? ALLOWED_IMAGE_MIME_TYPES
  const label = options.label || 'ảnh'

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: t('errors.invalidImageType', {
        defaultValue: `Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF!`,
      }),
    }
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = Math.round(maxSizeBytes / (1024 * 1024))
    return {
      isValid: false,
      error: t('errors.imageTooLarge', {
        defaultValue: `Dung lượng ${label} không được vượt quá ${sizeMb}MB!`,
      }),
    }
  }

  return { isValid: true }
}

/**
 * Validate profile editing form inputs
 */
export function validateProfileForm(
  form: ProfilePayload,
  t: TranslateFn = defaultTranslate,
): { isValid: boolean; errors: ProfileErrors } {
  const errors: ProfileErrors = {}

  // 1. Display name validation
  const trimmedName = form.displayName ? form.displayName.trim() : ''
  if (!trimmedName) {
    errors.displayName = t('errors.displayNameRequired', {
      defaultValue: 'Vui lòng nhập tên hiển thị!',
    })
  } else if (trimmedName.length < PROFILE_LIMITS.DISPLAY_NAME_MIN) {
    errors.displayName = t('errors.displayNameTooShort', {
      defaultValue: `Tên hiển thị phải có ít nhất ${PROFILE_LIMITS.DISPLAY_NAME_MIN} ký tự!`,
    })
  } else if (trimmedName.length > PROFILE_LIMITS.DISPLAY_NAME_MAX) {
    errors.displayName = t('errors.displayNameTooLong', {
      defaultValue: `Tên hiển thị không được vượt quá ${PROFILE_LIMITS.DISPLAY_NAME_MAX} ký tự!`,
    })
  }

  // 2. Handle validation
  const trimmedHandle = form.handle ? form.handle.trim().toLowerCase() : ''
  if (trimmedHandle) {
    if (!/^[a-z0-9][a-z0-9._]{2,31}$/.test(trimmedHandle)) {
      errors.handle = t('errors.handleInvalid', {
        defaultValue: 'Tên định danh phải từ 3-32 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới!',
      })
    }
  }

  // 3. Phone validation
  const trimmedPhone = form.phone ? form.phone.trim() : ''
  if (trimmedPhone) {
    const cleanDigits = trimmedPhone.replace(/[\s().-]/g, '')
    const phoneRegex = /^[+]?[0-9]{9,15}$/
    if (!phoneRegex.test(cleanDigits)) {
      errors.phone = t('errors.phoneInvalid', {
        defaultValue: 'Số điện thoại không hợp lệ (từ 9 đến 15 chữ số)!',
      })
    }
  }

  // 4. Birth date validation
  if (form.birthDate) {
    const birthDateObj = new Date(form.birthDate)
    const now = new Date()

    if (isNaN(birthDateObj.getTime())) {
      errors.birthDate = t('errors.birthDateInvalid', {
        defaultValue: 'Ngày sinh không hợp lệ!',
      })
    } else if (birthDateObj.getTime() > now.getTime()) {
      errors.birthDate = t('errors.birthDateFuture', {
        defaultValue: 'Ngày sinh không được ở trong tương lai!',
      })
    } else if (birthDateObj.getFullYear() < 1900) {
      errors.birthDate = t('errors.birthDateTooOld', {
        defaultValue: 'Năm sinh không hợp lệ (phải từ năm 1900 trở lại đây)!',
      })
    } else {
      // Check minimum age: 6 years old
      const minAgeDate = new Date(now.getFullYear() - 6, now.getMonth(), now.getDate())
      if (birthDateObj > minAgeDate) {
        errors.birthDate = t('errors.birthDateTooYoung', {
          defaultValue: 'Bạn phải từ 6 tuổi trở lên!',
        })
      }
    }
  }

  // 5. Address validation
  if (form.address && form.address.length > PROFILE_LIMITS.ADDRESS_MAX) {
    errors.address = t('errors.addressTooLong', {
      defaultValue: `Địa chỉ không được vượt quá ${PROFILE_LIMITS.ADDRESS_MAX} ký tự!`,
    })
  }

  // 6. Bio validation
  if (form.bio && form.bio.length > PROFILE_LIMITS.BIO_MAX) {
    errors.bio = t('errors.bioTooLong', {
      defaultValue: `Tiểu sử không được vượt quá ${PROFILE_LIMITS.BIO_MAX} ký tự!`,
    })
  }

  // 7. Status message validation
  if (form.statusMessage && form.statusMessage.length > PROFILE_LIMITS.STATUS_MESSAGE_MAX) {
    errors.statusMessage = t('errors.statusMessageTooLong', {
      defaultValue: `Trạng thái không được vượt quá ${PROFILE_LIMITS.STATUS_MESSAGE_MAX} ký tự!`,
    })
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate post composer payload
 */
export function validatePostContent(
  content: string,
  mediaCount: number,
  t: TranslateFn = defaultTranslate,
): { isValid: boolean; error?: string } {
  const trimmed = content.trim()

  if (!trimmed && mediaCount === 0) {
    return {
      isValid: false,
      error: t('errors.postEmpty', {
        defaultValue: 'Vui lòng nhập nội dung hoặc đính kèm ít nhất một hình ảnh!',
      }),
    }
  }

  if (trimmed.length > PROFILE_LIMITS.POST_CONTENT_MAX) {
    return {
      isValid: false,
      error: t('errors.postContentTooLong', {
        defaultValue: `Nội dung bài viết không được vượt quá ${PROFILE_LIMITS.POST_CONTENT_MAX} ký tự!`,
      }),
    }
  }

  if (mediaCount > PROFILE_LIMITS.POST_MAX_MEDIA) {
    return {
      isValid: false,
      error: t('errors.postMediaTooMany', {
        defaultValue: `Mỗi bài viết chỉ được đính kèm tối đa ${PROFILE_LIMITS.POST_MAX_MEDIA} hình ảnh!`,
      }),
    }
  }

  return { isValid: true }
}

/**
 * Validate post comment
 */
export function validateCommentContent(
  content: string,
  t: TranslateFn = defaultTranslate,
): { isValid: boolean; error?: string } {
  const trimmed = content.trim()

  if (!trimmed) {
    return {
      isValid: false,
      error: t('errors.commentEmpty', {
        defaultValue: 'Bình luận không được để trống!',
      }),
    }
  }

  if (trimmed.length > PROFILE_LIMITS.COMMENT_CONTENT_MAX) {
    return {
      isValid: false,
      error: t('errors.commentTooLong', {
        defaultValue: `Bình luận không được vượt quá ${PROFILE_LIMITS.COMMENT_CONTENT_MAX} ký tự!`,
      }),
    }
  }

  return { isValid: true }
}
