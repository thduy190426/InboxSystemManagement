import type { FormEvent } from 'react'
import { useState, useRef, useEffect } from 'react'
import { ArrowRight, ChevronLeft, Eye, EyeOff, Lock, LogIn, Mail, Plus, RefreshCw, X } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useGoogleLogin } from '@react-oauth/google'
import FacebookLoginDefault from '@greatsumini/react-facebook-login'
const FacebookLogin = (FacebookLoginDefault as any).default || FacebookLoginDefault
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { AuthPageProps } from '../../types'
import loginBg from '../../bg-images/LoginBG.jpg'
import { AuthLanguageSwitcher } from '../../components/auth/AuthLanguageSwitcher'
import {
  getSavedAccounts,
  removeSavedAccount,
  isSavedAccountSessionActive,
  type SavedAccount,
} from '../../services/storage/authStorage'

type LoginPageProps = AuthPageProps & {
  onForgotPassword?: () => void
  twoFactorToken?: string | null
  onLogin2FA?: (code: string) => void
  onCancel2FA?: () => void
  onSelectSavedAccount?: (account: SavedAccount) => Promise<boolean> | void
}

export function LoginPage({
  errorMessage,
  isSubmitting = false,
  onSubmit,
  onSwitchMode,
  onGoogleLogin,
  onFacebookLogin,
  onForgotPassword,
  twoFactorToken,
  onLogin2FA,
  onCancel2FA,
  onSelectSavedAccount,
}: LoginPageProps) {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())
  const [showStandardForm, setShowStandardForm] = useState<boolean>(() => savedAccounts.length === 0)
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null)
  const [isVerifyingAccount, setIsVerifyingAccount] = useState<string | null>(null)
  const [prefilledEmail, setPrefilledEmail] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [isFormFilled, setIsFormFilled] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const { t, i18n } = useTranslation('auth')

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (onGoogleLogin) {
        await onGoogleLogin(tokenResponse.access_token)
      }
    },
    onError: () => {
      toast.error(t('login.googleLoginFailed'))
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

  async function handleSelectSavedAccount(account: SavedAccount) {
    setSelectedAccount(account)
    setPrefilledEmail(account.user.email)

    if (!isSavedAccountSessionActive(account) || !account.refreshToken) {
      setShowStandardForm(true)
      return
    }

    setIsVerifyingAccount(String(account.user.id))
    try {
      if (onSelectSavedAccount) {
        const success = await onSelectSavedAccount(account)
        if (!success) {
          setShowStandardForm(true)
        }
      } else {
        setShowStandardForm(true)
      }
    } catch {
      setShowStandardForm(true)
    } finally {
      setIsVerifyingAccount(null)
    }
  }

  function handleRemoveSavedAccount(e: React.MouseEvent, account: SavedAccount) {
    e.stopPropagation()
    removeSavedAccount(account.user.id)
    const remaining = getSavedAccounts()
    setSavedAccounts(remaining)
    if (selectedAccount?.user.id === account.user.id) {
      setSelectedAccount(null)
      setPrefilledEmail('')
    }
    if (remaining.length === 0) {
      setShowStandardForm(true)
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
      <AuthLanguageSwitcher />
      <section 
        className="auth-card" 
        aria-labelledby="login-title"
      >
        {!twoFactorToken && savedAccounts.length > 0 && !showStandardForm ? (
          <>
            <div className="auth-card-header">
              <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogIn size={14} />
                {t('login.loginButton')}
              </span>
              <h1 id="login-title">
                {t('accountSwitcher.recentAccounts', { defaultValue: 'Tài khoản gần đây' })}
              </h1>
              <p>
                {t('accountSwitcher.recentAccountsSub', {
                  defaultValue: 'Nhấp vào ảnh đại diện hoặc đăng nhập bằng tài khoản khác.',
                })}
              </p>
            </div>

            {errorMessage ? (
              <div className="auth-error-notice" role="alert">
                {errorMessage}
              </div>
            ) : null}

            <div className="recent-accounts-container">
              {savedAccounts.map((account) => {
                const isThisVerifying = isVerifyingAccount === String(account.user.id)
                return (
                  <div
                    key={account.user.id}
                    className="recent-account-card"
                    style={{
                      opacity: isVerifyingAccount && !isThisVerifying ? 0.6 : 1,
                      cursor: isVerifyingAccount ? 'wait' : 'pointer',
                      pointerEvents: isVerifyingAccount ? 'none' : 'auto',
                    }}
                    onClick={() => handleSelectSavedAccount(account)}
                  >
                    {account.user.avatarUrl ? (
                      <img
                        src={account.user.avatarUrl}
                        alt=""
                        className="recent-account-avatar"
                      />
                    ) : (
                      <div className="recent-account-avatar-fallback">
                        {account.user.displayName?.[0] || account.user.fullName?.[0] || 'U'}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '14.5px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {account.user.displayName || account.user.fullName}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: isThisVerifying ? 'var(--color-primary, #14b8a6)' : 'var(--color-text-muted, #94a3b8)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isThisVerifying ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>{t('app.loadingTitle', { defaultValue: 'Đang kiểm tra phiên...' })}</span>
                          </>
                        ) : (
                          account.user.email
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="recent-account-remove-btn"
                      title={t('accountSwitcher.removeAccount', { defaultValue: 'Xóa tài khoản khỏi thiết bị' })}
                      onClick={(e) => handleRemoveSavedAccount(e, account)}
                      disabled={Boolean(isVerifyingAccount)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}

              <button
                type="button"
                className="account-add-btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(37, 99, 235, 0.15))',
                  border: '1px dashed rgba(20, 184, 166, 0.4)',
                  color: 'var(--color-text-main, #e2e8f0)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isVerifyingAccount ? 'wait' : 'pointer',
                  marginTop: '4px',
                }}
                disabled={Boolean(isVerifyingAccount)}
                onClick={() => {
                  setSelectedAccount(null)
                  setPrefilledEmail('')
                  setShowStandardForm(true)
                }}
              >
                <Plus size={18} />
                <span>{t('accountSwitcher.addAccount', { defaultValue: 'Đăng nhập bằng tài khoản khác' })}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-card-header">
              {savedAccounts.length > 0 && !twoFactorToken && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount(null)
                    setPrefilledEmail('')
                    setShowStandardForm(false)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted, #94a3b8)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '0 0 8px 0',
                    marginRight: 'auto',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>{t('accountSwitcher.recentAccounts', { defaultValue: 'Tài khoản gần đây' })}</span>
                </button>
              )}
              <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogIn size={14} />
                {t('login.loginButton')}
              </span>
              <h1 id="login-title">{t('login.title')}</h1>
              <p>{t('login.subtitle')}</p>
            </div>

            {selectedAccount && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(20, 184, 166, 0.08)',
                  border: '1px solid rgba(20, 184, 166, 0.25)',
                  marginBottom: '16px',
                }}
              >
                {selectedAccount.user.avatarUrl ? (
                  <img
                    src={selectedAccount.user.avatarUrl}
                    alt=""
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #14b8a6, #2563eb)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                  >
                    {selectedAccount.user.displayName?.[0] || selectedAccount.user.fullName?.[0] || 'U'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--color-text-main, #e2e8f0)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedAccount.user.displayName || selectedAccount.user.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted, #94a3b8)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedAccount.user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount(null)
                    setPrefilledEmail('')
                    setShowStandardForm(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary, #14b8a6)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  {t('accountSwitcher.switchAccount', { defaultValue: 'Đổi' })}
                </button>
              </div>
            )}

            {errorMessage ? (
              <div className="auth-error-notice" role="alert">
                {errorMessage}
              </div>
            ) : null}

            {twoFactorToken ? (
              <form className="auth-form" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const code = String(formData.get('code') ?? '').trim();
                if (code && onLogin2FA) onLogin2FA(code);
              }}>
                <label className="auth-field" htmlFor="login-2fa-code">
                  <span>{t('login.twoFactorLabel')}</span>
                  <div className="auth-input-row">
                    <Lock size={18} />
                    <input
                      id="login-2fa-code"
                      name="code"
                      placeholder={t('login.twoFactorPlaceholder')}
                      required
                      type="text"
                      minLength={6}
                    />
                  </div>
                </label>
                <button className="primary-action-button" disabled={isSubmitting} type="submit">
                  <span>{t('login.twoFactorConfirm')}</span>
                  <ArrowRight size={18} />
                </button>
                <button className="secondary-action-button" disabled={isSubmitting} type="button" onClick={onCancel2FA} style={{ marginTop: '12px', background: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
                  {t('login.twoFactorCancel')}
                </button>
              </form>
            ) : (
            <form className="auth-form" onChange={handleFormChange} onSubmit={handleSubmit}>
              <label className="auth-field" htmlFor="login-email">
                <span>{t('login.emailLabel')}</span>
                <div className="auth-input-row">
                  <Mail size={18} />
                  <input
                    key={prefilledEmail}
                    id="login-email"
                    autoComplete="email"
                    defaultValue={prefilledEmail}
                    name="email"
                    placeholder={t('login.emailPlaceholder')}
                    required
                    type="email"
                  />
                </div>
              </label>

          <label className="auth-field" htmlFor="login-password">
            <span>{t('login.passwordLabel')}</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                id="login-password"
                autoComplete="current-password"
                minLength={6}
                name="password"
                placeholder={t('login.passwordPlaceholder')}
                required
                type={showPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="auth-form-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <label className="auth-check">
              <input defaultChecked name="rememberLogin" type="checkbox" />
              <span>{t('login.rememberLogin')}</span>
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{ background: 'none', border: 'none', color: 'var(--sp-accent)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
            >
              {t('login.forgotPasswordLink')}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
              onChange={handleRecaptchaChange}
              hl={i18n.language}
            />
          </div>

          <button
            className="auth-primary"
            disabled={isSubmitting || !isFormFilled || !recaptchaToken}
            type="submit"
          >
            {isSubmitting ? t('login.loggingIn') : t('login.loginButton')}
            <ArrowRight size={18} />
          </button>
        </form>
        )}

        {!twoFactorToken && (
          <>
            <div className="auth-divider">
              <span>{t('login.or')}</span>
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
          {t('login.googleLogin')}
        </button>

        <FacebookLogin
          appId={import.meta.env.VITE_FACEBOOK_APP_ID || "123456789"}
          onSuccess={async (response: any) => {
            if (onFacebookLogin && response.accessToken) {
              await onFacebookLogin(response.accessToken)
            }
          }}
          onFail={() => {
            toast.error(t('login.facebookLoginFailed'))
          }}
          render={({ onClick }: any) => (
            <button
              className="auth-facebook-btn"
              disabled={isSubmitting}
              onClick={onClick}
              type="button"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                <path fill="#fff" d="M16.671 15.542l.532-3.469h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.514V5.006s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.633H7.078v3.469h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z"/>
              </svg>
              {t('login.facebookLogin')}
            </button>
          )}
        />
            </>
          )}
          </>
        )}

        <p className="auth-switch">
          {t('login.noAccount')}
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            {t('login.createNewAccount')}
          </button>
        </p>
      </section>
    </main>
  )
}
