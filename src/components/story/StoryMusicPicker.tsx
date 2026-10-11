import { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, Music, Upload, Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface StoryMusicTrack {
  id: string
  title: string
  artist: string
  url: string
}

// Danh sách nhạc mẫu không bản quyền (Royalty-free CDN audio samples)
export const DEFAULT_MUSIC_TRACKS: StoryMusicTrack[] = [
  {
    id: 'lofi-chill',
    title: 'Chill Lo-Fi Vibes',
    artist: 'Night Owl Beats',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: 'acoustic-breeze',
    title: 'Acoustic Breeze',
    artist: 'Sunny Morning',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sweet-life-11449.mp3',
  },
  {
    id: 'upbeat-summer',
    title: 'Upbeat Energy',
    artist: 'Vibe Maker',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=summer-walk-157076.mp3',
  },
  {
    id: 'synthwave-night',
    title: 'Retro Night Drive',
    artist: 'Neon Dreams',
    url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=synthwave-80s-110045.mp3',
  },
  {
    id: 'ambient-peace',
    title: 'Peaceful Horizon',
    artist: 'Zen Garden',
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_9242d5efbf.mp3?filename=zen-garden-126291.mp3',
  },
]

interface StoryMusicPickerProps {
  selectedMusic: StoryMusicTrack | null
  onSelectMusic: (music: StoryMusicTrack | null) => void
  onClose: () => void
}

export function StoryMusicPicker({
  selectedMusic,
  onSelectMusic,
  onClose,
}: StoryMusicPickerProps) {
  const { t } = useTranslation('story')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [customTracks, setCustomTracks] = useState<StoryMusicTrack[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dừng preview audio khi unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const togglePlayPreview = (e: React.MouseEvent, track: StoryMusicTrack) => {
    e.stopPropagation()

    if (playingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlayingTrackId(null)
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    audioRef.current.src = track.url
    audioRef.current
      .play()
      .then(() => {
        setPlayingTrackId(track.id)
      })
      .catch(err => {
        console.warn('Audio play preview error:', err)
        setPlayingTrackId(null)
      })

    audioRef.current.onended = () => {
      setPlayingTrackId(null)
    }
  }

  const handleSelectTrack = (track: StoryMusicTrack) => {
    if (selectedMusic?.id === track.id) {
      // Đã chọn bài này thì bỏ chọn
      onSelectMusic(null)
    } else {
      onSelectMusic(track)
    }
  }

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const trackUrl = URL.createObjectURL(file)
    const newTrack: StoryMusicTrack = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Tải lên từ thiết bị',
      url: trackUrl,
    }

    setCustomTracks(prev => [newTrack, ...prev])
    onSelectMusic(newTrack)
  }

  const allTracks = [...customTracks, ...DEFAULT_MUSIC_TRACKS]

  return (
    <div className="story-picker-drawer">
      <div className="story-picker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={20} color="#6366f1" />
          <h3>{t('musicTitle', { defaultValue: 'Nhạc nền Story' })}</h3>
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

      {/* Upload button and clear music action */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          type="button"
          className="cp-btn cp-btn--secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.85rem' }}
        >
          <Upload size={16} />
          <span>{t('uploadAudio', { defaultValue: 'Tải nhạc từ máy' })}</span>
        </button>

        {selectedMusic && (
          <button
            type="button"
            className="cp-btn cp-btn--danger"
            onClick={() => onSelectMusic(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.85rem' }}
            title="Gỡ nhạc nền"
          >
            <Trash2 size={16} />
            <span>{t('removeMusic', { defaultValue: 'Gỡ nhạc' })}</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadAudio}
        accept="audio/mp3,audio/wav,audio/mpeg,audio/*"
        hidden
      />

      <div className="story-music-list">
        {allTracks.map(track => {
          const isSelected = selectedMusic?.id === track.id
          const isPlaying = playingTrackId === track.id

          return (
            <div
              key={track.id}
              className={`story-music-item ${isSelected ? 'is-selected' : ''}`}
              onClick={() => handleSelectTrack(track)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                <button
                  type="button"
                  className="story-camera-circle-btn"
                  style={{
                    width: '38px',
                    height: '38px',
                    backgroundColor: isPlaying ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                  }}
                  onClick={e => togglePlayPreview(e, track)}
                  title={isPlaying ? 'Dừng phát' : 'Nghe thử'}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                </button>

                <div className="story-music-info">
                  <span className="story-music-title">{track.title}</span>
                  <span className="story-music-artist">{track.artist}</span>
                </div>
              </div>

              <div className="story-music-actions">
                {isPlaying && (
                  <div className="story-sound-waves">
                    <span className="story-sound-bar" />
                    <span className="story-sound-bar" />
                    <span className="story-sound-bar" />
                    <span className="story-sound-bar" />
                  </div>
                )}
                {isSelected && (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Check size={16} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
