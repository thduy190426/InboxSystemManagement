import re

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for Contexts
imports = """
import { ChatStateContext, MessageActionContext, ChatUIContext } from './ChatContexts'
"""
content = content.replace("import { MessageInput } from './MessageInput'", "import { MessageInput } from './MessageInput'" + imports)

# Find the return statement and wrap the main <section>
# It's at the bottom: return ( <section className={`chat-panel ${isDragging ? 'is-dragging' : ''}`} ...
return_pattern = r'return \(\s*<section className=\{`chat-panel \$\{isDragging \? \'is-dragging\' : \'\'\}`\}'
context_providers_start = """return (
    <ChatStateContext.Provider value={{
      activeConversation, currentUserId: currentUser?.id, members: members as any, searchMatches,
      activeSearchMessageId, focusedMessageId, editingMessageId, busyMessageId,
      editingText, openActionMenuId, openReactionPickerId
    }}>
      <MessageActionContext.Provider value={{
        startReplying, startForwarding, handleDeleteForMe, handleRecall, handleReport,
        handleTogglePin, onRetryMessage, handleToggleReaction, startEditing, cancelEditing,
        setEditingText, handleEditSubmit, onVotePoll
      }}>
        <ChatUIContext.Provider value={{
          getDateDividerLabel, isSameMessageGroup, messageRefs, renderCallMessage,
          renderHighlightedText, shouldRenderMessageText, renderReplyPreview,
          getMessageStateLabel, formatMessageTime, renderAttachments, renderReactions,
          isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId
        }}>
          <section className={`chat-panel ${isDragging ? 'is-dragging' : ''}`}"""

content = re.sub(return_pattern, context_providers_start, content)

# Replace <MessageItem ... /> with <MessageItem index={index} message={message} displayMessages={displayMessages} />
message_item_pattern = r'<MessageItem\n[\s\S]*?startEditing=\{startEditing\}\n\s*/>'
message_item_replacement = '<MessageItem index={index} message={message} displayMessages={displayMessages} />'
content = re.sub(message_item_pattern, message_item_replacement, content)

# Add closing tags at the very end
closing_tags = """        </ChatUIContext.Provider>
      </MessageActionContext.Provider>
    </ChatStateContext.Provider>
"""
end_pattern = r'</section>\s*\)\s*\}\s*$'
content = re.sub(end_pattern, '</section>\n' + closing_tags + '  )\n}', content)


with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Modify MessageItem.tsx
with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'r', encoding='utf-8') as f:
    item_content = f.read()

# Replace props definition
props_pattern = r'export type MessageItemProps = \{[\s\S]*?\}'
props_replacement = """export type MessageItemProps = {
  index: number
  message: Message
  displayMessages: Message[]
}"""
item_content = re.sub(props_pattern, props_replacement, item_content)

# Inject hooks
hooks_inject = """
import { useChatState, useMessageActions, useChatUI } from './ChatContexts'
"""
item_content = item_content.replace("import type { FormEvent } from 'react'", "import type { FormEvent } from 'react'" + hooks_inject)

# Replace destructured props
destructure_pattern = r'const \{ index[\s\S]*?\} = props;'
destructure_replacement = """const { index, message, displayMessages } = props;
  const { currentUserId, editingMessageId, busyMessageId, editingText, openActionMenuId, openReactionPickerId } = useChatState()
  const { startReplying, startForwarding, handleDeleteForMe, handleRecall, handleReport, handleTogglePin, onRetryMessage, handleToggleReaction, startEditing, cancelEditing, setEditingText, handleEditSubmit, onVotePoll } = useMessageActions()
  const { getDateDividerLabel, isSameMessageGroup, messageRefs, renderCallMessage, renderHighlightedText, shouldRenderMessageText, renderReplyPreview, getMessageStateLabel, formatMessageTime, renderAttachments, renderReactions, isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId } = useChatUI()"""
item_content = re.sub(destructure_pattern, destructure_replacement, item_content)

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'w', encoding='utf-8') as f:
    f.write(item_content)

print("Done")
