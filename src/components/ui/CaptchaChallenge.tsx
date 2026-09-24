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
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 0'
      }}
    >
      <ReCAPTCHA
        sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
        onChange={handleChange}
      />
    </div>
  )
}
