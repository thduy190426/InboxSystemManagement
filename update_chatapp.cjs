const fs = require('fs');
let c = fs.readFileSync('src/components/views/ChatApp.tsx', 'utf8');
const startIdx = c.indexOf('const { data: conversations = [], isLoading: isConversationsLoading } = useQuery<Conversation[]>({');
const endRe = /const setNotifications = useCallback\(\(updater: React\.SetStateAction<any>\) => \{\r?\n\s*queryClient\.setQueryData\(\['notifications'\], updater\)\r?\n\s*\}, \[queryClient\]\)\r?\n/;
const match = c.match(endRe);

if (startIdx !== -1 && match) {
  const endIdx = match.index + match[0].length;
  c = c.slice(0, startIdx) + 
      '  const { conversations, isConversationsLoading, setConversations, archivedConversations, setArchivedConversations, friends, setFriends, friendRequests, setFriendRequests, notifications, setNotifications } = useChatData()\n' + 
      c.slice(endIdx);
  
  c = c.replace(/import \{ useOfflineQueue \} from '\.\.\/\.\.\/hooks\/chat\/useOfflineQueue'/, 
    "import { useOfflineQueue } from '../../hooks/chat/useOfflineQueue'\nimport { useChatData } from '../../hooks/chat/useChatData'");
  
  fs.writeFileSync('src/components/views/ChatApp.tsx', c);
  console.log('Success');
} else {
  console.log('Not found', startIdx, match);
}
