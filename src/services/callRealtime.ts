import type { Socket } from 'socket.io-client'
import type { CallSession, CallType } from '../types'
import { getRealtimeSocket } from './realtime'

type Ack<T = unknown> = {
  ok: boolean
  message?: string
} & T

export type CallSignalPayload = {
  callId: string
  conversationId: string
  toUserId?: number
  from: {
    id: string
    userId: number
    fullName: string
  }
  data: RTCSessionDescriptionInit | RTCIceCandidateInit
}

function getSocketOrThrow() {
  const socket = getRealtimeSocket()

  if (!socket) {
    throw new Error('Bạn cần đăng nhập để thực hiện cuộc gọi!')
  }

  return socket
}

function emitWithAck<T>(socket: Socket, eventName: string, payload: unknown) {
  return new Promise<Ack<T>>((resolve) => {
    socket.timeout(8000).emit(eventName, payload, (error: Error | null, response: Ack<T>) => {
      if (error) {
        resolve({ ok: false, message: 'Máy chủ không phản hồi kịp thời!' } as Ack<T>)
        return
      }

      resolve(response)
    })
  })
}

export async function startRealtimeCall(conversationId: string, type: CallType) {
  const socket = getSocketOrThrow()
  const response = await emitWithAck<{ call?: Omit<CallSession, 'direction'> }>(
    socket,
    'call:start',
    { conversationId, type },
  )

  if (!response.ok || !response.call) {
    throw new Error(response.message || 'Không thể bắt đầu cuộc gọi!')
  }

  return response.call
}

export async function acceptRealtimeCall(callId: string) {
  const socket = getSocketOrThrow()
  const response = await emitWithAck(socket, 'call:accept', { callId })

  if (!response.ok) {
    throw new Error(response.message || 'Không thể nhận cuộc gọi!')
  }
}

export function declineRealtimeCall(callId: string) {
  getRealtimeSocket()?.emit('call:decline', { callId })
}

export function cancelRealtimeCall(callId: string) {
  getRealtimeSocket()?.emit('call:cancel', { callId })
}

export function markRealtimeCallMissed(callId: string) {
  getRealtimeSocket()?.emit('call:miss', { callId })
}

export function endRealtimeCall(callId: string) {
  getRealtimeSocket()?.emit('call:end', { callId })
}

export function sendCallSignal(
  callId: string,
  data: RTCSessionDescriptionInit | RTCIceCandidateInit,
  toUserId?: number,
) {
  getRealtimeSocket()?.emit('call:signal', { callId, data, toUserId })
}
