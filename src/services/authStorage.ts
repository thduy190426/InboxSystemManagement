import type { AuthResponse, AuthUser } from './authApi'

const AUTH_USER_KEY = 'auth_user'
const REFRESH_TOKEN_KEY = 'refresh_token'
const REFRESH_TOKEN_EXPIRES_AT_KEY = 'refresh_token_expires_at'

type StoredAuthSession = {
  user: AuthUser
  refreshToken: string
  expiresAt: string
}

function getStorage(rememberLogin: boolean) {
  return rememberLogin ? window.localStorage : window.sessionStorage
}

function clearStorage(storage: Storage) {
  storage.removeItem(AUTH_USER_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_EXPIRES_AT_KEY)
}

function readSessionFromStorage(storage: Storage): StoredAuthSession | null {
  const rawUser = storage.getItem(AUTH_USER_KEY)
  const refreshToken = storage.getItem(REFRESH_TOKEN_KEY)
  const expiresAt = storage.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY)

  if (!rawUser || !refreshToken || !expiresAt) {
    return null
  }

  if (new Date(expiresAt).getTime() <= Date.now()) {
    clearStorage(storage)
    return null
  }

  try {
    return {
      user: JSON.parse(rawUser) as AuthUser,
      refreshToken,
      expiresAt,
    }
  } catch {
    clearStorage(storage)
    return null
  }
}

export function getStoredAuthSession() {
  return readSessionFromStorage(window.localStorage) ?? readSessionFromStorage(window.sessionStorage)
}

export function getStoredRefreshToken() {
  const storedSession = getStoredAuthSession()

  return storedSession?.refreshToken ?? null
}

export function storeAuthSession(response: AuthResponse, rememberLogin: boolean) {
  const targetStorage = getStorage(rememberLogin)
  const unusedStorage = getStorage(!rememberLogin)

  clearStorage(unusedStorage)
  targetStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user))

  if (response.session) {
    targetStorage.setItem(REFRESH_TOKEN_KEY, response.session.refreshToken)
    targetStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, response.session.expiresAt)
  }
}

export function updateStoredAuthUser(user: AuthUser) {
  const storage = window.localStorage.getItem(AUTH_USER_KEY)
    ? window.localStorage
    : window.sessionStorage

  storage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuthSession() {
  clearStorage(window.localStorage)
  clearStorage(window.sessionStorage)
}
