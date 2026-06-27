import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Mail, Send } from 'lucide-react'
import type { AuthPageProps } from '../types'

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

          <button className="auth-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang gửi mã...' : 'Gửi mã đặt lại'}
            <Send size={18} />
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
