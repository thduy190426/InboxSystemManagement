import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Mail, Send } from 'lucide-react'
import type { AuthPageProps } from '../../types'

type ForgotPasswordPageProps = AuthPageProps & {
  onResetPassword: () => void
  resetCode?: string
  successMessage?: string
}

export function ForgotPasswordPage({
  errorMessage,
  isSubmitting = false,
  onResetPassword,
  onSubmit,
  onSwitchMode,
  resetCode,
  successMessage,
}: ForgotPasswordPageProps) {
  const [cooldown, setCooldown] = useState(0)
  const prevSuccessMessage = useRef(successMessage)

  useEffect(() => {
    if (successMessage && successMessage !== prevSuccessMessage.current) {
      setCooldown(60)
      const timer = setTimeout(() => {
        onResetPassword()
      }, 1500)
      prevSuccessMessage.current = successMessage
      return () => clearTimeout(timer)
    }
    prevSuccessMessage.current = successMessage
  }, [successMessage, onResetPassword])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    onSubmit({
      email: String(formData.get('email') ?? '').trim().toLowerCase(),
    })
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <KeyRound size={14} />
            Quên mật khẩu
          </span>
          <h1 id="forgot-password-title">Khôi phục quyền truy cập</h1>
          <p>Nhập email tài khoản để nhận mã đặt lại mật khẩu còn hiệu lực trong 30 phút.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="email"
                maxLength={190}
                name="email"
                placeholder="Nhập email của bạn tại đây"
                required
                type="email"
              />
            </div>
          </label>


          {resetCode ? (
            <p className="auth-reset-code">
              Mã đặt lại mật khẩu: <strong>{resetCode}</strong>
            </p>
          ) : null}
          {successMessage ? (
            <button className="auth-action-button" onClick={onResetPassword} type="button">
              Nhập mã đặt lại <ArrowRight size={16} />
            </button>
          ) : null}
          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button className="auth-primary" disabled={isSubmitting || cooldown > 0} type="submit">
            <Send size={18} />
            {isSubmitting ? 'Đang gửi mã...' : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi mã đặt lại'}
          </button>
        </form>

        <p className="auth-switch">
          Đã nhớ mật khẩu?
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            <ArrowLeft size={16} />
            Đăng nhập
          </button>
        </p>
      </section>
    </main>
  )
}
