import type { AuthResponse, AuthUser } from '../api/authApi'
import { cacheAuthToken, authStore } from '../core/indexedDB'

const AUTH_USER_KEY = 'auth_user'
const REFRESH_TOKEN_KEY = 'refresh_token'
const REFRESH_TOKEN_EXPIRES_AT_KEY = 'refresh_token_expires_at'
const SAVED_ACCOUNTS_KEY = 'saved_accounts'

export type StoredAuthSession = {
  user: AuthUser
  refreshToken: string
  expiresAt: string
}

export type SavedAccount = {
  user: AuthUser
  refreshToken?: string
  expiresAt?: string
  lastActiveAt: string
}

export function isSavedAccountSessionActive(account: SavedAccount): boolean {
  if (!account.refreshToken || !account.expiresAt) return false
  const exp = new Date(account.expiresAt).getTime()
  return !Number.isNaN(exp) && exp > Date.now()
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

export function getStoredAuthSession(): StoredAuthSession | null {
  return readSessionFromStorage(window.localStorage) ?? readSessionFromStorage(window.sessionStorage)
}

export function getStoredRefreshToken(): string | null {
  const storedSession = getStoredAuthSession()
  return storedSession?.refreshToken ?? null
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedAccount[]
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => item?.user?.id)
      .sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime())
  } catch {
    return []
  }
}

export function saveAccountSession(
  user: AuthUser,
  session?: { refreshToken: string; expiresAt: string },
): void {
  try {
    const accounts = getSavedAccounts()
    const currentSession = session ?? getStoredAuthSession()

    const existingIndex = accounts.findIndex(
      (acc) => String(acc.user.id) === String(user.id) || acc.user.email === user.email,
    )

    const updatedAccount: SavedAccount = {
      user,
      refreshToken: currentSession?.refreshToken || accounts[existingIndex]?.refreshToken || '',
      expiresAt: currentSession?.expiresAt || accounts[existingIndex]?.expiresAt || '',
      lastActiveAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedAccount
    } else {
      accounts.unshift(updatedAccount)
    }

    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch (error) {
    console.error('Failed to save account to saved_accounts:', error)
  }
}

export function invalidateSavedAccountToken(userIdOrEmail: string | number): void {
  try {
    const accounts = getSavedAccounts()
    const targetIndex = accounts.findIndex(
      (acc) => String(acc.user.id) === String(userIdOrEmail) || acc.user.email === String(userIdOrEmail),
    )
    if (targetIndex >= 0) {
      accounts[targetIndex].refreshToken = ''
      accounts[targetIndex].expiresAt = ''
      window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))
    }
  } catch (error) {
    console.error('Failed to invalidate token in saved_accounts:', error)
  }
}

export function removeSavedAccount(userIdOrEmail: string | number): void {
  try {
    const accounts = getSavedAccounts().filter(
      (acc) => String(acc.user.id) !== String(userIdOrEmail) && acc.user.email !== String(userIdOrEmail),
    )
    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch (error) {
    console.error('Failed to remove account from saved_accounts:', error)
  }
}

export function switchActiveAccount(userIdOrEmail: string | number): SavedAccount | null {
  const accounts = getSavedAccounts()
  const target = accounts.find(
    (acc) => String(acc.user.id) === String(userIdOrEmail) || acc.user.email === String(userIdOrEmail),
  )

  if (!target || !target.refreshToken || !isSavedAccountSessionActive(target)) {
    return null
  }

  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(target.user))
  window.localStorage.setItem(REFRESH_TOKEN_KEY, target.refreshToken)
  window.localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, target.expiresAt || '')
  cacheAuthToken(target.refreshToken).catch(console.error)

  target.lastActiveAt = new Date().toISOString()
  window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))

  return target
}

export function storeAuthSession(response: AuthResponse, rememberLogin: boolean) {
  const targetStorage = getStorage(rememberLogin)
  const unusedStorage = getStorage(!rememberLogin)

  clearStorage(unusedStorage)
  targetStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user))

  if (response.session) {
    targetStorage.setItem(REFRESH_TOKEN_KEY, response.session.refreshToken)
    targetStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, response.session.expiresAt)
    cacheAuthToken(response.session.refreshToken).catch(console.error)
    saveAccountSession(response.user, response.session)
  }
}

export function updateStoredAuthUser(user: AuthUser) {
  const storage = window.localStorage.getItem(AUTH_USER_KEY)
    ? window.localStorage
    : window.sessionStorage

  storage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  saveAccountSession(user)
}

export function clearStoredAuthSession() {
  clearStorage(window.localStorage)
  clearStorage(window.sessionStorage)
  authStore.removeItem('refreshToken').catch(console.error)
}
