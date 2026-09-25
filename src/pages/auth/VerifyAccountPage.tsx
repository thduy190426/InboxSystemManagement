import type { FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { Mail, RotateCw, ShieldCheck } from 'lucide-react'
import type { AuthPageProps } from '../../types'
import bgImage from '../../bg-images/VerifyAccountBG.jpg'

type VerifyAccountPageProps = AuthPageProps & {
  defaultEmail?: string
  devEmailCode?: string
  successMessage?: string
  onResend: (payload: Record<string, string>) => Promise<void> | void
}

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

export function VerifyAccountPage({
  defaultEmail = '',
  devEmailCode = '',
  errorMessage,
  isSubmitting = false,
  onResend,
  onSubmit,
  onSwitchMode,
  successMessage = '',
}: VerifyAccountPageProps) {
  const [localError, setLocalError] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

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
      channel: 'email',
      code,
      email,
    })
  }

  async function handleResend() {
    if (cooldown > 0) return

    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const email = (emailInput?.value || defaultEmail).trim().toLowerCase()

    if (!emailPattern.test(email)) {
      setLocalError('Vui lòng nhập Email hợp lệ để gửi lại mã!')
      return
    }

    setLocalError('')
    setCooldown(60)
    try {
      await onResend({
        channel: 'email',
        email,
      })
    } catch (error) {
      setCooldown(0)
    }
  }

  const visibleError = localError || errorMessage

  return (
    <main
      className="auth-shell"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <section className="auth-card" aria-labelledby="verify-title" style={{ background: 'var(--surface)' }}>
        <div className="auth-card-header">
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            Xác thực
          </span>
          <h1 id="verify-title">Xác thực tài khoản</h1>
          <p>Nhập mã 6 chữ số đã được gửi đến Email của bạn.</p>
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
                readOnly
                style={{ cursor: 'not-allowed', opacity: 0.7 }}
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
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </label>

          {successMessage ? <p className="auth-success">{successMessage}</p> : null}
          {devEmailCode ? (
            <p className="auth-reset-code">
              Mã dev <strong>{devEmailCode}</strong>
            </p>
          ) : null}
          {visibleError ? <p className="auth-error">{visibleError}</p> : null}

          <button className="auth-primary" disabled={isSubmitting || !/^[0-9]{6}$/.test(code)} type="submit">
            <ShieldCheck size={18} />
            {isSubmitting ? 'Đang xác thực...' : 'Xác thực'}
          </button>
        </form>

        <button className="auth-action-button" disabled={isSubmitting || cooldown > 0} onClick={handleResend} type="button">
          <RotateCw size={16} />
          {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã'}
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
