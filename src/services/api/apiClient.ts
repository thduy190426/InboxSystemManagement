import { clearStoredAuthSession, getStoredRefreshToken } from '../storage/authStorage'
import { disconnectRealtimeSocket } from '../realtime/realtime'
import i18n from '../../i18n'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string>
  retryAfterSeconds?: number
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean
}

export class ApiRequestError extends Error {
  status: number
  errors?: Record<string, string>
  retryAfterSeconds?: number

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string>,
    retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
    this.retryAfterSeconds = retryAfterSeconds
  }
}

let lastExpireTimestamp = 0

export function expireSession() {
  const now = Date.now()
  // Throttle session expiration to prevent cascading 401 toast storms
  if (now - lastExpireTimestamp < 3000) {
    return
  }
  lastExpireTimestamp = now

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
    throw new ApiRequestError(i18n.t('app.sessionExpired'), 401)
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
  defaultErrorMessage = i18n.t('api.genericError', { defaultValue: 'Không thể xử lý yêu cầu!' }),
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
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterSeconds =
      typeof errorBody.retryAfterSeconds === 'number'
        ? errorBody.retryAfterSeconds
        : retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined

    let message = errorBody.message ?? defaultErrorMessage
    if (response.status === 429) {
      if (retryAfterSeconds) {
        message = i18n.t('api.rateLimitWithWait', {
          defaultValue: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfterSeconds} giây!`,
          seconds: retryAfterSeconds,
        })
      } else {
        message = i18n.t('api.rateLimitDefault', {
          defaultValue: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ trong giây lát!',
        })
      }
    }

    throw new ApiRequestError(
      message,
      response.status,
      errorBody.errors,
      retryAfterSeconds,
    )
  }

  return body as T
}
