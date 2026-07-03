type OnlineDurationBadgeProps = {
  onlineSince?: string | null
  presence?: string
  compact?: boolean
}

export function OnlineDurationBadge({
  onlineSince,
  presence,
  compact = false,
}: OnlineDurationBadgeProps) {
  void onlineSince
  void presence
  void compact

  return null
}
