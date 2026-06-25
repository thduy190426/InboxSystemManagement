import { clearStoredAuthSession, getStoredRefreshToken } from './authStorage'
import { disconnectRealtimeSocket } from './realtime'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string>
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean
}

export class ApiRequestError extends Error {
  status: number
  errors?: Record<string, string>

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
  }
}

export function expireSession() {
  clearStoredAuthSession()
  disconnectRealtimeSocket()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

export function onSessionExpired(listener: () => void) {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener)

  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { auth = true, headers, ...requestOptions } = options
  const token = auth ? getStoredRefreshToken() : null

  if (auth && !token) {
    expireSession()
    throw new ApiRequestError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (auth && response.status === 401) {
    expireSession()
  }

  return response
}

export async function requestJson<T>(
  path: string,
  options: ApiFetchOptions = {},
  defaultErrorMessage = 'Không thể xử lý yêu cầu!',
) {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody | T

  if (!response.ok) {
    const errorBody = body as ApiErrorBody

    throw new ApiRequestError(
      errorBody.message ?? defaultErrorMessage,
      response.status,
      errorBody.errors,
    )
  }

  return body as T
}
