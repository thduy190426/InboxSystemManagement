import type { FormEvent } from 'react'
import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react'
import type { AuthPageProps } from '../types'

type RegisterPageProps = AuthPageProps & {
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type RegisterErrors = Partial<
  Record<'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword', string>
>

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const fullNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u
const phonePattern = /^\+?[0-9]{9,15}$/

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return normalizeText(value).toLowerCase()
}

function normalizePhone(value: FormDataEntryValue | null) {
  const phone = normalizeText(value)

  return phone ? phone.replace(/[()\s.-]/g, '') : ''
}

function validateRegisterForm(formData: FormData) {
  const fullName = normalizeText(formData.get('fullName'))
  const email = normalizeEmail(formData.get('email'))
  const phone = normalizePhone(formData.get('phone'))
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  const errors: RegisterErrors = {}

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên!'
  } else if (fullName.length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự!'
  } else if (fullName.length > 120) {
    errors.fullName = 'Họ và tên không được vượt quá 120 ký tự!'
  } else if (!fullNamePattern.test(fullName)) {
    errors.fullName = 'Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy!'
  }

  if (!email) {
    errors.email = 'Vui lòng nhập Email!'
  } else if (email.length > 190) {
    errors.email = 'Email không được vượt quá 190 ký tự!'
  } else if (!emailPattern.test(email)) {
    errors.email = 'Email chưa đúng định dạng!'
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = 'Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng dấu +!'
  }

  const passwordRequirements = [
    password.length >= 8 || 'ít nhất 8 ký tự!',
    password.length <= 72 || 'không quá 72 ký tự!',
    !/\s/.test(password) || 'không chứa khoảng trắng!',
    /[a-z]/.test(password) || 'có chữ thường!',
    /[A-Z]/.test(password) || 'có chữ hoa!',
    /[0-9]/.test(password) || 'có chữ số!',
    /[^A-Za-z0-9]/.test(password) || 'có ký tự đặc biệt!',
  ].filter((requirement): requirement is string => typeof requirement === 'string')

  const normalizedPassword = password.toLowerCase()
  const emailName = email.split('@')[0]
  const nameParts = fullName
    .toLowerCase()
    .split(' ')
    .filter((part) => part.length >= 3)

  if (emailName && normalizedPassword.includes(emailName)) {
    passwordRequirements.push('không chứa phần tên trong Email!')
  }

  if (nameParts.some((part) => normalizedPassword.includes(part))) {
    passwordRequirements.push('không chứa tên tài khoản!')
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu!'
  } else if (passwordRequirements.length) {
    errors.password = `Mật khẩu cần ${passwordRequirements.join(', ')}!`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu!'
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
  }
}

export function RegisterPage({
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
  pushToast,
}: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({})
  const [isFormFilled, setIsFormFilled] = useState(false)

  function handleFormChange(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get('fullName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '').trim()
    const confirmPassword = String(formData.get('confirmPassword') ?? '').trim()
    const terms = formData.get('terms')
    
    setIsFormFilled(
      fullName.length > 0 &&
      email.length > 0 &&
      password.length > 0 &&
      confirmPassword.length > 0 &&
      terms === 'on'
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validateRegisterForm(new FormData(event.currentTarget))

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors)
      pushToast('Vui lòng kiểm tra lại thông tin đăng kí!', 'error')
      return
    }

    setFieldErrors({})
    onSubmit(validation.data)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={14} />
            Đăng kí
          </span>
          <h1 id="register-title">Tạo tài khoản mới</h1>
          <p>Tạo tài khoản để bắt đầu quản lý chat ngay hôm nay!</p>
        </div>

        <form className="auth-form" onChange={handleFormChange} onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Họ và tên</span>
            <div className="auth-input-row">
              <User size={18} />
              <input
                autoComplete="name"
                maxLength={120}
                minLength={2}
                name="fullName"
                placeholder="Nhập họ và tên tại đây"
                required
                type="text"
              />
            </div>
            {fieldErrors.fullName ? (
              <span className="auth-field-error">{fieldErrors.fullName}</span>
            ) : null}
          </label>

          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="email"
                maxLength={190}
                name="email"
                placeholder="Nhập địa chỉ Email tại đây"
                required
                type="email"
              />
            </div>
            {fieldErrors.email ? <span className="auth-field-error">{fieldErrors.email}</span> : null}
          </label>

          <label className="auth-field">
            <span>Số điện thoại</span>
            <div className="auth-input-row">
              <Phone size={18} />
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={32}
                name="phone"
                placeholder="Nhập số điện thoại tại đây"
                type="tel"
              />
            </div>
            {fieldErrors.phone ? <span className="auth-field-error">{fieldErrors.phone}</span> : null}
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder="Nhập mật khẩu tại đây"
                required
                type={showPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password ? (
              <span className="auth-field-error">{fieldErrors.password}</span>
            ) : null}
          </label>

          <label className="auth-field">
            <span>Xác nhận mật khẩu</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu tại đây"
                required
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                aria-label={
                  showConfirmPassword
                    ? 'Ẩn mật khẩu xác nhận'
                    : 'Hiện mật khẩu xác nhận'
                }
                className="password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                title={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                type="button"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
            ) : null}
          </label>

          <label className="auth-check auth-policy">
            <input name="terms" required type="checkbox" />
            <span>
              Tôi đồng ý với{' '}
              <a href="/terms" target="_blank" rel="noreferrer">
                Điều khoản sử dụng
              </a>{' '}
              và{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">
                Chính sách bảo mật
              </a>
              .
            </span>
          </label>

          <button className="auth-primary" disabled={isSubmitting || !isFormFilled} type="submit">
            <UserPlus size={18} />
            {isSubmitting ? 'Đang đăng kí...' : 'Đăng kí'}
          </button>
        </form>

        <div className="auth-security">
          <ShieldCheck size={18} />
          <span>Dữ liệu đăng nhập được bảo vệ bằng xác thực bảo mật.</span>
        </div>

        <p className="auth-switch">
          Đã có tài khoản?
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            Đăng nhập
          </button>
        </p>
      </section>
    </main>
  )
}
