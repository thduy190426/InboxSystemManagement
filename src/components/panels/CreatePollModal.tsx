import React, { useState } from 'react'
import { X, Plus, Trash2, Clock, Users, CheckSquare, EyeOff, ListPlus } from 'lucide-react'
import type { MessagePoll } from '../../types'

type CreatePollModalProps = {
  onClose: () => void
  onSubmit: (pollData: Omit<MessagePoll, 'id' | 'totalVotes' | 'isClosed'>) => void
}

export function CreatePollModal({ onClose, onSubmit }: CreatePollModalProps) {
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
      alert('Vui lòng nhập câu hỏi và ít nhất 2 lựa chọn')
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
      <section aria-modal="true" className={`forward-dialog create-poll-dialog ${isExiting ? 'is-exiting' : ''}`} role="dialog" style={{ width: '400px', maxWidth: '90vw' }}>
        <header>
          <div>
            <strong>Tạo bình chọn</strong>
          </div>
          <button onClick={handleClose} title="Đóng" type="button">
            <X size={17} />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          <div className="poll-input-group">
            <label style={{ fontWeight: 500, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Câu hỏi bình chọn *</label>
            <input
              autoFocus
              placeholder="Đặt câu hỏi..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}
              required
            />
          </div>

          <div className="poll-options-group">
            <label style={{ fontWeight: 500, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Các lựa chọn *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, index) => (
                <div key={opt.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    placeholder={`Lựa chọn ${index + 1}`}
                    value={opt.text}
                    onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}
                    required={index < 2}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(opt.id)} className="icon-button is-danger" style={{ padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button 
                type="button" 
                onClick={handleAddOption}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', background: 'transparent', border: 'none', padding: '8px 0', cursor: 'pointer', marginTop: '4px', fontWeight: 500 }}
              >
                <Plus size={16} />
                Thêm lựa chọn
              </button>
            )}
          </div>

          <div className="poll-settings-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={allowMultipleAnswers} onChange={(e) => setAllowMultipleAnswers(e.target.checked)} />
              <CheckSquare size={16} style={{ color: 'var(--subtle)' }} />
              <span style={{ fontSize: '14px' }}>Cho phép chọn nhiều đáp án</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
              <Users size={16} style={{ color: 'var(--subtle)' }} />
              <span style={{ fontSize: '14px' }}>Bình chọn ẩn danh</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={hideResultsUntilEnd} onChange={(e) => setHideResultsUntilEnd(e.target.checked)} />
              <EyeOff size={16} style={{ color: 'var(--subtle)' }} />
              <span style={{ fontSize: '14px' }}>Ẩn kết quả trước khi kết thúc</span>
            </label>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={hasEndTime} onChange={(e) => setHasEndTime(e.target.checked)} />
                <Clock size={16} style={{ color: 'var(--subtle)' }} />
                <span style={{ fontSize: '14px' }}>Thiết lập thời gian đóng</span>
              </label>
              {hasEndTime && (
                <input 
                  type="datetime-local" 
                  value={endTimeValue}
                  onChange={(e) => setEndTimeValue(e.target.value)}
                  style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}
                  min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                  required
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-color)' }}>
              <X size={16} />
              <span>Hủy</span>
            </button>
            <button type="submit" className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              <ListPlus size={16} />
              <span>Tạo bình chọn</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
