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
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthPageProps } from '../../types'
import registerBg from '../../bg-images/RegisterBG.jpg'

type RegisterPageProps = AuthPageProps & {
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type RegisterErrors = Partial<
  Record<'fullName' | 'email' | 'phone' | 'gender' | 'password' | 'confirmPassword', string>
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

function validateRegisterForm(formData: FormData, t: (key: string) => string) {
  const fullName = normalizeText(formData.get('fullName'))
  const email = normalizeEmail(formData.get('email'))
  const phone = normalizePhone(formData.get('phone'))
  const password = String(formData.get('password') ?? '')
  const gender = String(formData.get('gender') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  const errors: RegisterErrors = {}

  if (!gender) {
    errors.gender = t('register.errors.genderRequired')
  } else if (!['male', 'female', 'other'].includes(gender)) {
    errors.gender = t('register.errors.genderInvalid')
  }

  if (!fullName) {
    errors.fullName = t('register.errors.fullNameRequired')
  } else if (fullName.length < 2) {
    errors.fullName = t('register.errors.fullNameMin')
  } else if (fullName.length > 120) {
    errors.fullName = t('register.errors.fullNameMax')
  } else if (!fullNamePattern.test(fullName)) {
    errors.fullName = t('register.errors.fullNamePattern')
  }

  if (!email) {
    errors.email = t('register.errors.emailRequired')
  } else if (email.length > 190) {
    errors.email = t('register.errors.emailMax')
  } else if (!emailPattern.test(email)) {
    errors.email = t('register.errors.emailPattern')
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = t('register.errors.phonePattern')
  }

  const passwordRequirements = [
    password.length >= 8 || t('register.errors.passwordLengthMin'),
    password.length <= 72 || t('register.errors.passwordLengthMax'),
    !/\s/.test(password) || t('register.errors.passwordNoSpaces'),
    /[a-z]/.test(password) || t('register.errors.passwordLowercase'),
    /[A-Z]/.test(password) || t('register.errors.passwordUppercase'),
    /[0-9]/.test(password) || t('register.errors.passwordNumber'),
    /[^A-Za-z0-9]/.test(password) || t('register.errors.passwordSpecial'),
  ].filter((requirement): requirement is string => typeof requirement === 'string')

  if (!password) {
    errors.password = t('register.errors.passwordRequired')
  } else if (passwordRequirements.length) {
    errors.password = `${t('register.errors.passwordNeeds')} ${passwordRequirements.join(', ')}!`
  }

  if (!confirmPassword) {
    errors.confirmPassword = t('register.errors.confirmPasswordRequired')
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = t('register.errors.confirmPasswordMismatch')
  }

  return {
    data: {
      fullName,
      email,
      phone,
      gender,
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
  const { t } = useTranslation('auth')

  function handleFormChange(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get('fullName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '').trim()
    const gender = String(formData.get('gender') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '').trim()
    const terms = formData.get('terms')
    
    setIsFormFilled(
      fullName.length > 0 &&
      email.length > 0 &&
      password.length > 0 &&
      gender !== '' &&
      confirmPassword.length > 0 &&
      terms === 'on'
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validateRegisterForm(new FormData(event.currentTarget), t)

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors)
      pushToast(t('register.errors.checkInfo'), 'error')
      return
    }

    setFieldErrors({})
    onSubmit(validation.data)
  }

  return (
    <main 
      className="auth-shell"
      style={{
        backgroundImage: `url(${registerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <section 
        className="auth-card" 
        aria-labelledby="register-title"
      >
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={14} />
            {t('register.registerButton')}
          </span>
          <h1 id="register-title">{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>

        <form className="auth-form" onChange={handleFormChange} onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('register.fullNameLabel')}</span>
            <div className="auth-input-row">
              <User size={18} />
              <input
                autoComplete="name"
                maxLength={120}
                minLength={2}
                name="fullName"
                placeholder={t('register.fullNamePlaceholder')}
                required
                type="text"
              />
            </div>
            {fieldErrors.fullName ? (
              <span className="auth-field-error">{fieldErrors.fullName}</span>
            ) : null}
          </label>

          <label className="auth-field">
            <span>{t('register.emailLabel')}</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="email"
                maxLength={190}
                name="email"
                placeholder={t('register.emailPlaceholder')}
                required
                type="email"
              />
            </div>
            {fieldErrors.email ? <span className="auth-field-error">{fieldErrors.email}</span> : null}
          </label>

          <label className="auth-field">
            <span>{t('register.phoneLabel')}</span>
            <div className="auth-input-row">
              <Phone size={18} />
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={32}
                name="phone"
                placeholder={t('register.phonePlaceholder')}
                type="tel"
              />
            </div>
            {fieldErrors.phone ? <span className="auth-field-error">{fieldErrors.phone}</span> : null}
          </label>

          <label className="auth-field">
            <span>{t('register.genderLabel')}</span>
            <div className="auth-input-row">
              <Users size={18} />
              <select name="gender" required defaultValue="">
                <option value="" disabled hidden>
                  {t('register.genderPlaceholder')}
                </option>
                <option value="male">{t('register.genderMale')}</option>
                <option value="female">{t('register.genderFemale')}</option>
                <option value="other">{t('register.genderOther')}</option>
              </select>
            </div>
            {fieldErrors.gender ? <span className="auth-field-error">{fieldErrors.gender}</span> : null}
          </label>

          <label className="auth-field">
            <span>{t('register.passwordLabel')}</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder={t('register.passwordPlaceholder')}
                required
                type={showPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? t('register.hidePassword') : t('register.showPassword')}
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
            <span>{t('register.confirmPasswordLabel')}</span>
            <div className="auth-input-row">
              <Lock size={18} />
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                placeholder={t('register.confirmPasswordPlaceholder')}
                required
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                aria-label={
                  showConfirmPassword
                    ? t('register.hideConfirmPassword')
                    : t('register.showConfirmPassword')
                }
                className="password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                title={showConfirmPassword ? t('register.hideConfirmPassword') : t('register.showConfirmPassword')}
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
              {t('register.termsStart')}{' '}
              <a href="/terms" target="_blank" rel="noreferrer">
                {t('register.termsLink')}
              </a>{' '}
              {t('register.termsAnd')}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">
                {t('register.privacyLink')}
              </a>
              .
            </span>
          </label>

          <button
            className="auth-primary"
            disabled={isSubmitting || !isFormFilled}
            type="submit"
          >
            <UserPlus size={18} />
            {isSubmitting ? t('register.registering') : t('register.registerButton')}
          </button>
        </form>

        <div className="auth-security">
          <ShieldCheck size={18} />
          <span>{t('register.securityNotice')}</span>
        </div>

        <p className="auth-switch">
          {t('register.hasAccount')}
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            {t('register.loginNow')}
          </button>
        </p>
      </section>
    </main>
  )
}
