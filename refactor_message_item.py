import os

props = [
    "index", "message", "displayMessages", "getDateDividerLabel", "isSameMessageGroup", 
    "messageRefs", "searchMatches", "activeSearchMessageId", "focusedMessageId", 
    "renderCallMessage", "renderHighlightedText", "shouldRenderMessageText", "editingMessageId", 
    "handleEditSubmit", "busyMessageId", "setEditingText", "editingText", "cancelEditing", 
    "renderReplyPreview", "onVotePoll", "getMessageStateLabel", "onRetryMessage", "startReplying", 
    "startForwarding", "openActionMenuId", "setOpenActionMenuId", "openReactionPickerId", 
    "setOpenReactionPickerId", "handleToggleReaction", "handleDeleteForMe", "handleRecall", 
    "handleReport", "formatMessageTime", 
    "activeConversation", "currentUserId", "members",
    "renderAttachments", "renderReactions", 
    "handleTogglePin", "isSameLocalDay", "parseMessageDate", "startEditing"
]

code = f'''import type {{ FormEvent, ReactNode, RefObject, MutableRefObject }} from 'react'
import {{ Suspense, lazy }} from 'react'
import {{ MoreHorizontal, Reply, Pencil, Copy, Pin, Trash2, Check, CheckCheck, Play, Pause, PinOff, Calendar, X, SendHorizontal, Smile, Download, Flag }} from 'lucide-react'
import type {{ Conversation, Message, MessageReply }} from '../../types'
import {{ OnlineDurationBadge }} from '../ui/OnlineDurationBadge'
import {{ AvatarFallback }} from '../ui/AvatarFallback'
import {{ PollMessage }} from './PollMessage'
import type {{ EmojiClickData, EmojiStyle, Theme }} from 'emoji-picker-react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

export type MessageItemProps = {{
  index: number
  message: Message
  displayMessages: Message[]
  getDateDividerLabel: (message: Message, previousMessage?: Message) => string | null
  isSameMessageGroup: (message: Message, previousMessage?: Message) => boolean
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  searchMatches: any[]
  activeSearchMessageId: string
  focusedMessageId: string
  renderCallMessage: (message: Message) => React.ReactNode
  renderHighlightedText: (message: Message) => React.ReactNode
  shouldRenderMessageText: (message: Message) => boolean
  editingMessageId: string
  handleEditSubmit: (event: FormEvent<HTMLFormElement>, message: Message) => void
  busyMessageId: string
  setEditingText: (text: string) => void
  editingText: string
  cancelEditing: () => void
  renderReplyPreview: (message: MessageReply) => React.ReactNode
  onVotePoll: ((messageId: string, optionIds: string[]) => void | Promise<void>) | undefined
  getMessageStateLabel: (message: Message) => string
  onRetryMessage: (message: Message) => void
  startReplying: (message: Message) => void
  startForwarding: (message: Message) => void
  openActionMenuId: string
  setOpenActionMenuId: React.Dispatch<React.SetStateAction<string>>
  openReactionPickerId: string
  setOpenReactionPickerId: React.Dispatch<React.SetStateAction<string>>
  handleToggleReaction: (messageId: string, emoji: string) => void
  handleDeleteForMe: (messageId: string) => void
  handleRecall: (messageId: string) => void
  handleReport: (messageId: string) => void
  formatMessageTime: (message: Message) => string
  activeConversation: Conversation
  currentUserId: string | undefined
  members: any[]
  renderAttachments: (message: Message) => React.ReactNode
  renderReactions: (message: Message) => React.ReactNode
  handleTogglePin: (messageId: string) => void
  isSameLocalDay: (left: Date | null, right: Date | null) => boolean
  parseMessageDate: (message?: Message) => Date | null
  startEditing: (message: Message) => void
}}

export function MessageItem(props: MessageItemProps) {{
  const {{ {', '.join(props)} }} = props;
'''

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    chat_panel = f.read()

lines = chat_panel.split('\n')
start = -1
end = -1
for i, line in enumerate(lines):
    if 'itemContent={(index, message) => {' in line:
        start = i
    if start != -1 and i > start + 300 and '            )' in line and '          }}' in lines[i+1]:
        end = i + 1
        break

if start != -1 and end != -1:
    item_content_lines = lines[start+1:end-1]
    
    with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
        f.write('\n'.join(item_content_lines))
        f.write('\n  )\n}\n')
        
    props_str = '\n'.join([f'              {p}={{{p}}}' for p in props])
    replacement = f'''          itemContent={{(index, message) => (
            <MessageItem
{props_str}
            />
          )}}'''
          
    to_replace = '\n'.join(lines[start:end+1])
    new_chat_panel = chat_panel.replace(to_replace, replacement)
    
    import_statement = "import { MessageInput } from './MessageInput'\nimport { MessageItem } from './MessageItem'\n"
    new_chat_panel = new_chat_panel.replace("import { MessageInput } from './MessageInput'\n", import_statement)
    
    # Export parseMessageDate and isSameLocalDay
    new_chat_panel = new_chat_panel.replace('function parseMessageDate(', 'export function parseMessageDate(')
    new_chat_panel = new_chat_panel.replace('function isSameLocalDay(', 'export function isSameLocalDay(')

    # Remove unused icons
    for icon in ['Film', 'Image', 'Loader2', 'MapPin', 'Mic', 'PieChart', 'Send', 'Square']:
        new_chat_panel = new_chat_panel.replace(f'  {icon},\n', '')

    with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_chat_panel)
