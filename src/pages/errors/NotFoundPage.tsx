import { ArrowLeft, Home, MessageCircleWarning, Compass, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type NotFoundPageProps = {
  isAuthenticated?: boolean
  onGoHome: () => void
  onGoBack: () => void
}

export function NotFoundPage({
  isAuthenticated = false,
  onGoHome,
  onGoBack,
}: NotFoundPageProps) {
  const { t } = useTranslation('notfound')
  return (
    <main className="not-found-shell">
      <section className="not-found-panel" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <div className="not-found-code">404</div>
          <div className="visual-icon-wrapper">
            <MessageCircleWarning size={64} strokeWidth={1.5} color="#ffffff" />
          </div>
        </div>

        <div className="not-found-content-wrapper">
          <div className="not-found-copy">
            <span className="section-kicker">
              <ShieldAlert size={18} /> {t('kicker')}
            </span>
            <h1 id="not-found-title">{t('title')}</h1>
            <p>
              {t('description')}
            </p>
          </div>
          
          <div className="not-found-suggestions">
            <div className="suggestion-item">
              <Compass size={18} />
              <span>{t('suggestion')}</span>
            </div>
          </div>

          <div className="not-found-actions">
            <button className="auth-primary" onClick={onGoHome} type="button">
              <Home size={18} />
              {isAuthenticated ? t('homeAuth') : t('homeUnauth')}
            </button>
            <button className="not-found-secondary" onClick={onGoBack} type="button">
              <ArrowLeft size={18} />
              {t('back')}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
