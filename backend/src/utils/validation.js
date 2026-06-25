const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const fullNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u
const phonePattern = /^\+?[0-9]{9,15}$/
const lowerCasePattern = /[a-z]/
const upperCasePattern = /[A-Z]/
const numberPattern = /[0-9]/
const specialCharacterPattern = /[^A-Za-z0-9]/
const whitespacePattern = /\s/

function normalizeString(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase()
}

function normalizePhone(value) {
  const phone = normalizeString(value)

  if (!phone) {
    return null
  }

  return phone.replace(/[()\s.-]/g, '')
}

function getPasswordErrors(password, fullName, email) {
  const errors = []

  if (password.length < 8) {
    errors.push('ít nhất 8 ký tự!')
  }

  if (password.length > 72) {
    errors.push('không vượt quá 72 ký tự!')
  }

  if (whitespacePattern.test(password)) {
    errors.push('không chứa khoảng trắng!')
  }

  if (!lowerCasePattern.test(password)) {
    errors.push('có chữ thường!')
  }

  if (!upperCasePattern.test(password)) {
    errors.push('có chữ hoa!')
  }

  if (!numberPattern.test(password)) {
    errors.push('có chữ số!')
  }

  if (!specialCharacterPattern.test(password)) {
    errors.push('có ký tự đặc biệt!')
  }

  const normalizedPassword = password.toLowerCase()
  const emailName = email.split('@')[0]
  const nameParts = fullName
    .toLowerCase()
    .split(' ')
    .filter((part) => part.length >= 3)

  if (emailName && normalizedPassword.includes(emailName)) {
    errors.push('không chứa phần tên trong email!')
  }

  if (nameParts.some((part) => normalizedPassword.includes(part))) {
    errors.push('không chứa tên tài khoản')
  }

  return errors
}

function validateRegisterPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const fullName = normalizeString(source.fullName)
  const email = normalizeEmail(source.email)
  const phone = normalizePhone(source.phone)
  const password = typeof source.password === 'string' ? source.password : ''
  const confirmPassword =
    typeof source.confirmPassword === 'string' ? source.confirmPassword : ''

  const errors = {}

  if (!fullName) {
    errors.fullName = 'Họ và tên là bắt buộc!'
  } else if (fullName.length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự!'
  } else if (fullName.length > 120) {
    errors.fullName = 'Họ và tên không được vượt quá 120 ký tự!'
  } else if (!fullNamePattern.test(fullName)) {
    errors.fullName = 'Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy!'
  }

  if (!email) {
    errors.email = 'Email là bắt buộc!'
  } else if (email.length > 190) {
    errors.email = 'Email không được vượt quá 190 ký tự!'
  } else if (!emailPattern.test(email)) {
    errors.email = 'Email không hợp lệ!'
  } else {
    const [localPart, domainPart] = email.split('@')

    if (!localPart || localPart.length > 64 || !domainPart || domainPart.length > 253) {
      errors.email = 'Email không hợp lệ!'
    }
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = 'Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng dấu +.'
  }

  if (!password) {
    errors.password = 'Mật khẩu là bắt buộc!'
  } else {
    const passwordErrors = getPasswordErrors(password, fullName, email)

    if (passwordErrors.length) {
      errors.password = `Mật khẩu phải ${passwordErrors.join(', ')}!`
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc!'
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp!'
  }

  return {
    data: {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

function validateLoginPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const email = normalizeEmail(source.email)
  const password = typeof source.password === 'string' ? source.password : ''

  const errors = {}

  if (!email) {
    errors.email = 'Email là bắt buộc!'
  } else if (!emailPattern.test(email)) {
    errors.email = 'Email không hợp lệ!'
  }

  if (!password) {
    errors.password = 'Mật khẩu là bắt buộc!'
  }

  return {
    data: {
      email,
      password,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

function validateChangePasswordPayload(payload, user = {}) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const currentPassword =
    typeof source.currentPassword === 'string' ? source.currentPassword : ''
  const newPassword = typeof source.newPassword === 'string' ? source.newPassword : ''
  const confirmNewPassword =
    typeof source.confirmNewPassword === 'string' ? source.confirmNewPassword : ''
  const errors = {}

  if (!currentPassword) {
    errors.currentPassword = 'Mật khẩu hiện tại là bắt buộc!'
  }

  if (!newPassword) {
    errors.newPassword = 'Mật khẩu mới là bắt buộc!'
  } else {
    const passwordErrors = getPasswordErrors(
      newPassword,
      normalizeString(user.fullName),
      normalizeEmail(user.email),
    )

    if (passwordErrors.length) {
      errors.newPassword = `Mật khẩu mới phải ${passwordErrors.join(', ')}!`
    } else if (currentPassword && currentPassword === newPassword) {
      errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại!'
    }
  }

  if (!confirmNewPassword) {
    errors.confirmNewPassword = 'Xác nhận mật khẩu mới là bắt buộc!'
  } else if (newPassword && confirmNewPassword !== newPassword) {
    errors.confirmNewPassword = 'Mật khẩu mới xác nhận không khớp!'
  }

  return {
    data: {
      currentPassword,
      newPassword,
      confirmNewPassword,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

module.exports = {
  validateChangePasswordPayload,
  validateLoginPayload,
  validateRegisterPayload,
}
