import { useEffect, useState } from 'react'

type OnlineDurationBadgeProps = {
  onlineSince?: string | null
  lastSeenAt?: string | null
  status?: string
  presence?: string
  compact?: boolean
}

export function OnlineDurationBadge({
  onlineSince,
  lastSeenAt,
  status,
  presence,
  compact = false,
}: OnlineDurationBadgeProps) {
  const [diffMinutes, setDiffMinutes] = useState(-1)

  useEffect(() => {
    if (presence === 'online') {
      return
    }

    const timeToUse = lastSeenAt || onlineSince

    if (!timeToUse) {
      if (status) {
        const match = status.match(/(\d+)\s+phút/i)
        if (match) {
          setDiffMinutes(parseInt(match[1], 10))
        }
      }
      return
    }
    
    const updateTime = () => {
      const diffMs = new Date().getTime() - new Date(timeToUse).getTime()
      setDiffMinutes(Math.floor(diffMs / (1000 * 60)))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [onlineSince, lastSeenAt, status, presence])

  if (presence === 'online' || diffMinutes < 1 || diffMinutes > 60) {
    return null
  }

  return (
    <span className={`online-duration-badge ${compact ? 'compact' : ''}`}>
      {diffMinutes} phút
    </span>
  )
}
