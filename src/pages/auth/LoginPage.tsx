import type { FormEvent } from 'react'
import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import type { AuthPageProps } from '../../types'
import loginBg from '../../bg-images/LoginBG.jpg'

type LoginPageProps = AuthPageProps

export function LoginPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFormFilled, setIsFormFilled] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  function handleFormChange(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '').trim()

    setIsFormFilled(email.length > 0 && password.length > 0)
  }

  useEffect(() => {
    if (errorMessage && recaptchaRef.current) {
      recaptchaRef.current.reset()
      setRecaptchaToken(null)
    }
  }, [errorMessage])

  function handleRecaptchaChange(token: string | null) {
    setRecaptchaToken(token)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!recaptchaToken) {
      return
    }

    const formData = new FormData(event.currentTarget)

    onSubmit({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      rememberLogin: String(formData.get('rememberLogin') === 'on'),
      recaptchaToken,
    })
  }

  return (
    <main 
      className="auth-shell"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <section 
        className="auth-card" 
        aria-labelledby="login-title"
      >
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={14} />
            Đăng nhập
          </span>
          <h1 id="login-title">Chào mừng trở lại!</h1>
          <p>Tiếp tục quản lý hội thoại khách hàng và đội nhóm của bạn.</p>
        </div>

        {errorMessage ? (
          <div className="auth-error-notice" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <form className="auth-form" onChange={handleFormChange} onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="login-email">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                id="login-email"
                autoComplete="email"
                name="email"
                placeholder="Nhập Email của bạn tại đây"
                required
                type="email"
              />
            </div>
          </label>

          <label className="auth-field" htmlFor="login-password">
            <span>Mật khẩu</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                id="login-password"
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
              onChange={handleRecaptchaChange}
            />
          </div>

          <button
            className="auth-primary"
            disabled={isSubmitting || !isFormFilled || !recaptchaToken}
            type="submit"
          >
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
