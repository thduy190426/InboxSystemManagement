import { useState, useEffect } from 'react'
import { ArrowRight, Lock, Mail, ArrowLeft, EyeOff, Eye, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import loginBg from '../../bg-images/LoginBG.jpg'
import { forgotPassword, resetPassword } from '../../services/api/authApi'

export interface ForgotPasswordPageProps {
  onBackToLogin: () => void
}

export function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const { t } = useTranslation('auth')
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer: number
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (step === 1) {
      if (!email) return
      setIsSubmitting(true)
      try {
        const res = await forgotPassword({ email })
        toast.success(res.message)
        if (res.resetCode) {
           setResetCode(res.resetCode)
        }
        setStep(2)
        setCountdown(60)
      } catch (err: any) {
        toast.error(err.message || 'Có lỗi xảy ra!')
        if (err.status === 429) {
          setCountdown(err.retryAfterSeconds || 60)
        }
      } finally {
        setIsSubmitting(false)
      }
    } else {
      if (!resetCode || !newPassword || !confirmNewPassword) return
      if (newPassword !== confirmNewPassword) {
        toast.error('Mật khẩu không khớp!')
        return
      }
      setIsSubmitting(true)
      try {
        const res = await resetPassword({ email, token: resetCode, password: newPassword, confirmPassword: confirmNewPassword })
        toast.success(res.message)
        
        // Return to login automatically after success
        setTimeout(() => {
          onBackToLogin()
        }, 1500)
      } catch (err: any) {
        toast.error(err.message || 'Có lỗi xảy ra!')
      } finally {
        setIsSubmitting(false)
      }
    }
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
        className="auth-card forgot-password-card" 
        aria-labelledby="forgot-password-title"
      >
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <KeyRound size={14} />
            Quên mật khẩu
          </span>
          <h1 id="forgot-password-title">Lấy lại mật khẩu</h1>
          <p>
            {step === 1 
              ? 'Nhập email của bạn, chúng tôi sẽ gửi mã xác thực (OTP) để khôi phục tài khoản.' 
              : `Mã xác thực đã được gửi đến ${email}`}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <label className="auth-field" htmlFor="email">
                <span>{t('login.emailLabel')}</span>
                <div className="auth-input-row">
                  <Mail size={18} />
                  <input
                    id="email"
                    placeholder={t('login.emailPlaceholder')}
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </label>

              <button 
                className="auth-primary" 
                disabled={isSubmitting || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || countdown > 0} 
                type="submit" 
                style={{ marginTop: '24px' }}
              >
                {isSubmitting 
                  ? 'Đang gửi...' 
                  : countdown > 0 
                    ? `Gửi lại sau ${countdown}s` 
                    : 'Nhận mã xác thực'}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <label className="auth-field" htmlFor="reset-code">
                <span>Mã xác thực (OTP)</span>
                <div className="auth-input-row">
                  <Lock size={18} />
                  <input
                    id="reset-code"
                    placeholder="Nhập mã 6 số"
                    required
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                  />
                </div>
              </label>

              <label className="auth-field" htmlFor="new-password">
                <span>Mật khẩu mới</span>
                <div className="auth-input-row">
                  <Lock size={18} />
                  <input
                    id="new-password"
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="auth-field" htmlFor="confirm-new-password">
                <span>Xác nhận mật khẩu mới</span>
                <div className="auth-input-row">
                  <Lock size={18} />
                  <input
                    id="confirm-new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </label>

              <button 
                className="auth-primary" 
                disabled={isSubmitting || !resetCode || !newPassword || !confirmNewPassword} 
                type="submit" 
                style={{ marginTop: '24px' }}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                <ArrowRight size={18} />
              </button>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={onBackToLogin} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--sp-text-muted)', 
                fontSize: '14px', 
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
