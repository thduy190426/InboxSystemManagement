import { useEffect, useMemo, useState } from 'react'

type OnlineDurationBadgeProps = {
  onlineSince?: string | null
  presence?: string
  compact?: boolean
}

function formatOnlineDuration(onlineSince: string | null | undefined, now: number) {
  if (!onlineSince) {
    return ''
  }

  const startedAt = new Date(onlineSince).getTime()

  if (!Number.isFinite(startedAt)) {
    return ''
  }

  const totalMinutes = Math.max(1, Math.floor((now - startedAt) / 60000))

  if (totalMinutes < 60) {
    return `${totalMinutes} phút`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) {
    return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`
  }

  const days = Math.floor(hours / 24)
  return `${days} ngày`
}

export function OnlineDurationBadge({
  onlineSince,
  presence,
  compact = false,
}: OnlineDurationBadgeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)

    return () => window.clearInterval(timer)
  }, [])

  const label = useMemo(() => formatOnlineDuration(onlineSince, now), [now, onlineSince])

  if (presence !== 'online' || !label) {
    return null
  }

  return <span className={compact ? 'online-duration-badge compact' : 'online-duration-badge'}>{label}</span>
}
