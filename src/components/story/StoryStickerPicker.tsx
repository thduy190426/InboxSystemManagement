import { useState } from 'react'
import { X, Smile, MapPin, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface StoryOverlayItem {
  id: string
  type: 'text' | 'emoji' | 'location' | 'hashtag' | 'mention'
  text?: string
  value?: string
  color?: string
  bgColor?: string
  font?: string
  x: number // Tọa độ % (0 -> 100)
  y: number // Tọa độ % (0 -> 100)
  scale?: number
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

export function StoryStickerPicker({ onAddOverlay, onClose }: StoryStickerPickerProps) {
  const { t } = useTranslation('story')
  const [activeTab, setActiveTab] = useState<'emoji' | 'location' | 'hashtag' | 'mention'>('emoji')

  const [locationInput, setLocationInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [mentionInput, setMentionInput] = useState('')

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
      {/* Header */}
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

      {/* Navigation Tabs */}
      <div className="story-sticker-tabs">
        <button
          type="button"
          className={`story-sticker-tab-btn ${activeTab === 'emoji' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('emoji')}
        >
          Emoji
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
          Nhắc tên (@)
        </button>
      </div>

      {/* Tab 1: Emoji Grid */}
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

      {/* Tab 2: Location Tag */}
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

      {/* Tab 3: Hashtag Tag */}
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

      {/* Tab 4: Mention Tag */}
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
