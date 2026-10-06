import React, { useState } from 'react'
import { X, Plus, Trash2, Clock, Users, CheckSquare, EyeOff, ListPlus } from 'lucide-react'
import type { MessagePoll } from '../../types'
import { useTranslation } from 'react-i18next'

type CreatePollModalProps = {
  onClose: () => void
  onSubmit: (pollData: Omit<MessagePoll, 'id' | 'totalVotes' | 'isClosed'>) => void
}

export function CreatePollModal({ onClose, onSubmit }: CreatePollModalProps) {
  const { t } = useTranslation('panels')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }])
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hideResultsUntilEnd, setHideResultsUntilEnd] = useState(false)
  const [endTimeValue, setEndTimeValue] = useState('')
  const [hasEndTime, setHasEndTime] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 140)
  }

  const handleAddOption = () => {
    if (options.length >= 10) return
    setOptions([...options, { id: Math.random().toString(36).substring(7), text: '' }])
  }

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return
    setOptions(options.filter((opt) => opt.id !== id))
  }

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validOptions = options.filter(opt => opt.text.trim() !== '')
    if (question.trim() === '' || validOptions.length < 2) {
      alert(t('pollValidationErr'))
      return
    }

    let endTime: string | undefined
    if (hasEndTime && endTimeValue) {
      endTime = new Date(endTimeValue).toISOString()
    }

    setIsExiting(true)
    setTimeout(() => {
      onSubmit({
        question: question.trim(),
        options: validOptions.map(opt => ({
          id: Math.random().toString(36).substring(7),
          text: opt.text.trim(),
          voterIds: []
        })),
        allowMultipleAnswers,
        isAnonymous,
        hideResultsUntilEnd,
        endTime
      })
    }, 140)
  }

  return (
    <div className={`forward-dialog-backdrop ${isExiting ? 'is-exiting' : ''}`} role="presentation">
      <section aria-modal="true" className={`forward-dialog create-poll-dialog ${isExiting ? 'is-exiting' : ''}`} role="dialog" style={{ width: '450px', maxWidth: '95vw', padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.3)' }}>
        <header style={{ padding: '20px 24px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '10px' }}>
              <ListPlus size={20} color="white" />
            </div>
            <strong style={{ fontSize: '18px', fontWeight: 600 }}>{t('createPollTitle')}</strong>
          </div>
          <button onClick={handleClose} title={t('closeBtn')} type="button" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '1'} onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}>
            <X size={20} />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="poll-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-color)' }}>{t('pollQuestionLabel')}</label>
            <input
              autoFocus
              placeholder={t('pollQuestionPlaceholder')}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid transparent', background: 'var(--input-bg)', fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.background = 'var(--background-color)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--input-bg)'; }}
              required
            />
          </div>

          <div className="poll-options-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-color)' }}>{t('pollOptionsLabel')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((opt, index) => (
                <div key={opt.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--subtle)', flexShrink: 0 }}>
                    {index + 1}
                  </div>
                  <input
                    placeholder={t('pollOptionPlaceholder', { number: index + 1 })}
                    value={opt.text}
                    onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '2px solid transparent', background: 'var(--input-bg)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.background = 'var(--background-color)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--input-bg)'; }}
                    required={index < 2}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(opt.id)} title={t('removeOption')} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color, #ef4444)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', opacity: 0.6, transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button 
                type="button" 
                onClick={handleAddOption}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', background: 'var(--accent-color-transparent, rgba(147, 51, 234, 0.1))', border: '1px dashed var(--accent-color)', padding: '12px', borderRadius: '12px', cursor: 'pointer', marginTop: '4px', fontWeight: 600, fontSize: '14px', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-color)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--accent-color-transparent, rgba(147, 51, 234, 0.1))'; e.currentTarget.style.color = 'var(--accent-color)'; }}
              >
                <Plus size={18} />
                {t('addPollOption')}
              </button>
            )}
          </div>

          <div className="poll-settings-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', background: 'var(--input-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckSquare size={18} style={{ color: 'var(--accent-color)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('allowMultipleAnswers')}</span>
              </div>
              <div className={`cp-toggle ${allowMultipleAnswers ? 'is-active' : ''}`} style={{ width: '40px', height: '24px', borderRadius: '12px', background: allowMultipleAnswers ? 'var(--accent-color)' : 'var(--border-color)', position: 'relative', transition: 'all 0.3s' }}>
                <input type="checkbox" checked={allowMultipleAnswers} onChange={(e) => setAllowMultipleAnswers(e.target.checked)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0, zIndex: 2 }} />
                <div style={{ position: 'absolute', top: '2px', left: allowMultipleAnswers ? '18px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} style={{ color: '#06b6d4' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('anonymousPoll')}</span>
              </div>
              <div className={`cp-toggle ${isAnonymous ? 'is-active' : ''}`} style={{ width: '40px', height: '24px', borderRadius: '12px', background: isAnonymous ? 'var(--accent-color)' : 'var(--border-color)', position: 'relative', transition: 'all 0.3s' }}>
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0, zIndex: 2 }} />
                <div style={{ position: 'absolute', top: '2px', left: isAnonymous ? '18px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <EyeOff size={18} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('hideResultsUntilEnd')}</span>
              </div>
              <div className={`cp-toggle ${hideResultsUntilEnd ? 'is-active' : ''}`} style={{ width: '40px', height: '24px', borderRadius: '12px', background: hideResultsUntilEnd ? 'var(--accent-color)' : 'var(--border-color)', position: 'relative', transition: 'all 0.3s' }}>
                <input type="checkbox" checked={hideResultsUntilEnd} onChange={(e) => setHideResultsUntilEnd(e.target.checked)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0, zIndex: 2 }} />
                <div style={{ position: 'absolute', top: '2px', left: hideResultsUntilEnd ? '18px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </label>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={18} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('setPollEndTime')}</span>
                </div>
                <div className={`cp-toggle ${hasEndTime ? 'is-active' : ''}`} style={{ width: '40px', height: '24px', borderRadius: '12px', background: hasEndTime ? 'var(--accent-color)' : 'var(--border-color)', position: 'relative', transition: 'all 0.3s' }}>
                  <input type="checkbox" checked={hasEndTime} onChange={(e) => setHasEndTime(e.target.checked)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0, zIndex: 2 }} />
                  <div style={{ position: 'absolute', top: '2px', left: hasEndTime ? '18px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </label>
              {hasEndTime && (
                <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                  <input 
                    type="datetime-local" 
                    value={endTimeValue}
                    onChange={(e) => setEndTimeValue(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid var(--accent-color)', background: 'var(--background-color)', color: 'var(--text-color)', fontSize: '14px', outline: 'none' }}
                    min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-color)', fontWeight: 600, fontSize: '15px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--input-bg)'}>
              {t('cancelBtn')}
            </button>
            <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <ListPlus size={18} />
              <span>{t('createPollTitle')}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
