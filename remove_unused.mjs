import { readFile, writeFile } from 'fs/promises';

const unused = [
  'e2eeEngine', 'archiveConversation', 'addGroupMember', 'createDirectConversation',
  'createGroupConversation', 'deleteMessage', 'disbandGroupConversation', 'forwardMessage',
  'hideConversation', 'leaveGroupConversation', 'recallMessage', 'removeGroupMember',
  'removeMessageReaction', 'reportMessage', 'resetGroupInvite', 'reviewGroupJoinRequest',
  'searchConversationMessages', 'sendMessage', 'sendGifMessage', 'toggleMessageReaction',
  'toggleMessagePin', 'transferGroupOwner', 'unarchiveConversation', 'uploadMessageAttachment',
  'updateConversationSettings', 'updateConversationQuickEmoji', 'updateGroupConversation',
  'updateConversationBackground', 'updateGroupMemberNickname', 'updateGroupMemberRole',
  'updateMessage', 'sendPoll', 'votePoll', 'type MessageSearchFilters', 'MessageSearchFilters', 'blockContact',
  'unblockContact', 'updateContactNickname', 'type GifSearchResult', 'GifSearchResult', 'removeQueuedMessage',
  'upsertQueuedMessage', 'QueuedMessage', 'type QueuedMessage', 'prependOlderMessages',
  'fetchMessagesPage', 'getAttachmentPreview'
];

async function main() {
  const filePath = 'C:/Users/duyho/Downloads/InboxSystemManagement/src/components/views/ChatApp.tsx';
  let content = await readFile(filePath, 'utf8');
  
  for (const name of unused) {
    const regex = new RegExp(`(^|\\W)${name}(\\s*,\\s*|\\s*})`, 'g');
    content = content.replace(regex, (match, p1, p2) => {
       if (p2.includes('}')) return p1 + '}';
       return p1;
    });
  }
  
  // Clean up unused function
  content = content.replace(/function getAttachmentPreview[\\s\\S]*?return message\\?\\.text \\?\\? t\\('noMessage'\\)\\s*\\n}/, '');
  // Clean up unused `friend` variable warning around line 788
  // Since we don't know the exact context without seeing it, maybe it's best to run tsc and manually fix the rest.
  // We'll leave `friend` for manual fixing.

  // Clean up empty imports
  content = content.replace(/import\\s*{\\s*}\\s*from\\s*['"][^'"]+['"];?/g, '');
  
  await writeFile(filePath, content);
  console.log("Done");
}
main();
