import { ArrowLeft, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TermsPage() {
  const { t } = useTranslation('terms')

  const termsSections = [
    {
      title: t('s1Title'),
      body: t('s1Body'),
    },
    {
      title: t('s2Title'),
      body: t('s2Body'),
    },
    {
      title: t('s3Title'),
      body: t('s3Body'),
    },
    {
      title: t('s4Title'),
      body: t('s4Body'),
    },
    {
      title: t('s5Title'),
      body: t('s5Body'),
    },
    {
      title: t('s6Title'),
      body: t('s6Body'),
    },
  ]

  return (
    <main className="legal-shell">
      <article className="legal-document" aria-labelledby="terms-title">
        <a className="legal-back-link" href="/register">
          <ArrowLeft size={18} />
          {t('backToRegister')}
        </a>

        <header className="legal-hero">
          <div className="legal-icon">
            <FileText size={30} />
          </div>
          <div>
            <span className="section-kicker">{t('kicker')}</span>
            <h1 id="terms-title">{t('title')}</h1>
            <p>
              {t('description')}
            </p>
          </div>
        </header>

        <section className="legal-summary" aria-label={t('summary', { defaultValue: 'Summary' })}>
          <div>
            <ShieldCheck size={18} />
            <span>{t('lastUpdate')}</span>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <span>{t('appliesTo')}</span>
          </div>
        </section>

        <div className="legal-section-list">
          {termsSections.map((section) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
