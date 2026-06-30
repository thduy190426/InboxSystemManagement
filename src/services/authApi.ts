import { apiFetch, ApiRequestError, requestJson } from './apiClient'

export type AuthUser = {
  id: string
  fullName: string
  displayName: string | null
  email: string
  phone: string | null
  gender: string | null
  address: string | null
  birthDate: string | null
  avatarUrl: string | null
  bio: string | null
  statusMessage: string | null
  role: string
  presence: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  lastSeenAt: string | null
  onlineSince?: string | null
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  message: string
  user: AuthUser
  session?: {
    refreshToken: string
    expiresAt: string
  }
  verification?: VerificationState
}

export type VerificationChannel = 'email' | 'phone'

export type VerificationState = {
  requiredChannels: VerificationChannel[]
  emailCode?: string | null
  phoneCode?: string | null
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  fullName: string
  email: string
  phone?: string
  password: string
  confirmPassword: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ForgotPasswordResponse = {
  message: string
  resetCode?: string | null
}

export type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  confirmPassword: string
}

export type ResetPasswordResponse = {
  message: string
}

export type VerifyAccountPayload = {
  email: string
  channel: VerificationChannel
  code: string
}

export type VerifyAccountResponse = {
  message: string
  user: AuthUser
  verification: Pick<VerificationState, 'requiredChannels'>
}

export type ResendVerificationPayload = {
  email: string
  channel: VerificationChannel
}

export type ResendVerificationResponse = {
  message: string
  verificationCode?: string | null
}

export class ApiError extends ApiRequestError {}

async function requestAuth(path: string, payload: LoginPayload | RegisterPayload) {
  try {
    return await requestJson<AuthResponse>(
      path,
      {
        auth: false,
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Không thể xử lý yêu cầu!',
    )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiError(error.message, error.status, error.errors)
    }

    throw error
  }
}

async function requestAuthJson<T>(
  path: string,
  payload:
    | ForgotPasswordPayload
    | ResetPasswordPayload
    | VerifyAccountPayload
    | ResendVerificationPayload,
) {
  try {
    return await requestJson<T>(
      path,
      {
        auth: false,
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Không thể xử lý yêu cầu!',
    )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiError(error.message, error.status, error.errors)
    }

    throw error
  }
}

export function login(payload: LoginPayload) {
  return requestAuth('/auth/login', payload)
}

export function register(payload: RegisterPayload) {
  return requestAuth('/auth/register', payload)
}

export function forgotPassword(payload: ForgotPasswordPayload) {
  return requestAuthJson<ForgotPasswordResponse>('/auth/forgot-password', payload)
}

export function resetPassword(payload: ResetPasswordPayload) {
  return requestAuthJson<ResetPasswordResponse>('/auth/reset-password', payload)
}

export function verifyAccount(payload: VerifyAccountPayload) {
  return requestAuthJson<VerifyAccountResponse>('/auth/verify', payload)
}

export function resendVerification(payload: ResendVerificationPayload) {
  return requestAuthJson<ResendVerificationResponse>('/auth/resend-verification', payload)
}

async function requestAuthenticated(path: string, options: RequestInit = {}) {
  await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export function logout() {
  return requestAuthenticated('/auth/logout', {
    method: 'POST',
  })
}

export function touchPresence() {
  return requestAuthenticated('/auth/presence', {
    method: 'POST',
  })
}
