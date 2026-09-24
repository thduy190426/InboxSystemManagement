import { useEffect, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useTheme } from '../providers/ThemeProvider'

type CaptchaChallengeProps = {
  id: string
  disabled?: boolean
  onSolvedChange: (isSolved: boolean) => void
}

export function CaptchaChallenge({ disabled = false, onSolvedChange }: CaptchaChallengeProps) {
  const [token, setToken] = useState<string | null>(null)
  const { theme } = useTheme()

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
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
        backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9',
        width: 'fit-content',
        marginInline: 'auto'
      }}
    >
      <ReCAPTCHA
        theme={theme}
        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
        onChange={handleChange}
      />
    </div>
  )
}
