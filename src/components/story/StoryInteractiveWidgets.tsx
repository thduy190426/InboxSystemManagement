import { useState, useEffect } from 'react'
import { Check, Clock } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'
import type { PollStats, SliderStats } from '../../types'

interface InteractivePollProps {
  storyId?: string
  pollData: {
    question: string
    options: [string, string]
  }
  isStudioPreview?: boolean
}

export function InteractivePollWidget({
  storyId,
  pollData,
  isStudioPreview = false,
}: InteractivePollProps) {
  const [stats, setStats] = useState<PollStats | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  
  useEffect(() => {
    if (!storyId || isStudioPreview) return
    storyApi.getPollStats(storyId)
      .then(res => {
        if (res.success && res.pollStats) {
          setStats(res.pollStats)
        }
      })
      .catch(err => console.warn('[InteractivePoll] Stats fetch error:', err))
  }, [storyId, isStudioPreview])

  const handleVote = async (e: React.MouseEvent, optionIdx: 0 | 1) => {
    e.stopPropagation()
    if (isStudioPreview || !storyId || isVoting) return

    setIsVoting(true)
    try {
      const res = await storyApi.votePoll(storyId, optionIdx)
      if (res.success && res.pollStats) {
        setStats(res.pollStats)
      }
    } catch (err) {
      console.warn('[InteractivePoll] Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }

  const hasVoted = stats?.myVote !== null && stats?.myVote !== undefined
  const optA = pollData.options[0] || 'Có'
  const optB = pollData.options[1] || 'Không'

  return (
    <div className="story-interactive-poll-card" onClick={e => e.stopPropagation()}>
      <div className="story-interactive-poll-question">
        <span>{pollData.question || 'Bạn nghĩ thế nào?'}</span>
      </div>

      <div className="story-interactive-poll-options">
        {}
        <button
          type="button"
          className={`story-poll-option-btn ${stats?.myVote === 0 ? 'is-my-choice' : ''}`}
          onClick={e => handleVote(e, 0)}
          disabled={isStudioPreview}
        >
          {hasVoted && stats && (
            <div
              className="story-poll-fill story-poll-fill-a"
              style={{ width: `${stats.percentA}%` }}
            />
          )}
          <span className="story-poll-text">{optA}</span>
          {hasVoted && stats && (
            <span className="story-poll-percent">
              {stats.myVote === 0 && <Check size={14} className="story-poll-check" />}
              {stats.percentA}%
            </span>
          )}
        </button>

        {}
        <button
          type="button"
          className={`story-poll-option-btn ${stats?.myVote === 1 ? 'is-my-choice' : ''}`}
          onClick={e => handleVote(e, 1)}
          disabled={isStudioPreview}
        >
          {hasVoted && stats && (
            <div
              className="story-poll-fill story-poll-fill-b"
              style={{ width: `${stats.percentB}%` }}
            />
          )}
          <span className="story-poll-text">{optB}</span>
          {hasVoted && stats && (
            <span className="story-poll-percent">
              {stats.myVote === 1 && <Check size={14} className="story-poll-check" />}
              {stats.percentB}%
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

interface InteractiveSliderProps {
  storyId?: string
  sliderData: {
    question: string
    emoji: string
  }
  isStudioPreview?: boolean
}

export function InteractiveSliderWidget({
  storyId,
  sliderData,
  isStudioPreview = false,
}: InteractiveSliderProps) {
  const [currentVal, setCurrentVal] = useState(50)
  const [stats, setStats] = useState<SliderStats | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showBurst, setShowBurst] = useState(false)

  useEffect(() => {
    if (!storyId || isStudioPreview) return
    storyApi.getSliderStats(storyId)
      .then(res => {
        if (res.success && res.sliderStats) {
          setStats(res.sliderStats)
          if (res.sliderStats.myValue !== null) {
            setCurrentVal(res.sliderStats.myValue)
          }
        }
      })
      .catch(err => console.warn('[InteractiveSlider] Stats fetch error:', err))
  }, [storyId, isStudioPreview])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setCurrentVal(Number(e.target.value))
    setIsDragging(true)
  }

  const handleRelease = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    setIsDragging(false)
    if (isStudioPreview || !storyId) return

    
    setShowBurst(true)
    setTimeout(() => setShowBurst(false), 1500)

    try {
      const res = await storyApi.voteSlider(storyId, currentVal)
      if (res.success && res.sliderStats) {
        setStats(res.sliderStats)
      }
    } catch (err) {
      console.warn('[InteractiveSlider] Vote error:', err)
    }
  }

  const emoji = sliderData.emoji || '😍'

  return (
    <div className="story-interactive-slider-card" onClick={e => e.stopPropagation()}>
      <div className="story-interactive-slider-question">
        <span>{sliderData.question || 'Mức độ yêu thích?'}</span>
      </div>

      <div className="story-interactive-slider-track-wrap">
        {}
        {showBurst && (
          <div className="story-slider-burst-container">
            <span className="story-slider-particle p1">{emoji}</span>
            <span className="story-slider-particle p2">{emoji}</span>
            <span className="story-slider-particle p3">{emoji}</span>
            <span className="story-slider-particle p4">{emoji}</span>
          </div>
        )}

        <input
          type="range"
          min={0}
          max={100}
          value={currentVal}
          onChange={handleSliderChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          disabled={isStudioPreview}
          className="story-interactive-slider-input"
          style={{
            background: `linear-gradient(to right, #ec4899 0%, #8b5cf6 ${currentVal}%, rgba(255, 255, 255, 0.25) ${currentVal}%, rgba(255, 255, 255, 0.25) 100%)`,
          }}
        />

        {}
        <div
          className={`story-slider-thumb-emoji ${isDragging ? 'is-dragging' : ''}`}
          style={{
            left: `calc(${currentVal}% + (${(50 - currentVal) * 0.25}px))`,
          }}
        >
          {emoji}
        </div>

        {}
        {stats && stats.average !== undefined && (
          <div
            className="story-slider-average-marker"
            style={{ left: `${stats.average}%` }}
            title={`Trung bình: ${stats.average}%`}
          >
            <div className="story-slider-avg-label">{stats.average}%</div>
            <div className="story-slider-avg-line" />
          </div>
        )}
      </div>
    </div>
  )
}

interface InteractiveCountdownProps {
  countdownData: {
    title: string
    targetDate: string
  }
}

export function InteractiveCountdownWidget({ countdownData }: InteractiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  })

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(countdownData.targetDate).getTime()
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds, isPast: false })
    }

    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [countdownData.targetDate])

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

  return (
    <div className="story-interactive-countdown-card" onClick={e => e.stopPropagation()}>
      <div className="story-countdown-header">
        <Clock size={16} color="#38bdf8" />
        <span className="story-countdown-title">{countdownData.title || 'Sự kiện đặc biệt'}</span>
      </div>

      {timeLeft.isPast ? (
        <div className="story-countdown-finished">
          <span>🎉 Sự kiện đã bắt đầu!</span>
        </div>
      ) : (
        <div className="story-countdown-grid">
          <div className="story-countdown-unit">
            <span className="story-countdown-num">{pad(timeLeft.days)}</span>
            <span className="story-countdown-lbl">Ngày</span>
          </div>
          <span className="story-countdown-colon">:</span>
          <div className="story-countdown-unit">
            <span className="story-countdown-num">{pad(timeLeft.hours)}</span>
            <span className="story-countdown-lbl">Giờ</span>
          </div>
          <span className="story-countdown-colon">:</span>
          <div className="story-countdown-unit">
            <span className="story-countdown-num">{pad(timeLeft.minutes)}</span>
            <span className="story-countdown-lbl">Phút</span>
          </div>
          <span className="story-countdown-colon">:</span>
          <div className="story-countdown-unit">
            <span className="story-countdown-num">{pad(timeLeft.seconds)}</span>
            <span className="story-countdown-lbl">Giây</span>
          </div>
        </div>
      )}
    </div>
  )
}
