import { useEffect, useState } from 'react'

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
  const [diffMinutes, setDiffMinutes] = useState(-1)

  useEffect(() => {
    if (presence === 'online' || !onlineSince) {
      return
    }
    
    const updateTime = () => {
      const diffMs = new Date().getTime() - new Date(onlineSince).getTime()
      setDiffMinutes(Math.floor(diffMs / (1000 * 60)))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [onlineSince, presence])

  if (presence === 'online' || diffMinutes < 1 || diffMinutes > 60) {
    return null
  }

  return (
    <span className={`online-duration-badge ${compact ? 'compact' : ''}`}>
      {diffMinutes} phút
    </span>
  )
}
