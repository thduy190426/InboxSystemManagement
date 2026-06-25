import type { FormEvent } from 'react'
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import type { AuthPageProps } from '../types'

export function LoginPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
}: AuthPageProps) {
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    onSubmit({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      rememberLogin: String(formData.get('rememberLogin') === 'on'),
    })
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card-header">
          <span className="section-kicker">Đăng nhập</span>
          <h1 id="login-title">Chào mừng trở lại!</h1>
          <p>Tiếp tục quản lý hội thoại khách hàng và đội nhóm của bạn.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="username"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="current-password"
                minLength={6}
                name="password"
                placeholder="Nhập mật khẩu"
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
          </label>

          <div className="auth-form-row">
            <label className="auth-check">
              <input defaultChecked name="rememberLogin" type="checkbox" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <button className="auth-text-button" type="button">
              Quên mật khẩu?
            </button>
          </div>

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button className="auth-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản?
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            Tạo tài khoản mới
          </button>
        </p>
      </section>
    </main>
  )
}
