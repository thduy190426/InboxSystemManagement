import type { FormEvent } from 'react'
import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useGoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import type { AuthPageProps } from '../../types'
import loginBg from '../../bg-images/LoginBG.jpg'

type LoginPageProps = AuthPageProps

export function LoginPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
  onGoogleLogin,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFormFilled, setIsFormFilled] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (onGoogleLogin) {
        await onGoogleLogin(tokenResponse.access_token)
      }
    },
    onError: () => {
      toast.error('Đăng nhập bằng Google thất bại. Vui lòng thử lại.')
    },
  })

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

        <div className="auth-divider">
          <span>Hoặc</span>
        </div>

        <button 
          className="auth-google-btn" 
          disabled={isSubmitting} 
          onClick={() => handleGoogleLogin()} 
          type="button"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '20px', height: '20px' }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          Đăng nhập bằng Google
        </button>

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

