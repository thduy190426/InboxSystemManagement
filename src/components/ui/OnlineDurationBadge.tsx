import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [diffMinutes, setDiffMinutes] = useState(-1)

  useEffect(() => {
    if (presence === 'online') {
      return
    }

    const timeToUse = lastSeenAt || onlineSince

    if (!timeToUse) {
      if (status) {
        const minMatch = status.match(new RegExp(`(\\d+)\\s+${t('minutes', { defaultValue: 'phút' })}`, 'i'))
        if (minMatch) {
          setDiffMinutes(parseInt(minMatch[1], 10))
          return
        }
        const hourMatch = status.match(new RegExp(`(\\d+)\\s+${t('hours', { defaultValue: 'giờ' })}`, 'i'))
        if (hourMatch) {
          setDiffMinutes(parseInt(hourMatch[1], 10) * 60)
          return
        }
        const dayMatch = status.match(new RegExp(`(\\d+)\\s+${t('days', { defaultValue: 'ngày' })}`, 'i'))
        if (dayMatch) {
          setDiffMinutes(parseInt(dayMatch[1], 10) * 60 * 24)
          return
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

  if (presence === 'online' || diffMinutes < 1 || diffMinutes > 10080) {
    return null
  }

  let displayLabel = ''
  if (diffMinutes < 60) {
    displayLabel = `${diffMinutes}p`
  } else if (diffMinutes < 1440) {
    displayLabel = `${Math.floor(diffMinutes / 60)}g`
  } else {
    displayLabel = `${Math.floor(diffMinutes / 1440)}n`
  }

  return (
    <span className={`online-duration-badge ${compact ? 'compact' : ''}`}>
      {displayLabel}
    </span>
  )
}
