const fs = require('fs');

let chatPanel = fs.readFileSync('src/components/panels/ChatPanel.tsx', 'utf8');
chatPanel = chatPanel.replace(
  'activeSearchMessageId, focusedMessageId, editingMessageId, busyMessageId,',
  'activeSearchMessageId: activeSearchMessageId as string, focusedMessageId: focusedMessageId as string, editingMessageId: editingMessageId as string, busyMessageId: busyMessageId as string,'
);
chatPanel = chatPanel.replace(/pinnedMessages\.length/g, '(pinnedMessages || []).length');
chatPanel = chatPanel.replace(/pinnedMessages\.slice/g, '(pinnedMessages || []).slice');
chatPanel = chatPanel.replace('pinnedMessages={pinnedMessages}', 'pinnedMessages={pinnedMessages || []}');

// For the context providers:
chatPanel = chatPanel.replace(
  /replyingTo,\n        getReplyAuthorLabel/g,
  'replyingTo: replyingTo || null,\n        getReplyAuthorLabel'
);
chatPanel = chatPanel.replace(
  /isUploadingAttachment,\n        locationError/g,
  'isUploadingAttachment: isUploadingAttachment || false,\n        locationError'
);
chatPanel = chatPanel.replace(
  /isBlocked,\n        mentionSuggestions/g,
  'isBlocked: isBlocked || false,\n        mentionSuggestions'
);

fs.writeFileSync('src/components/panels/ChatPanel.tsx', chatPanel);


let detailPanel = fs.readFileSync('src/components/panels/DetailPanel.tsx', 'utf8');
detailPanel = detailPanel.replace(/joinRequests\.length/g, '(joinRequests || []).length');
detailPanel = detailPanel.replace(/joinRequests\.map/g, '(joinRequests || []).map');
detailPanel = detailPanel.replace(/restrictedContacts\.length/g, '(restrictedContacts || []).length');
detailPanel = detailPanel.replace(/restrictedContacts\.map/g, '(restrictedContacts || []).map');
fs.writeFileSync('src/components/panels/DetailPanel.tsx', detailPanel);


const { Project } = require('ts-morph');
const p = new Project();
const settingsHook = p.addSourceFileAtPath('src/hooks/views/useSettingsPageController.tsx');
settingsHook.getFunction('formatDateTime')?.remove();
settingsHook.getFunction('getSessionTitle')?.remove();
settingsHook.getTypeAlias('ToggleRowProps')?.remove();
settingsHook.getTypeAlias('CardProps')?.remove();
settingsHook.getTypeAlias('SessionItemProps')?.remove();
settingsHook.saveSync();
