import { useTutorialStore, type FeatureKey } from '../../stores/tutorialStore'
import { useTranslation } from 'react-i18next'

type FeatureBadgeProps = {
  featureId: FeatureKey
  label?: string
  className?: string
  onClick?: () => void
}

export function FeatureBadge({ featureId, label, className = '', onClick }: FeatureBadgeProps) {
  const { t } = useTranslation()
  const isInteracted = useTutorialStore((state) => state.isFeatureInteracted(featureId))
  const markFeatureInteracted = useTutorialStore((state) => state.markFeatureInteracted)

  if (isInteracted) return null

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    markFeatureInteracted(featureId)
    onClick?.()
  }

  return (
    <span
      className={`feature-badge-new ${className}`}
      onClick={handleClick}
      title={t('tutorial.badge', { defaultValue: '✨ New' })}
    >
      {label || t('tutorial.badge', { defaultValue: '✨ New' })}
    </span>
  )
}
