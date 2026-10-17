import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AuthLanguageSwitcherProps = {
  className?: string
}

export function AuthLanguageSwitcher({ className = '' }: AuthLanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en'

  const handleSelectLanguage = (lang: 'vi' | 'en') => {
    if (currentLang === lang) return
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <aside
      aria-label="Language Switcher"
      className={`auth-lang-switcher ${className}`.trim()}
    >
      <div className="auth-lang-pill">
        <span className="auth-lang-icon" title="Ngôn ngữ / Language">
          <Globe size={14} />
        </span>
        <button
          aria-label="Tiếng Việt"
          className={`auth-lang-btn${currentLang === 'vi' ? ' auth-lang-btn--active' : ''}`}
          onClick={() => handleSelectLanguage('vi')}
          type="button"
        >
          VI
        </button>
        <button
          aria-label="English"
          className={`auth-lang-btn${currentLang === 'en' ? ' auth-lang-btn--active' : ''}`}
          onClick={() => handleSelectLanguage('en')}
          type="button"
        >
          EN
        </button>
      </div>
    </aside>
  )
}
