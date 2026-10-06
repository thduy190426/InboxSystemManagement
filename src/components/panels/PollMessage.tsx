import { useState, useMemo, useEffect } from 'react'
import { Check, Clock, Users, PieChart, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Message } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { useTranslation } from 'react-i18next'

type PollMessageProps = {
  message: Message
  currentUserId: string
  members: { id: string; userId: number; fullName: string; avatarUrl: string | null }[]
  onVote: (messageId: string, optionIds: string[]) => void
}

export function PollMessage({ message, currentUserId, members, onVote }: PollMessageProps) {
  const { t, i18n } = useTranslation('panels')
  const poll = message.poll
  if (!poll) return null

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  
  const currentUserIdStr = currentUserId

  const userPreviousVotes = useMemo(() => {
    const votes: string[] = []
    poll.options.forEach(opt => {
      if (opt.voterIds.includes(currentUserIdStr)) {
        votes.push(opt.id)
      }
    })
    return votes
  }, [poll.options, currentUserIdStr])

  useEffect(() => {
    setSelectedOptionIds(userPreviousVotes)
  }, [userPreviousVotes])

  const isPollEnded = useMemo(() => {
    if (poll.isClosed) return true
    if (poll.endTime && new Date(poll.endTime).getTime() <= Date.now()) return true
    return false
  }, [poll.isClosed, poll.endTime])

  const totalVotes = useMemo(() => {
    const uniqueVoters = new Set<string>()
    poll.options.forEach(opt => {
      opt.voterIds.forEach(vid => uniqueVoters.add(vid))
    })
    return uniqueVoters.size
  }, [poll.options])

  const hasVoted = userPreviousVotes.length > 0
  const canViewResults = isPollEnded || (!poll.hideResultsUntilEnd && hasVoted)

  const handleToggleOption = (optionId: string) => {
    if (isPollEnded) return

    if (poll.allowMultipleAnswers) {
      setSelectedOptionIds(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      )
    } else {
      setSelectedOptionIds([optionId])
    }
  }

  const handleSubmitVote = () => {
    if (isPollEnded || selectedOptionIds.length === 0) return
    onVote(message.id, selectedOptionIds)
  }

  const handleCancelVote = () => {
    if (isPollEnded) return
    onVote(message.id, [])
    setSelectedOptionIds([])
  }

  const renderVoters = (voterIds: string[]) => {
    if (poll.isAnonymous) return null
    if (voterIds.length === 0) return null

    const voters = voterIds.map(vid => members.find(m => m.userId.toString() === vid)).filter(Boolean)
    
    return (
      <div className="poll-voters-list" style={{ display: 'flex', gap: '4px', marginTop: '6px', paddingLeft: '28px', flexWrap: 'wrap' }}>
        {voters.slice(0, 5).map(voter => (
          <div key={voter!.id} title={voter!.fullName} style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--background-color)', display: 'flex' }}>
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '40px', height: '40px' }}>
              <AvatarFallback name={voter!.fullName} src={voter!.avatarUrl} />
            </div>
          </div>
        ))}
        {voters.length > 5 && (
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-color)' }}>
            +{voters.length - 5}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="poll-message-card" style={{ 
      background: 'var(--background-color)', 
      border: '1px solid var(--border-color)', 
      borderRadius: '12px', 
      padding: '16px',
      minWidth: '280px',
      maxWidth: '350px'
    }}>
      <div className="poll-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <PieChart size={18} style={{ color: 'var(--accent-color)' }} />
          <strong style={{ fontSize: '15px' }}>{t('pollTitle')}</strong>
        </div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, lineHeight: 1.4 }}>{poll.question}</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--subtle)' }}>
          {poll.allowMultipleAnswers && <span>{t('multipleChoiceLabel')}</span>}
          {poll.isAnonymous && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {t('anonymousLabel')}</span>}
        </div>
      </div>

      <div className="poll-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {poll.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id)
          const isVotedByMe = userPreviousVotes.includes(option.id)
          const voteCount = option.voterIds.length
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

          return (
            <div key={option.id} className="poll-option-item">
              <button
                type="button"
                disabled={isPollEnded}
                onClick={() => handleToggleOption(option.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--accent-color-transparent)' : 'var(--input-bg)',
                  cursor: isPollEnded ? 'default' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                {canViewResults && (
                  <div 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${percentage}%`,
                      backgroundColor: isVotedByMe ? 'var(--accent-color)' : 'var(--border-color)',
                      opacity: isVotedByMe ? 0.15 : 0.4,
                      transition: 'width 0.5s ease-out'
                    }} 
                  />
                )}
                
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: poll.allowMultipleAnswers ? '4px' : '50%', 
                    border: isSelected ? 'none' : '2px solid var(--subtle)',
                    backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                  </div>
                  
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: isSelected ? 500 : 400 }}>{option.text}</span>
                  
                  {canViewResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{percentage}%</span>
                      <span style={{ fontSize: '11px', color: 'var(--subtle)' }}>{t('pollVotes', { count: voteCount })}</span>
                    </div>
                  )}
                </div>
              </button>
              
              {canViewResults && renderVoters(option.voterIds)}
            </div>
          )
        })}
      </div>

      <div className="poll-footer" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
        {!isPollEnded ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSubmitVote}
              disabled={selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                opacity: (selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())) ? 0.5 : 1
              }}
            >
              {hasVoted ? t('changeVoteBtn') : t('voteBtn')}
            </button>
            {hasVoted && (
              <button
                type="button"
                onClick={handleCancelVote}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--danger-color, #ef4444)',
                  border: '1px solid var(--danger-color, #ef4444)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {t('cancelVoteBtn')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--subtle)', fontSize: '13px', fontWeight: 500 }}>
            <AlertCircle size={16} />
            {t('pollEnded')}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--subtle)' }}>
          <span>{t('totalVoters', { count: totalVotes })}</span>
          {poll.endTime && !isPollEnded && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              {t('pollEndsAt', { time: new Date(poll.endTime).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) })}
            </span>
          )}
        </div>
        {poll.hideResultsUntilEnd && !isPollEnded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '11px', color: 'var(--subtle)', justifyContent: 'center' }}>
            <CheckCircle2 size={12} />
            {t('pollResultsHidden')}
          </div>
        )}
      </div>
    </div>
  )
}
