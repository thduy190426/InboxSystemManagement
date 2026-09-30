import os

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    chat_panel = f.read()

lines = chat_panel.split('\n')
form_lines = lines[2138:2370]
form_str = '\n'.join(form_lines)

replacement = """      <MessageInput
        onSubmit={onSubmit}
        replyingTo={replyingTo}\n        getReplyAuthorLabel={getReplyAuthorLabel}\n        getReplyText={getReplyText}
        getReplyAuthorLabel={getReplyAuthorLabel}
        getReplyText={getReplyText}
        onCancelReply={onCancelReply}
        recordedMediaUrl={recordedMediaUrl}
        recordedMediaKind={recordedMediaKind}
        clearRecordedMedia={clearRecordedMedia}
        isUploadingAttachment={isUploadingAttachment}
        sendRecordedMedia={sendRecordedMedia}
        recordingKind={recordingKind}
        formatRecordingDuration={formatRecordingDuration}
        recordingDuration={recordingDuration}
        cancelMediaRecording={cancelMediaRecording}
        recordingError={recordingError}
        locationError={locationError}\n        isBlocked={isBlocked}
        isBlocked={isBlocked}
        mentionSuggestions={mentionSuggestions}
        insertMention={insertMention}
        handleAttachmentChange={handleAttachmentChange}
        handleDraftChange={handleDraftChange}
        activeConversation={activeConversation}
        draft={draft}
        isComposerEmojiOpen={isComposerEmojiOpen}
        setIsGifPickerOpen={setIsGifPickerOpen}
        setIsComposerEmojiOpen={setIsComposerEmojiOpen}
        handleSendComposerEmoji={handleSendComposerEmoji}
        isGifPickerOpen={isGifPickerOpen}
        gifQuery={gifQuery}
        setGifQuery={setGifQuery}
        gifError={gifError}
        isLoadingGifs={isLoadingGifs}
        gifResults={gifResults}
        handleSendGif={handleSendGif}
        stopMediaRecording={stopMediaRecording}
        isSharingLocation={isSharingLocation}
        handleShareLocation={handleShareLocation}
        startMediaRecording={startMediaRecording}
        setIsPollModalOpen={setIsPollModalOpen}
      />"""

new_chat_panel = chat_panel.replace(form_str, replacement)
import_statement = "import { MessageInput } from './MessageInput'\n"
new_chat_panel = new_chat_panel.replace("import { CreatePollModal } from './CreatePollModal'", "import { CreatePollModal } from './CreatePollModal'\n" + import_statement)

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(new_chat_panel)
