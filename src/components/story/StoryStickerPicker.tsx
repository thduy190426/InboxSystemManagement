import { useState } from 'react'
import { X, Smile, MapPin, Plus, Vote, SlidersHorizontal, Hourglass } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface StoryOverlayItem {
  id: string
  type: 'text' | 'emoji' | 'location' | 'hashtag' | 'mention' | 'poll' | 'slider' | 'countdown'
  text?: string
  value?: string
  color?: string
  bgColor?: string
  font?: string
  x: number 
  y: number 
  scale?: number
  
  pollData?: {
    question: string
    options: [string, string]
  }
  sliderData?: {
    question: string
    emoji: string
  }
  countdownData?: {
    title: string
    targetDate: string
  }
}

interface StoryStickerPickerProps {
  onAddOverlay: (item: StoryOverlayItem) => void
  onClose: () => void
}

const POPULAR_EMOJIS = [
  '❤️', '🔥', '🎉', '✨', '🌟', '☕',
  '😎', '🥳', '🌈', '🍕', '🎵', '🏖️',
  '🚀', '💯', '🍰', '🍔', '🌸', '⚡',
  '🍀', '🥑', '🎂', '🏀', '🎮', '🌙',
  '☀️', '💎', '💡', '📸', '🎈', '💖',
  '🤩', '🥰', '🤙', '🙌', '🍹', '🌴'
]

const QUICK_LOCATIONS = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Đà Lạt', 'Phú Quốc', 'Nha Trang']
const QUICK_HASHTAGS = ['#weekend', '#travel', '#chill', '#foodie', '#vibe', '#daily']
const SLIDER_EMOJIS = ['😍', '🔥', '❤️', '👏', '🥳', '🥺', '☕', '🌟']

export function StoryStickerPicker({ onAddOverlay, onClose }: StoryStickerPickerProps) {
  const { t } = useTranslation('story')
  const [activeTab, setActiveTab] = useState<'emoji' | 'poll' | 'slider' | 'countdown' | 'location' | 'hashtag' | 'mention'>('emoji')

  
  const [locationInput, setLocationInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [mentionInput, setMentionInput] = useState('')

  
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptA, setPollOptA] = useState('Có')
  const [pollOptB, setPollOptB] = useState('Không')

  
  const [sliderQuestion, setSliderQuestion] = useState('')
  const [selectedSliderEmoji, setSelectedSliderEmoji] = useState('😍')

  
  const [countdownTitle, setCountdownTitle] = useState('')
  const [countdownTarget, setCountdownTarget] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16)
  })

  const handlePickEmoji = (emoji: string) => {
    onAddOverlay({
      id: `overlay-emoji-${Date.now()}`,
      type: 'emoji',
      value: emoji,
      x: 50,
      y: 50,
      scale: 1,
    })
    onClose()
  }

  const handleAddPoll = () => {
    onAddOverlay({
      id: `overlay-poll-${Date.now()}`,
      type: 'poll',
      pollData: {
        question: pollQuestion.trim() || 'Bạn nghĩ thế nào?',
        options: [pollOptA.trim() || 'Có', pollOptB.trim() || 'Không'],
      },
      x: 50,
      y: 45,
      scale: 1,
    })
    onClose()
  }

  const handleAddSlider = () => {
    onAddOverlay({
      id: `overlay-slider-${Date.now()}`,
      type: 'slider',
      sliderData: {
        question: sliderQuestion.trim() || 'Mức độ yêu thích?',
        emoji: selectedSliderEmoji,
      },
      x: 50,
      y: 50,
      scale: 1,
    })
    onClose()
  }

  const handleAddCountdown = () => {
    onAddOverlay({
      id: `overlay-countdown-${Date.now()}`,
      type: 'countdown',
      countdownData: {
        title: countdownTitle.trim() || 'Sự kiện sắp tới 🎉',
        targetDate: new Date(countdownTarget).toISOString(),
      },
      x: 50,
      y: 45,
      scale: 1,
    })
    onClose()
  }

  const handleAddLocation = (locName: string) => {
    const trimmed = locName.trim()
    if (!trimmed) return
    onAddOverlay({
      id: `overlay-loc-${Date.now()}`,
      type: 'location',
      text: trimmed,
      x: 50,
      y: 45,
      scale: 1,
    })
    onClose()
  }

  const handleAddHashtag = (tag: string) => {
    let clean = tag.trim()
    if (!clean) return
    if (!clean.startsWith('#')) clean = `#${clean}`
    onAddOverlay({
      id: `overlay-hash-${Date.now()}`,
      type: 'hashtag',
      text: clean,
      x: 50,
      y: 55,
      scale: 1,
    })
    onClose()
  }

  const handleAddMention = (username: string) => {
    let clean = username.trim()
    if (!clean) return
    if (!clean.startsWith('@')) clean = `@${clean}`
    onAddOverlay({
      id: `overlay-men-${Date.now()}`,
      type: 'mention',
      text: clean,
      x: 50,
      y: 60,
      scale: 1,
    })
    onClose()
  }

  return (
    <div className="story-picker-drawer">
      {}
      <div className="story-picker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smile size={20} color="#ec4899" />
          <h3>{t('stickersTitle', { defaultValue: 'Nhãn dán & Tiện ích' })}</h3>
        </div>
        <button
          type="button"
          className="story-camera-circle-btn"
          style={{ width: '36px', height: '36px' }}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {}
      <div className="story-sticker-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'emoji' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('emoji')}
        >
          Emoji
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'poll' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('poll')}
        >
          Bình chọn
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'slider' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('slider')}
        >
          Cảm xúc
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'countdown' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('countdown')}
        >
          Đếm ngược
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'location' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          Vị trí
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'hashtag' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('hashtag')}
        >
          Hashtag
        </button>
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'mention' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('mention')}
        >
          Nhắc tên
        </button>
      </div>

      {}
      {activeTab === 'emoji' && (
        <div className="story-emoji-grid">
          {POPULAR_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              className="story-emoji-btn"
              onClick={() => handlePickEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {}
      {activeTab === 'poll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
              Câu hỏi bình chọn:
            </label>
            <input
              type="text"
              className="cp-input"
              placeholder="Đặt câu hỏi (ví dụ: Tối nay ăn gì?)..."
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
                Lựa chọn 1:
              </label>
              <input
                type="text"
                className="cp-input"
                placeholder="Có"
                value={pollOptA}
                onChange={e => setPollOptA(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
                Lựa chọn 2:
              </label>
              <input
                type="text"
                className="cp-input"
                placeholder="Không"
                value={pollOptB}
                onChange={e => setPollOptB(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="cp-btn cp-btn--primary"
            style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleAddPoll}
          >
            <Vote size={16} />
            <span>Thêm Bình Chọn vào Story</span>
          </button>
        </div>
      )}

      {}
      {activeTab === 'slider' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
              Câu hỏi cảm xúc:
            </label>
            <input
              type="text"
              className="cp-input"
              placeholder="Hỏi cảm xúc (ví dụ: Bạn thấy thế nào?)..."
              value={sliderQuestion}
              onChange={e => setSliderQuestion(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>
              Chọn Emoji thanh trượt:
            </label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
              {SLIDER_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  style={{
                    fontSize: '1.6rem',
                    background: selectedSliderEmoji === emoji ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    border: selectedSliderEmoji === emoji ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    transform: selectedSliderEmoji === emoji ? 'scale(1.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedSliderEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="cp-btn cp-btn--primary"
            style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleAddSlider}
          >
            <SlidersHorizontal size={16} />
            <span>Thêm Thanh Trượt Cảm Xúc</span>
          </button>
        </div>
      )}

      {}
      {activeTab === 'countdown' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
              Tên sự kiện đếm ngược:
            </label>
            <input
              type="text"
              className="cp-input"
              placeholder="Tên sự kiện (ví dụ: Sinh nhật, Ra mắt sản phẩm)..."
              value={countdownTitle}
              onChange={e => setCountdownTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>
              Thời điểm kết thúc:
            </label>
            <input
              type="datetime-local"
              className="cp-input"
              value={countdownTarget}
              onChange={e => setCountdownTarget(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <button
            type="button"
            className="cp-btn cp-btn--primary"
            style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleAddCountdown}
          >
            <Hourglass size={16} />
            <span>Thêm Đồng Hồ Đếm Ngược</span>
          </button>
        </div>
      )}

      {}
      {activeTab === 'location' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="cp-input"
                placeholder="Nhập địa điểm (ví dụ: Hà Nội)..."
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddLocation(locationInput)}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="cp-btn cp-btn--primary"
              onClick={() => handleAddLocation(locationInput)}
              disabled={!locationInput.trim()}
            >
              <Plus size={16} />
              <span>Thêm</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {QUICK_LOCATIONS.map(loc => (
              <button
                key={loc}
                type="button"
                className="story-location-tag"
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => handleAddLocation(loc)}
              >
                <MapPin size={14} color="#ef4444" />
                <span>{loc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {}
      {activeTab === 'hashtag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="cp-input"
                placeholder="Nhập hashtag (ví dụ: #dulich)..."
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddHashtag(hashtagInput)}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="cp-btn cp-btn--primary"
              onClick={() => handleAddHashtag(hashtagInput)}
              disabled={!hashtagInput.trim()}
            >
              <Plus size={16} />
              <span>Thêm</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {QUICK_HASHTAGS.map(tag => (
              <button
                key={tag}
                type="button"
                className="story-hashtag-tag"
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => handleAddHashtag(tag)}
              >
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {}
      {activeTab === 'mention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="cp-input"
                placeholder="Nhập tên người dùng (ví dụ: linh_dan)..."
                value={mentionInput}
                onChange={e => setMentionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMention(mentionInput)}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="cp-btn cp-btn--primary"
              onClick={() => handleAddMention(mentionInput)}
              disabled={!mentionInput.trim()}
            >
              <Plus size={16} />
              <span>Nhắc</span>
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            Thêm thẻ nhắc tên bạn bè để họ nhận thông báo khi xem Story của bạn.
          </p>
        </div>
      )}
    </div>
  )
}
