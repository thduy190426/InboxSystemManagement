import type { Message } from '../../types'
import { Search, X } from 'lucide-react'

export type PinnedMessagesDrawerProps = {
  isPinnedModalOpen: boolean
  setIsPinnedModalOpen: (open: boolean) => void
  pinnedMessages: Message[]
  pinnedSearchQuery: string
  setPinnedSearchQuery: (query: string) => void
  getReplyText: (message: Message) => string
  getReplyAuthorLabel: (message: Message) => string
  handleTogglePin: (messageId: string) => Promise<void>
  onJumpToMessage: (messageId: string) => void
}

export function PinnedMessagesDrawer({
  isPinnedModalOpen,
  setIsPinnedModalOpen,
  pinnedMessages,
  pinnedSearchQuery,
  setPinnedSearchQuery,
  getReplyText,
  getReplyAuthorLabel,
  handleTogglePin,
  onJumpToMessage,
}: PinnedMessagesDrawerProps) {
  if (!isPinnedModalOpen) return null

  return (
    <div className="forward-dialog-backdrop" role="presentation">
      <section aria-modal="true" className="forward-dialog" role="dialog">
        <header>
          <div>
            <strong>Danh sách tin nhắn đã ghim ({pinnedMessages.length})</strong>
          </div>
          <button
            onClick={() => setIsPinnedModalOpen(false)}
            title="Đóng"
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <label className="forward-search">
          <Search size={16} />
          <input
            autoFocus
            onChange={(event) => setPinnedSearchQuery(event.target.value)}
            placeholder="Tìm tin nhắn đã ghim..."
            value={pinnedSearchQuery}
          />
        </label>
        <div className="forward-targets" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
          {pinnedMessages
            .filter(msg => getReplyText(msg).toLowerCase().includes(pinnedSearchQuery.toLowerCase()) || getReplyAuthorLabel(msg).toLowerCase().includes(pinnedSearchQuery.toLowerCase()))
            .map(message => (
            <div key={message.id} style={{ padding: '12px', background: 'var(--panel-secondary, #f0f2f5)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px' }}>{getReplyAuthorLabel(message)}</strong>
                <button 
                  onClick={() => handleTogglePin(message.id)} 
                  style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer', fontSize: '12px' }}
                >
                  Bỏ ghim
                </button>
              </div>
              {message.pinnedBy && message.pinnedAt && (
                <small style={{ color: 'var(--subtle, #65676B)', fontSize: '11px' }}>
                  Ghim bởi {message.pinnedBy} lúc {new Date(message.pinnedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </small>
              )}
              <div style={{ fontSize: '14px', margin: '4px 0', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                {getReplyText(message)}
              </div>
              <button 
                onClick={() => {
                  setIsPinnedModalOpen(false)
                  onJumpToMessage(message.id)
                }} 
                style={{ 
                  alignSelf: 'flex-start',
                  background: 'none', 
                  border: '1px solid var(--border-color, #ccd0d5)', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                  marginTop: '4px',
                  color: 'var(--text-primary)'
                }}
              >
                Xem trong đoạn chat
              </button>
            </div>
          ))}
          {pinnedMessages.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--subtle)', margin: '20px 0' }}>Không có tin nhắn nào được ghim.</p>
          )}
        </div>
      </section>
    </div>
  )
}
