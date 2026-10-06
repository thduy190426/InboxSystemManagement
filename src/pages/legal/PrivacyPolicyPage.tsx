import {
  ArrowLeft,
  Database,
  Eye,
  LockKeyhole,
  ShieldCheck,
  HardDrive,
  Target,
  Key,
  Share2,
  Trash2,
  UserCog,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PrivacyPolicyPage() {
  const { t } = useTranslation('privacy')

  const privacySections = [
    {
      icon: HardDrive,
      title: t('s1Title'),
      body: t('s1Body'),
    },
    {
      icon: Target,
      title: t('s2Title'),
      body: t('s2Body'),
    },
    {
      icon: Key,
      title: t('s3Title'),
      body: t('s3Body'),
    },
    {
      icon: Share2,
      title: t('s4Title'),
      body: t('s4Body'),
    },
    {
      icon: Trash2,
      title: t('s5Title'),
      body: t('s5Body'),
    },
    {
      icon: UserCog,
      title: t('s6Title'),
      body: t('s6Body'),
    },
  ]

  return (
    <main className="legal-shell">
      <article className="legal-document" aria-labelledby="privacy-title">
        <a className="legal-back-link" href="/register">
          <ArrowLeft size={18} />
          {t('backToRegister')}
        </a>

        <header className="legal-hero">
          <div className="legal-icon">
            <LockKeyhole size={30} />
          </div>
          <div>
            <span className="section-kicker">{t('kicker')}</span>
            <h1 id="privacy-title">{t('title')}</h1>
            <p>
              {t('description')}
            </p>
          </div>
        </header>

        <section className="legal-summary" aria-label="Tóm tắt">
          <div>
            <ShieldCheck size={18} />
            <span>{t('lastUpdate')}</span>
          </div>
          <div>
            <Database size={18} />
            <span>{t('dataUsage')}</span>
          </div>
          <div>
            <Eye size={18} />
            <span>{t('noSelling')}</span>
          </div>
        </section>

        <div className="legal-section-list">
          {privacySections.map((section) => (
            <section className="legal-section" key={section.title}>
              <div className="legal-section-icon">
                <section.icon size={24} />
              </div>
              <div className="legal-section-content">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
