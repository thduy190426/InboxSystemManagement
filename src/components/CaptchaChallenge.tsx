import { useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'

type CaptchaChallengeProps = {
  id: string
  disabled?: boolean
  onSolvedChange: (isSolved: boolean) => void
}

const captchaAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createCaptchaCode() {
  const values = new Uint32Array(6)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * captchaAlphabet.length)
    }
  }

  return Array.from(values, (value) => captchaAlphabet[value % captchaAlphabet.length]).join('')
}

export function CaptchaChallenge({ id, disabled = false, onSolvedChange }: CaptchaChallengeProps) {
  const [code, setCode] = useState(() => createCaptchaCode())
  const [answer, setAnswer] = useState('')

  const normalizedAnswer = answer.trim().toUpperCase()
  const isSolved = normalizedAnswer === code

  useEffect(() => {
    onSolvedChange(isSolved)
  }, [isSolved, onSolvedChange])

  function refreshCode() {
    setCode(createCaptchaCode())
    setAnswer('')
  }

  return (
    <div className="captcha-challenge" aria-live="polite">
      <div className="captcha-header">
        <span>
          <ShieldCheck size={16} />
          Xác thực CAPTCHA
        </span>
        <button
          aria-label="Đổi mã CAPTCHA"
          disabled={disabled}
          onClick={refreshCode}
          title="Đổi mã CAPTCHA"
          type="button"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="captcha-body">
        <div className="captcha-code" aria-label={`Mã CAPTCHA ${code}`}>
          {code}
        </div>
        <label className="captcha-input" htmlFor={id}>
          <span>Nhập mã</span>
          <input
            autoComplete="off"
            disabled={disabled}
            id={id}
            inputMode="text"
            maxLength={6}
            name={id}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Nhập mã bên trái"
            required
            type="text"
            value={answer}
          />
        </label>
      </div>

      {answer && !isSolved ? (
        <span className="auth-field-error">Mã CAPTCHA chưa đúng, vui lòng kiểm tra lại!</span>
      ) : null}
    </div>
  )
}
