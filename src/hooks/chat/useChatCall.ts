import { useTranslation } from 'react-i18next'
import { startRealtimeCall } from '../../services/realtime/callRealtime'
import { useChatStore } from '../../stores/chatStore'
import type { CallType, Conversation } from '../../types'

export function useChatCall(setErrorMessage: (msg: string) => void) {
  const { t } = useTranslation()
  const { activeCall, setActiveCall } = useChatStore()

  async function handleStartCall(activeConversation: Conversation | undefined, type: CallType) {
    if (!activeConversation || activeConversation.blocked || activeCall) {
      return
    }

    try {
      setErrorMessage('')
      const call = await startRealtimeCall(activeConversation.id, type)

      setActiveCall({
        ...call,
        direction: 'outgoing',
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('startCallErr'))
    }
  }

  return { handleStartCall }
}
