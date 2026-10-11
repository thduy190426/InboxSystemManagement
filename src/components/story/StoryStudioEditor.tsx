import { useState, useRef, useEffect } from 'react'
import {
  X,
  Type,
  Smile,
  Music,
  Sliders,
  Eye,
  Trash2,
  Send,
  Globe,
  Users,
  Star,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StoryFilterSelector, STORY_FILTERS } from './StoryFilterSelector'
import { StoryMusicPicker } from './StoryMusicPicker'
import type { StoryMusicTrack } from './StoryMusicPicker'
import { StoryStickerPicker } from './StoryStickerPicker'
import type { StoryOverlayItem } from './StoryStickerPicker'

export interface StoryStudioMetadata {
  version: 2
  caption?: string
  filter: string
  music: StoryMusicTrack | null
  overlays: StoryOverlayItem[]
}

interface StoryStudioEditorProps {
  mediaFile: File
  initialPrivacy?: 'public' | 'friends' | 'close_friends' | 'only_me'
  onPublish: (metadata: StoryStudioMetadata, privacy: 'public' | 'friends' | 'close_friends' | 'only_me') => void
  onClose: () => void
}

const TEXT_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

const FONT_OPTIONS = [
  { id: 'modern', label: 'Hiện đại', class: 'story-font-modern' },
  { id: 'handwritten', label: 'Viết tay', class: 'story-font-handwritten' },
  { id: 'impact', label: 'Nổi bật', class: 'story-font-impact' },
  { id: 'typewriter', label: 'Máy chữ', class: 'story-font-typewriter' },
]

export function StoryStudioEditor({
  mediaFile,
  initialPrivacy = 'friends',
  onPublish,
  onClose,
}: StoryStudioEditorProps) {
  const { t } = useTranslation('story')

  const [mediaUrl, setMediaUrl] = useState<string>('')
  const isVideo = mediaFile.type.startsWith('video/')

  // Studio Elements State
  const [selectedFilter, setSelectedFilter] = useState('normal')
  const [selectedMusic, setSelectedMusic] = useState<StoryMusicTrack | null>(null)
  const [overlays, setOverlays] = useState<StoryOverlayItem[]>([])
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'close_friends' | 'only_me'>(initialPrivacy)
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false)

  // Drawers / Sub-views
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'text' | 'stickers' | 'music' | 'filters' | 'preview'>('none')

  // Text editor sub-state
  const [textDraft, setTextDraft] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textBgStyle, setTextBgStyle] = useState<'none' | 'box' | 'solid'>('box')
  const [textFont, setTextFont] = useState('modern')
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)

  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(null)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; itemX: number; itemY: number } | null>(null)

  // Background preview music player
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(mediaFile)
    setMediaUrl(url)
    return () => {
      URL.revokeObjectURL(url)
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause()
        audioPreviewRef.current.src = ''
      }
    }
  }, [mediaFile])

  // Play background music if in Preview mode
  useEffect(() => {
    if (activeDrawer === 'preview' && selectedMusic) {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio()
      }
      audioPreviewRef.current.src = selectedMusic.url
      audioPreviewRef.current.play().catch(e => console.warn('Preview audio play error:', e))
    } else if (audioPreviewRef.current) {
      audioPreviewRef.current.pause()
    }
  }, [activeDrawer, selectedMusic])

  // Lấy class filter hiện tại
  const currentFilterClass =
    STORY_FILTERS.find(f => f.id === selectedFilter)?.className || 'story-filter-normal'

  // Thêm overlay mới từ sticker picker
  const handleAddOverlay = (newItem: StoryOverlayItem) => {
    setOverlays(prev => [...prev, newItem])
    setActiveOverlayId(newItem.id)
  }

  // Mở trình soạn thảo văn bản
  const handleOpenTextEditor = (existingItem?: StoryOverlayItem) => {
    if (existingItem) {
      setEditingOverlayId(existingItem.id)
      setTextDraft(existingItem.text || '')
      setTextColor(existingItem.color || '#ffffff')
      setTextBgStyle((existingItem.bgColor as any) || 'box')
      setTextFont(existingItem.font || 'modern')
    } else {
      setEditingOverlayId(null)
      setTextDraft('')
      setTextColor('#ffffff')
      setTextBgStyle('box')
      setTextFont('modern')
    }
    setActiveDrawer('text')
  }

  // Lưu text overlay
  const handleSaveTextOverlay = () => {
    const trimmed = textDraft.trim()
    if (!trimmed) {
      if (editingOverlayId) {
        setOverlays(prev => prev.filter(item => item.id !== editingOverlayId))
      }
      setActiveDrawer('none')
      return
    }

    if (editingOverlayId) {
      setOverlays(prev =>
        prev.map(item =>
          item.id === editingOverlayId
            ? {
                ...item,
                text: trimmed,
                color: textColor,
                bgColor: textBgStyle,
                font: textFont,
              }
            : item
        )
      )
    } else {
      const newItem: StoryOverlayItem = {
        id: `overlay-text-${Date.now()}`,
        type: 'text',
        text: trimmed,
        color: textColor,
        bgColor: textBgStyle,
        font: textFont,
        x: 50,
        y: 40,
        scale: 1,
      }
      setOverlays(prev => [...prev, newItem])
      setActiveOverlayId(newItem.id)
    }
    setActiveDrawer('none')
  }

  // Xóa overlay
  const handleDeleteOverlay = (id: string) => {
    setOverlays(prev => prev.filter(item => item.id !== id))
    if (activeOverlayId === id) setActiveOverlayId(null)
  }

  // Xử lý kéo thả bằng Pointer Events (chuột & cảm ứng điện thoại)
  const handlePointerDown = (e: React.PointerEvent, item: StoryOverlayItem) => {
    e.stopPropagation()
    setActiveOverlayId(item.id)
    setDraggingOverlayId(item.id)
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingOverlayId || !dragStartPosRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    const deltaX = ((e.clientX - dragStartPosRef.current.clientX) / rect.width) * 100
    const deltaY = ((e.clientY - dragStartPosRef.current.clientY) / rect.height) * 100

    const newX = Math.max(5, Math.min(95, dragStartPosRef.current.itemX + deltaX))
    const newY = Math.max(5, Math.min(95, dragStartPosRef.current.itemY + deltaY))

    setOverlays(prev =>
      prev.map(item => (item.id === draggingOverlayId ? { ...item, x: newX, y: newY } : item))
    )

    // Nếu kéo xuống sát đáy (> 82%) thì kích hoạt vùng thùng rác
    setIsOverTrash(newY > 82)
  }

  const handlePointerUp = () => {
    if (!draggingOverlayId) return

    if (isOverTrash) {
      handleDeleteOverlay(draggingOverlayId)
    }

    setDraggingOverlayId(null)
    setIsOverTrash(false)
    dragStartPosRef.current = null
  }

  // Gửi bài đăng
  const handlePublishClick = () => {
    const metadata: StoryStudioMetadata = {
      version: 2,
      caption: '',
      filter: selectedFilter,
      music: selectedMusic,
      overlays,
    }
    onPublish(metadata, privacy)
  }

  // Render text overlay theo styles
  const renderTextOverlayStyle = (item: StoryOverlayItem) => {
    let background = 'transparent'
    let color = item.color || '#fff'

    if (item.bgColor === 'box') {
      background = 'rgba(0, 0, 0, 0.65)'
      if (item.color === '#000000') {
        background = 'rgba(255, 255, 255, 0.75)'
      }
    } else if (item.bgColor === 'solid') {
      background = item.color || '#fff'
      color = item.color === '#000000' ? '#fff' : '#000'
    }

    return {
      color,
      background,
    }
  }

  return (
    <div className="story-studio-modal-overlay">
      <div className="story-studio-container">
        {/* Top Action Toolbar */}
        <header className="story-studio-top-toolbar">
          <button
            type="button"
            className="story-camera-circle-btn"
            style={{ width: '38px', height: '38px' }}
            onClick={onClose}
            title="Đóng / Hủy"
          >
            <X size={20} />
          </button>

          <div className="story-studio-tools-group">
            {/* Thêm chữ Text */}
            <button
              type="button"
              className={`story-studio-tool-btn ${activeDrawer === 'text' ? 'is-active' : ''}`}
              onClick={() => handleOpenTextEditor()}
              title="Thêm văn bản"
            >
              <Type size={18} />
            </button>

            {/* Sticker / Emoji */}
            <button
              type="button"
              className={`story-studio-tool-btn ${activeDrawer === 'stickers' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer(d => (d === 'stickers' ? 'none' : 'stickers'))}
              title="Nhãn dán & Emoji"
            >
              <Smile size={18} />
            </button>

            {/* Nhạc nền */}
            <button
              type="button"
              className={`story-studio-tool-btn ${selectedMusic ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer(d => (d === 'music' ? 'none' : 'music'))}
              title="Nhạc nền"
            >
              <Music size={18} />
            </button>

            {/* Bộ lọc CSS */}
            <button
              type="button"
              className={`story-studio-tool-btn ${selectedFilter !== 'normal' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer(d => (d === 'filters' ? 'none' : 'filters'))}
              title="Bộ lọc màu"
            >
              <Sliders size={18} />
            </button>

            {/* Xem trước */}
            <button
              type="button"
              className={`story-studio-tool-btn ${activeDrawer === 'preview' ? 'is-active' : ''}`}
              onClick={() => setActiveDrawer(d => (d === 'preview' ? 'none' : 'preview'))}
              title="Xem trước Story"
            >
              <Eye size={18} />
            </button>
          </div>
        </header>

        {/* Studio Canvas Area (9:16) */}
        <div
          ref={canvasRef}
          className="story-studio-canvas-area"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setActiveOverlayId(null)}
        >
          {/* Media Player / Image with Filter */}
          {isVideo ? (
            <video
              src={mediaUrl}
              autoPlay
              loop
              muted={activeDrawer !== 'preview'}
              playsInline
              className={`story-studio-media ${currentFilterClass}`}
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Story draft"
              className={`story-studio-media ${currentFilterClass}`}
            />
          )}

          {/* Music badge preview inside canvas if selected */}
          {selectedMusic && (
            <div className="story-viewer-music-badge">
              <div className="story-spinning-disc" />
              <span>{selectedMusic.title}</span>
            </div>
          )}

          {/* Overlays Rendering */}
          {overlays.map(item => {
            const isSelected = activeOverlayId === item.id

            return (
              <div
                key={item.id}
                className={`story-studio-overlay-item ${isSelected ? 'is-selected' : ''}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                }}
                onPointerDown={e => handlePointerDown(e, item)}
                onClick={e => {
                  e.stopPropagation()
                  if (item.type === 'text') {
                    handleOpenTextEditor(item)
                  }
                }}
              >
                {item.type === 'text' && (
                  <div
                    className={`story-text-overlay story-font-${item.font || 'modern'}`}
                    style={renderTextOverlayStyle(item)}
                  >
                    {item.text}
                  </div>
                )}

                {item.type === 'emoji' && (
                  <span className="story-sticker-overlay">{item.value}</span>
                )}

                {item.type === 'location' && (
                  <div className="story-location-tag">
                    <span style={{ color: '#ef4444' }}>📍</span>
                    <span>{item.text}</span>
                  </div>
                )}

                {item.type === 'hashtag' && (
                  <div className="story-hashtag-tag">
                    <span>{item.text}</span>
                  </div>
                )}

                {item.type === 'mention' && (
                  <div className="story-mention-tag">
                    <span>{item.text}</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Trash Can Drop Target (visible when dragging) */}
          {draggingOverlayId && (
            <div className={`story-studio-trash-zone ${isOverTrash ? 'is-hovering' : ''}`}>
              <Trash2 size={24} />
            </div>
          )}
        </div>

        {/* Filter Slider (if filter drawer open) */}
        {activeDrawer === 'filters' && (
          <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, zIndex: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }}>
            <StoryFilterSelector
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              previewUrl={mediaUrl}
            />
          </div>
        )}

        {/* Music Picker Drawer */}
        {activeDrawer === 'music' && (
          <StoryMusicPicker
            selectedMusic={selectedMusic}
            onSelectMusic={track => setSelectedMusic(track)}
            onClose={() => setActiveDrawer('none')}
          />
        )}

        {/* Sticker Picker Drawer */}
        {activeDrawer === 'stickers' && (
          <StoryStickerPicker
            onAddOverlay={handleAddOverlay}
            onClose={() => setActiveDrawer('none')}
          />
        )}

        {/* Text Editor Fullscreen Sheet */}
        {activeDrawer === 'text' && (
          <div className="story-text-editor-overlay">
            <div className="story-text-editor-top">
              {/* Font toggle */}
              <button
                type="button"
                className="cp-btn cp-btn--secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => {
                  const currentIndex = FONT_OPTIONS.findIndex(f => f.id === textFont)
                  const nextIndex = (currentIndex + 1) % FONT_OPTIONS.length
                  setTextFont(FONT_OPTIONS[nextIndex].id)
                }}
              >
                {FONT_OPTIONS.find(f => f.id === textFont)?.label}
              </button>

              {/* Background style toggle */}
              <button
                type="button"
                className="cp-btn cp-btn--secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => {
                  if (textBgStyle === 'box') setTextBgStyle('solid')
                  else if (textBgStyle === 'solid') setTextBgStyle('none')
                  else setTextBgStyle('box')
                }}
              >
                Nền chữ: {textBgStyle === 'box' ? 'Mờ' : textBgStyle === 'solid' ? 'Đặc' : 'Trong suốt'}
              </button>

              {/* Done button */}
              <button
                type="button"
                className="cp-btn cp-btn--primary"
                style={{ padding: '6px 16px', fontWeight: 700 }}
                onClick={handleSaveTextOverlay}
              >
                Xong
              </button>
            </div>

            {/* Input textarea */}
            <textarea
              className={`story-text-editor-input story-font-${textFont}`}
              style={{
                color: textColor,
                background: textBgStyle === 'solid' ? textColor : textBgStyle === 'box' ? 'rgba(0,0,0,0.6)' : 'transparent',
                borderRadius: '16px',
                padding: '12px 18px',
              }}
              placeholder="Nhập nội dung văn bản..."
              value={textDraft}
              onChange={e => setTextDraft(e.target.value)}
              autoFocus
              rows={3}
            />

            {/* Color palette */}
            <div className="story-text-editor-bottom">
              <div className="story-color-palette">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`story-color-dot ${textColor === color ? 'is-active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Studio Controls */}
        <footer className="story-studio-bottom-bar">
          {/* Privacy Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="cp-btn cp-btn--secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                borderRadius: '20px',
              }}
              onClick={() => setShowPrivacyDropdown(prev => !prev)}
            >
              {privacy === 'public' && <Globe size={15} color="#3b82f6" />}
              {privacy === 'friends' && <Users size={15} color="#10b981" />}
              {privacy === 'close_friends' && <Star size={15} color="#10b981" fill="#10b981" />}
              {privacy === 'only_me' && <Lock size={15} color="#94a3b8" />}
              <span>
                {privacy === 'public'
                  ? 'Công khai'
                  : privacy === 'friends'
                  ? 'Bạn bè'
                  : privacy === 'close_friends'
                  ? 'Bạn thân'
                  : 'Chỉ mình tôi'}
              </span>
              <ChevronDown size={14} />
            </button>

            {showPrivacyDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '48px',
                  left: 0,
                  backgroundColor: '#1e293b',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  zIndex: 50,
                  width: '180px',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { setPrivacy('public'); setShowPrivacyDropdown(false) }}
                >
                  <Globe size={16} color="#3b82f6" />
                  <span>Công khai</span>
                </button>
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { setPrivacy('friends'); setShowPrivacyDropdown(false) }}
                >
                  <Users size={16} color="#10b981" />
                  <span>Bạn bè</span>
                </button>
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { setPrivacy('close_friends'); setShowPrivacyDropdown(false) }}
                >
                  <Star size={16} color="#10b981" fill="#10b981" />
                  <span>Bạn thân (viền xanh)</span>
                </button>
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { setPrivacy('only_me'); setShowPrivacyDropdown(false) }}
                >
                  <Lock size={16} color="#94a3b8" />
                  <span>Chỉ mình tôi</span>
                </button>
              </div>
            )}
          </div>

          {/* Publish Story Button */}
          <button
            type="button"
            className="cp-btn cp-btn--primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '24px',
              fontWeight: 700,
            }}
            onClick={handlePublishClick}
          >
            <span>{t('publishStory', { defaultValue: 'Chia sẻ lên Story' })}</span>
            <Send size={16} />
          </button>
        </footer>
      </div>
    </div>
  )
}
