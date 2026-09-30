import type { Conversation, Message } from '../../types'
import { X, Search } from 'lucide-react'
import { AvatarFallback } from '../ui/AvatarFallback'
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'

export type ForwardMessageModalProps = {
  forwardingMessage: Message | null
  isForwardDialogClosing: boolean
  closeForwardDialog: () => void
  getReplyText: (message: Message) => string
  forwardQuery: string
  setForwardQuery: (query: string) => void
  forwardTargets: Conversation[]
  handleForward: (targetConversationId: string) => Promise<void>
}

export function ForwardMessageModal({
  forwardingMessage,
  isForwardDialogClosing,
  closeForwardDialog,
  getReplyText,
  forwardQuery,
  setForwardQuery,
  forwardTargets,
  handleForward,
}: ForwardMessageModalProps) {
  if (!forwardingMessage) return null

  return (
    <div className={isForwardDialogClosing ? 'forward-dialog-backdrop is-exiting' : 'forward-dialog-backdrop'} role="presentation">
      <section aria-modal="true" className="forward-dialog" role="dialog">
        <header>
          <div>
            <strong>Chuyển tiếp tin nhắn</strong>
            <span>{getReplyText(forwardingMessage)}</span>
          </div>
          <button onClick={closeForwardDialog} title="Đóng" type="button">
            <X size={20} />
          </button>
        </header>

        <label className="forward-search">
          <Search size={16} />
          <input
            autoFocus
            onChange={(event) => setForwardQuery(event.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={forwardQuery}
          />
        </label>

        <div className="forward-targets">
          {forwardTargets.map((conversation) => (
            <button
              key={conversation.id}
              className="forward-target"
              onClick={() => handleForward(conversation.id)}
              type="button"
            >
              <div className="forward-target-avatar">
                {conversation.avatar ? (
                  <img alt={conversation.name} src={conversation.avatar} />
                ) : (
                  <AvatarFallback name={conversation.name} />
                )}
                <OnlineDurationBadge presence={conversation.presence} onlineSince={conversation.onlineSince} />
              </div>
              <div className="forward-target-info">
                <strong>{conversation.name}</strong>
                <span>{conversation.type === 'group' ? 'Nhóm' : 'Cá nhân'}</span>
              </div>
            </button>
          ))}

          {forwardTargets.length === 0 ? (
            <div className="forward-target-empty">Không tìm thấy cuộc trò chuyện nào phù hợp.</div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
