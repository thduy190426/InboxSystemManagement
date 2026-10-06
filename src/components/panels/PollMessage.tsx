import { useState, useMemo, useEffect } from 'react'
import { Check, Clock, Users, PieChart, AlertCircle, CheckSquare, EyeOff } from 'lucide-react'
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
      background: 'linear-gradient(to bottom, var(--background-color), var(--input-bg))', 
      border: '1px solid var(--border-color)', 
      borderRadius: '16px', 
      padding: '20px',
      minWidth: '300px',
      maxWidth: '380px',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div className="poll-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-color-transparent, rgba(147, 51, 234, 0.1))', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
            <PieChart size={14} />
            <span>{t('pollTitle')}</span>
          </div>
          {isPollEnded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
              <AlertCircle size={12} />
              {t('pollEnded')}
            </div>
          )}
        </div>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-color)' }}>{poll.question}</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12px', color: 'var(--subtle)' }}>
          {poll.allowMultipleAnswers && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckSquare size={12} /> {t('multipleChoiceLabel')}</span>}
          {poll.isAnonymous && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {t('anonymousLabel')}</span>}
        </div>
      </div>

      <div className="poll-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {poll.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id)
          const isVotedByMe = userPreviousVotes.includes(option.id)
          const voteCount = option.voterIds.length
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
          
          let isWinner = false
          if (isPollEnded && totalVotes > 0) {
            const maxVotes = Math.max(...poll.options.map(o => o.voterIds.length))
            isWinner = voteCount === maxVotes && maxVotes > 0
          }

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
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--accent-color)' : isWinner ? '2px solid #f59e0b' : '2px solid transparent',
                  background: isSelected ? 'var(--background-color)' : 'var(--background-color)',
                  boxShadow: isSelected ? '0 4px 12px rgba(147, 51, 234, 0.15)' : 'inset 0 0 0 1px var(--border-color)',
                  cursor: isPollEnded ? 'default' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (!isPollEnded && !isSelected) {
                    e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--accent-color)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isPollEnded && !isSelected) {
                    e.currentTarget.style.boxShadow = isWinner ? 'none' : 'inset 0 0 0 1px var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
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
                      background: isWinner ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)' : isVotedByMe ? 'linear-gradient(90deg, var(--accent-color-transparent, rgba(147, 51, 234, 0.2)) 0%, rgba(147, 51, 234, 0.05) 100%)' : 'var(--input-bg)',
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} 
                  />
                )}
                
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: poll.allowMultipleAnswers ? '6px' : '50%', 
                    border: isSelected ? 'none' : isWinner ? '2px solid #f59e0b' : '2px solid var(--subtle)',
                    backgroundColor: isSelected ? 'var(--accent-color)' : isWinner ? '#f59e0b' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}>
                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                    {!isSelected && isWinner && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: isSelected || isWinner ? 600 : 400, color: isWinner ? '#f59e0b' : 'inherit' }}>{option.text}</span>
                  
                  {canViewResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '40px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: isWinner ? '#f59e0b' : 'inherit' }}>{percentage}%</span>
                      <span style={{ fontSize: '11px', color: 'var(--subtle)' }}>{voteCount} {t('pollVotes', { count: voteCount }).split(' ')[1] || 'votes'}</span>
                    </div>
                  )}
                </div>
              </button>
              
              {canViewResults && renderVoters(option.voterIds)}
            </div>
          )
        })}
      </div>

      <div className="poll-footer" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
        {!isPollEnded ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSubmitVote}
              disabled={selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                background: (selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())) ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)',
                color: (selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())) ? 'var(--subtle)' : 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: (selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())) ? 'default' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: (selectedOptionIds.length === 0 || JSON.stringify(selectedOptionIds.sort()) === JSON.stringify(userPreviousVotes.sort())) ? 'none' : '0 4px 12px rgba(147, 51, 234, 0.3)'
              }}
            >
              {hasVoted ? t('changeVoteBtn') : t('voteBtn')}
            </button>
            {hasVoted && (
              <button
                type="button"
                onClick={handleCancelVote}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  color: 'var(--danger-color, #ef4444)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.border = '1px solid #ef4444'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.3)'; }}
              >
                {t('cancelVoteBtn')}
              </button>
            )}
          </div>
        ) : null}
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: !isPollEnded ? '16px' : '0', fontSize: '13px', color: 'var(--subtle)' }}>
          <span style={{ fontWeight: 500 }}>{t('totalVoters', { count: totalVotes })}</span>
          {poll.endTime && !isPollEnded && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '6px' }}>
              <Clock size={12} />
              {new Date(poll.endTime).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {poll.hideResultsUntilEnd && !isPollEnded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: '#f59e0b', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px' }}>
            <EyeOff size={14} />
            <span style={{ fontWeight: 500 }}>{t('pollResultsHidden')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
