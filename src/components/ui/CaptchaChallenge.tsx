import { useEffect, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

type CaptchaChallengeProps = {
  id: string
  disabled?: boolean
  onSolvedChange: (isSolved: boolean) => void
}

export function CaptchaChallenge({ disabled = false, onSolvedChange }: CaptchaChallengeProps) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    onSolvedChange(Boolean(token))
  }, [token, onSolvedChange])

  function handleChange(value: string | null) {
    setToken(value)
  }

  return (
    <div 
      className="captcha-challenge" 
      aria-live="polite"
      style={{
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        justifyContent: 'center',
        margin: '8px 0 16px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        backgroundColor: '#222',
        width: 'fit-content',
        marginInline: 'auto'
      }}
    >
      <ReCAPTCHA
        theme="dark"
        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
        onChange={handleChange}
      />
    </div>
  )
}
