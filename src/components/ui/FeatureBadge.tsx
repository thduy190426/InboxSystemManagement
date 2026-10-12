import type { FeatureKey } from '../../stores/tutorialStore'

type FeatureBadgeProps = {
  featureId: FeatureKey
  label?: string
  className?: string
  onClick?: () => void
}

export function FeatureBadge({}: FeatureBadgeProps) {
  // Feature badges ("✨ New") disabled
  return null
}

