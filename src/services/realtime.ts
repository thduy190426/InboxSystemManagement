import { io, type Socket } from 'socket.io-client'
import { getStoredRefreshToken } from './authStorage'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '')

let socket: Socket | null = null

export function getRealtimeSocket() {
  const token = getStoredRefreshToken()

  if (!token) {
    return null
  }

  if (socket?.connected || socket?.active) {
    return socket
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  })

  return socket
}

export function disconnectRealtimeSocket() {
  socket?.disconnect()
  socket = null
}
