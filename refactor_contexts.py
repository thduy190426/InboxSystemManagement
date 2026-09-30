import re

# 1. Modify ChatPanel.tsx
with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for Contexts
imports = """
import { ChatStateContext, MessageActionContext, ChatUIContext } from './ChatContexts'
"""
content = content.replace("import { MessageInput } from './MessageInput'", "import { MessageInput } from './MessageInput'" + imports)

# Wrap MessageList with Contexts
context_providers_start = """
        <ChatStateContext.Provider value={{
          activeConversation, currentUserId: currentUser?.id, members, searchMatches,
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
"""
context_providers_end = """
            </ChatUIContext.Provider>
          </MessageActionContext.Provider>
        </ChatStateContext.Provider>
"""

# Find where messages are mapped
# Instead of complex regex, let's find the start of the message list render
# <div className="message-list-scroll-view" onScroll={handleScroll} ref={scrollViewRef}>
# and replace its inner content, or just wrap it directly.
message_list_start = '<div className="message-list-scroll-view" onScroll={handleScroll} ref={scrollViewRef}>\n          {isFetchingMore ? ('
if message_list_start in content:
    content = content.replace(message_list_start, message_list_start + context_providers_start)
    content = content.replace('<MessageItem\n', '<MessageItem\n') # just to check
else:
    print("message_list_start not found")

# Replace <MessageItem ... /> with <MessageItem index={index} message={message} displayMessages={displayMessages} />
# Find the exact JSX block of MessageItem
message_item_pattern = r'<MessageItem\n[\s\S]*?startEditing=\{startEditing\}\n\s*/>'
message_item_replacement = '<MessageItem index={index} message={message} displayMessages={displayMessages} />'

content = re.sub(message_item_pattern, message_item_replacement, content)

# Add closing tags before </div>\n          <div className="message-list-bottom-spacer" />
bottom_spacer_start = '</div>\n          <div className="message-list-bottom-spacer" />'
if bottom_spacer_start in content:
    content = content.replace(bottom_spacer_start, context_providers_end + bottom_spacer_start)
else:
    print("bottom_spacer_start not found")

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
