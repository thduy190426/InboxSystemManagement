import re

# 1. ChatPanel.tsx fixes
with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    chat_panel = f.read()

# Fix double import of Contexts
chat_panel = chat_panel.replace("import { ChatStateContext, MessageActionContext, ChatUIContext } from './ChatContexts'\nimport { ChatStateContext, MessageActionContext, ChatUIContext } from './ChatContexts'", "import { ChatStateContext, MessageActionContext, ChatUIContext } from './ChatContexts'")

# Fix 'currentUserId' is declared but never read
# Look for currentUserId = currentUser?.id, maybe it was destructured or assigned
# Wait, let's see how currentUser is defined in ChatPanel.tsx
# currentUser = useAuthStore(s => s.user) or something.
# If currentUser is used as currentUserId: currentUser?.id, it should be fine. But the error is:
# ChatPanel.tsx(1285,42): Cannot find name 'currentUser'. Did you mean 'currentUserId'?
# Let's just fix it by replacing 'currentUserId: currentUser?.id' with 'currentUserId' if currentUserId is already available!
chat_panel = chat_panel.replace('currentUserId: currentUser?.id', 'currentUserId')

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(chat_panel)

# 2. MessageItem.tsx fixes
with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'r', encoding='utf-8') as f:
    msg_item = f.read()

# Remove unused imports
msg_item = msg_item.replace("import type { FormEvent } from 'react'\n", "")
msg_item = msg_item.replace("import type { Conversation, Message, MessageReply } from '../../types'", "import type { Message } from '../../types'")
# Oh wait, we added: import type { FormEvent } from 'react'\nimport { useChatState, useMessageActions, useChatUI } from './ChatContexts'
msg_item = msg_item.replace("import type { FormEvent } from 'react'", "")

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'w', encoding='utf-8') as f:
    f.write(msg_item)

print("Done")
