import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw } from 'lucide-react'
import type { AuthPageProps } from '../types'

type ResetPasswordErrors = Partial<Record<'email' | 'token' | 'password' | 'confirmPassword', string>>

function getResetParamsFromLocation() {
  const params = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.split('?')[1]
  const hashParams = hashQuery ? new URLSearchParams(hashQuery) : null

  return {
    email: params.get('email') || hashParams?.get('email') || '',
    token: params.get('token') || hashParams?.get('token') || '',
  }
}

function validateResetPasswordForm(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const token = String(formData.get('token') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  const errors: ResetPasswordErrors = {}
  const passwordRequirements = [
    password.length >= 8 || 'ít nhất 8 ký tự',
    password.length <= 72 || 'không quá 72 ký tự',
    !/\s/.test(password) || 'không chứa khoảng trắng',
    /[a-z]/.test(password) || 'có chữ thường',
    /[A-Z]/.test(password) || 'có chữ hoa',
    /[0-9]/.test(password) || 'có chữ số',
    /[^A-Za-z0-9]/.test(password) || 'có ký tự đặc biệt',
  ].filter((requirement): requirement is string => typeof requirement === 'string')

  if (!email) {
    errors.email = 'Vui lòng nhập email tài khoản.'
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
    errors.email = 'Email chưa đúng định dạng.'
  }

  if (!token) {
    errors.token = 'Vui lòng nhập mã đặt lại mật khẩu.'
  } else if (!/^[0-9]{6}$/.test(token)) {
    errors.token = 'Mã đặt lại mật khẩu phải gồm 6 chữ số.'
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu mới.'
  } else if (passwordRequirements.length) {
    errors.password = `Mật khẩu mới cần ${passwordRequirements.join(', ')}.`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới.'
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Mật khẩu mới xác nhận không khớp.'
  }

  return {
    data: {
      email,
      token,
      password,
      confirmPassword,
    },
    errors,
  }
}

export function ResetPasswordPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
}: AuthPageProps) {
  const resetParams = useMemo(() => getResetParamsFromLocation(), [])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validateResetPasswordForm(new FormData(event.currentTarget))

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors)
      setLocalError('Vui lòng kiểm tra lại mật khẩu mới.')
      return
    }

    setFieldErrors({})
    setLocalError('')
    onSubmit(validation.data)
  }

  const visibleError = localError || errorMessage

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} />
            Đặt lại mật khẩu
          </span>
          <h1 id="reset-password-title">Tạo mật khẩu mới</h1>
          <p>Nhập email, mã 6 số đã gửi qua email và mật khẩu mới của bạn.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="email"
                defaultValue={resetParams.email}
                maxLength={190}
                name="email"
                placeholder="Nhập email của bạn tại đây"
                required
                type="email"
              />
            </div>
            {fieldErrors.email ? <span className="auth-field-error">{fieldErrors.email}</span> : null}
          </label>

          <label className="auth-field">
            <span>Mã đặt lại mật khẩu</span>
            <div className="auth-input-row">
              <KeyRound size={18} />
              <input
                autoComplete="one-time-code"
                defaultValue={resetParams.token}
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="token"
                pattern="[0-9]{6}"
                placeholder="Nhập mã 6 chữ số"
                required
                type="text"
              />
            </div>
            {fieldErrors.token ? <span className="auth-field-error">{fieldErrors.token}</span> : null}
          </label>

          <label className="auth-field">
            <span>Mật khẩu mới</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder="Nhập mật khẩu mới"
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
            <span>Xác nhận mật khẩu mới</span>
            <div className="auth-input-row">
              <KeyRound size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu mới"
                required
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
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

          {visibleError ? <p className="auth-error">{visibleError}</p> : null}

          <button className="auth-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p className="auth-switch">
          Quay lại
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            <ArrowLeft size={16} />
            Đăng nhập
          </button>
        </p>
      </section>
    </main>
  )
}
