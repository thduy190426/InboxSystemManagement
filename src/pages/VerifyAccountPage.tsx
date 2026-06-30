import type { FormEvent } from 'react'
import { useState } from 'react'
import { Mail, Phone, RotateCw, ShieldCheck } from 'lucide-react'
import type { VerificationChannel } from '../services/authApi'
import type { AuthPageProps } from '../types'

type VerifyAccountPageProps = AuthPageProps & {
  defaultEmail?: string
  devEmailCode?: string
  devPhoneCode?: string
  requiredChannels?: VerificationChannel[]
  successMessage?: string
  onResend: (payload: Record<string, string>) => Promise<void> | void
}

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

export function VerifyAccountPage({
  defaultEmail = '',
  devEmailCode = '',
  devPhoneCode = '',
  errorMessage,
  isSubmitting = false,
  onResend,
  onSubmit,
  onSwitchMode,
  requiredChannels = ['email'],
  successMessage = '',
}: VerifyAccountPageProps) {
  const [channel, setChannel] = useState<VerificationChannel>(requiredChannels[0] || 'email')
  const [localError, setLocalError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const code = String(formData.get('code') ?? '').trim()

    if (!emailPattern.test(email)) {
      setLocalError('Vui lòng nhập Email hợp lệ!')
      return
    }

    if (!/^[0-9]{6}$/.test(code)) {
      setLocalError('Mã xác thực phải gồm 6 chữ số!')
      return
    }

    setLocalError('')
    onSubmit({
      channel,
      code,
      email,
    })
  }

  function handleResend() {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const email = (emailInput?.value || defaultEmail).trim().toLowerCase()

    if (!emailPattern.test(email)) {
      setLocalError('Vui lòng nhập Email hợp lệ để gửi lại mã!')
      return
    }

    setLocalError('')
    onResend({
      channel,
      email,
    })
  }

  const visibleError = localError || errorMessage
  const devCode = channel === 'email' ? devEmailCode : devPhoneCode

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="verify-title">
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            Xác thực
          </span>
          <h1 id="verify-title">Xác thực tài khoản</h1>
          <p>Nhập mã 6 chữ số đã được gửi đến Email hoặc số điện thoại của bạn.</p>
        </div>

        <div className="auth-segmented" role="tablist" aria-label="Kênh xác thực">
          <button
            aria-selected={channel === 'email'}
            className={channel === 'email' ? 'is-active' : ''}
            disabled={isSubmitting}
            onClick={() => setChannel('email')}
            type="button"
          >
            <Mail size={16} />
            Email
          </button>
          <button
            aria-selected={channel === 'phone'}
            className={channel === 'phone' ? 'is-active' : ''}
            disabled={isSubmitting || !requiredChannels.includes('phone')}
            onClick={() => setChannel('phone')}
            type="button"
          >
            <Phone size={16} />
            Phone
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-row">
              <Mail size={18} />
              <input
                autoComplete="email"
                defaultValue={defaultEmail}
                maxLength={190}
                name="email"
                placeholder="Nhập Email tài khoản"
                required
                type="email"
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Mã xác thực</span>
            <div className="auth-input-row">
              <ShieldCheck size={18} />
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="Nhập mã 6 chữ số"
                required
                type="text"
              />
            </div>
          </label>

          {successMessage ? <p className="auth-success">{successMessage}</p> : null}
          {devCode ? (
            <p className="auth-reset-code">
              Mã dev <strong>{devCode}</strong>
            </p>
          ) : null}
          {visibleError ? <p className="auth-error">{visibleError}</p> : null}

          <button className="auth-primary" disabled={isSubmitting} type="submit">
            <ShieldCheck size={18} />
            {isSubmitting ? 'Đang xác thực...' : 'Xác thực'}
          </button>
        </form>

        <button className="auth-action-button" disabled={isSubmitting} onClick={handleResend} type="button">
          <RotateCw size={16} />
          Gửi lại mã
        </button>

        <p className="auth-switch">
          Đã xác thực xong?
          <button disabled={isSubmitting} onClick={onSwitchMode} type="button">
            Đăng nhập
          </button>
        </p>
      </section>
    </main>
  )
}
