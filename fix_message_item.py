import re

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
  const { 
    currentUserId, editingMessageId, busyMessageId, editingText, 
    openActionMenuId, openReactionPickerId, searchMatches, 
    activeSearchMessageId, focusedMessageId, activeConversation, members 
  } = useChatState()
  
  const { 
    startReplying, startForwarding, handleDeleteForMe, handleRecall, handleReport, 
    handleTogglePin, onRetryMessage, handleToggleReaction, startEditing, cancelEditing, 
    setEditingText, handleEditSubmit, onVotePoll 
  } = useMessageActions()
  
  const { 
    getDateDividerLabel, isSameMessageGroup, messageRefs, renderCallMessage, 
    renderHighlightedText, shouldRenderMessageText, renderReplyPreview, 
    getMessageStateLabel, formatMessageTime, renderAttachments, renderReactions, 
    isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId 
  } = useChatUI()"""
item_content = re.sub(destructure_pattern, destructure_replacement, item_content)

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'w', encoding='utf-8') as f:
    f.write(item_content)

print("Done")
