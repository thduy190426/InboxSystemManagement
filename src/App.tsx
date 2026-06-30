import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatApp } from './components/ChatApp'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyAccountPage } from './pages/VerifyAccountPage'
import { TermsPage } from './pages/TermsPage'
import {
  ApiError,
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyAccount,
  type AuthUser,
  type VerificationChannel,
} from './services/authApi'
import { onSessionExpired } from './services/apiClient'
import {
  isAppRoute,
  isAuthRoute,
  isKnownRoute,
  readAuthScreenFromLocation,
  readAppRouteFromLocation,
  toAppPath,
  toAuthPath,
} from './services/appRoutes'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession,
  updateStoredAuthUser,
} from './services/authStorage'
import type { AuthScreen } from './types'

const ROUTE_TRANSITION_EVENT = 'app:route-transition'
const ROUTE_TRANSITION_DURATION = 520

function getInitialAuthScreen(): AuthScreen {
  return readAuthScreenFromLocation()
}

function getInitialRouteKnown() {
  return isKnownRoute()
}

function isChatRoute(pathname: string) {
  return pathname === '/chat' || pathname.startsWith('/chat/')
}

function isLoaderDisabledRoute(pathname: string, hash = '') {
  const legacyHash = hash.replace(/^#\/?/, '').trim()

  return (
    isChatRoute(pathname) ||
    pathname === '/contacts' ||
    pathname === '/notifications' ||
    legacyHash === 'chat' ||
    legacyHash === 'contacts' ||
    legacyHash === 'notifications'
  )
}

function shouldShowRouteTransitionLoader(
  previousPathname: string,
  currentPathname: string,
  currentHash = window.location.hash,
) {
  if (isLoaderDisabledRoute(previousPathname) || isLoaderDisabledRoute(currentPathname, currentHash)) {
    return false
  }

  return false
}

function useRouteTransitionLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<number | null>(null)


  useEffect(() => {
    type RouteTransitionDetail = { previousPathname: string }
    type HistoryStateArgs = [data: unknown, unused: string, url?: string | URL | null]
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function pushState(...args: HistoryStateArgs) {
      const previousHref = window.location.href
      const previousPathname = window.location.pathname
      const result = originalPushState.apply(window.history, args)

      if (window.location.href !== previousHref) {
        window.dispatchEvent(
          new CustomEvent<RouteTransitionDetail>(ROUTE_TRANSITION_EVENT, {
            detail: { previousPathname },
          }),
        )
      }

      return result
    } as History['pushState']

    window.history.replaceState = function replaceState(...args: HistoryStateArgs) {
      const previousHref = window.location.href
      const previousPathname = window.location.pathname
      const result = originalReplaceState.apply(window.history, args)

      if (window.location.href !== previousHref) {
        window.dispatchEvent(
          new CustomEvent<RouteTransitionDetail>(ROUTE_TRANSITION_EVENT, {
            detail: { previousPathname },
          }),
        )
      }

      return result
    } as History['replaceState']

    function startLoading(event: Event) {
      const previousPathname =
        event instanceof CustomEvent
          ? (event as CustomEvent<RouteTransitionDetail>).detail.previousPathname
          : window.location.pathname

      if (!shouldShowRouteTransitionLoader(previousPathname, window.location.pathname)) {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }

        setIsLoading(false)
        return
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      setIsLoading(true)
      timerRef.current = window.setTimeout(() => {
        setIsLoading(false)
        timerRef.current = null
      }, ROUTE_TRANSITION_DURATION)
    }

    window.addEventListener(ROUTE_TRANSITION_EVENT, startLoading)
    window.addEventListener('popstate', startLoading)
    window.addEventListener('hashchange', startLoading)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener(ROUTE_TRANSITION_EVENT, startLoading)
      window.removeEventListener('popstate', startLoading)
      window.removeEventListener('hashchange', startLoading)
    }
  }, [])

  return isLoading
}

function RouteTransitionLoader({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      aria-hidden={!isVisible}
      aria-live="polite"
      className={isVisible ? 'route-loader is-visible' : 'route-loader'}
      role="status"
    >
      <div className="route-loader-panel">
        <div className="route-loader-mark">
          <span />
          <span />
          <span />
        </div>
        <div className="route-loader-copy">
          <strong>Đang tải dữ liệu</strong>
          <span>Chuẩn bị giao diện mới...</span>
        </div>
      </div>
      <div className="route-loader-bar" />
    </div>
  )
}

type AppToast = {
  id: string
  text: string
  tone?: 'info' | 'error'
}

export function App() {
  const storedAuthSession = getStoredAuthSession()
  const isRouteTransitioning = useRouteTransitionLoading()
  const isRouteLoaderDisabled = isLoaderDisabledRoute(window.location.pathname, window.location.hash)
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen)
  const [isRouteKnown, setIsRouteKnown] = useState(getInitialRouteKnown)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(storedAuthSession))
  const [authError, setAuthError] = useState('')
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [passwordResetCode, setPasswordResetCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationChannels, setVerificationChannels] = useState<VerificationChannel[]>(['email'])
  const [devEmailVerificationCode, setDevEmailVerificationCode] = useState('')
  const [devPhoneVerificationCode, setDevPhoneVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toasts, setToasts] = useState<AppToast[]>([])
  const toastTimersRef = useRef<Record<string, number>>({})
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    storedAuthSession?.user ?? null,
  )

  useEffect(() => {
    function handleLocationChange() {
      setIsRouteKnown(isKnownRoute())

      if (!isAuthenticated) {
        setAuthScreen(readAuthScreenFromLocation())
      }
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isRouteKnown && isAuthenticated && isAuthRoute()) {
      window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
    }
  }, [isAuthenticated, isRouteKnown])

  useEffect(() => {
    if (isRouteKnown && !isAuthenticated && isAppRoute()) {
      window.history.replaceState(null, '', toAuthPath('login'))
      setIsRouteKnown(true)
      setAuthScreen('login')
    }
  }, [isAuthenticated, isRouteKnown])

  useEffect(() => {
    return onSessionExpired(() => {
      window.history.replaceState(null, '', toAuthPath('login'))
      setIsRouteKnown(true)
      setIsAuthenticated(false)
      setCurrentUser(null)
      setAuthScreen('login')
      setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!')
      setIsSubmitting(false)
    })
  }, [])

  const dismissToast = useCallback((toastId: string) => {
    const timerId = toastTimersRef.current[toastId]

    if (timerId) {
      window.clearTimeout(timerId)
      delete toastTimersRef.current[toastId]
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const pushToast = useCallback(
    (text: string, tone: AppToast['tone'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      setToasts((current) => [...current, { id, text, tone }])
      toastTimersRef.current[id] = window.setTimeout(() => {
        dismissToast(id)
      }, 3200)
    },
    [dismissToast],
  )

  function navigateAuth(nextScreen: AuthScreen) {
    window.history.pushState(null, '', toAuthPath(nextScreen))
    setIsRouteKnown(true)
    setAuthScreen(nextScreen)
    setAuthError('')
    setAuthSuccessMessage('')
    setPasswordResetCode('')
    setDevEmailVerificationCode('')
    setDevPhoneVerificationCode('')
  }

  function handleAuthSuccess(
    response: Awaited<ReturnType<typeof login>>,
    rememberLogin: boolean,
    successMessage: string = 'Đăng nhập thành công!',
  ) {
    storeAuthSession(response, rememberLogin)
    setCurrentUser(response.user)

    if (isAppRoute()) {
      window.history.replaceState(null, '', toAppPath(readAppRouteFromLocation()))
    } else {
      window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
    }

    setIsRouteKnown(true)
    setIsAuthenticated(true)
    setAuthError('')
    pushToast(successMessage, 'info')
  }

  async function handleLogout() {
    await logout().catch(() => undefined)
    clearStoredAuthSession()
    window.history.replaceState(null, '', toAuthPath('login'))
    setIsRouteKnown(true)
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthScreen('login')
    pushToast('Đăng xuất thành công!', 'info')
  }

  function handleAccountDeleted() {
    clearStoredAuthSession()
    window.history.replaceState(null, '', toAuthPath('login'))
    setIsRouteKnown(true)
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthScreen('login')
    setAuthError('Tài khoản của bạn đã được xoá!')
  }

  function handleUserChange(user: AuthUser) {
    updateStoredAuthUser(user)
    setCurrentUser(user)
  }

  async function handleLogin(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')

    try {
      const response = await login({
        email: payload.email,
        password: payload.password,
      })

      handleAuthSuccess(response, payload.rememberLogin === 'true')
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'Không thể đăng nhập!', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegister(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')

    try {
      const response = await register({
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      })

      setVerificationEmail(payload.email)
      setVerificationChannels(response.verification?.requiredChannels || ['email'])
      setDevEmailVerificationCode(response.verification?.emailCode || '')
      setDevPhoneVerificationCode(response.verification?.phoneCode || '')
      setAuthSuccessMessage(response.message)
      window.history.replaceState(null, '', toAuthPath('verify-account'))
      setIsRouteKnown(true)
      setAuthScreen('verify-account')
      pushToast(response.message, 'info')

    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'Không thể đăng ký!', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerifyAccount(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      const response = await verifyAccount({
        channel: payload.channel as VerificationChannel,
        code: payload.code,
        email: payload.email,
      })
      const requiredChannels = response.verification.requiredChannels

      setVerificationEmail(payload.email)
      setVerificationChannels(requiredChannels)
      setAuthSuccessMessage(response.message)

      if (payload.channel === 'email') {
        setDevEmailVerificationCode('')
      } else {
        setDevPhoneVerificationCode('')
      }

      if (requiredChannels.length === 0) {
        window.history.replaceState(null, '', toAuthPath('login'))
        setIsRouteKnown(true)
        setAuthScreen('login')
        setAuthSuccessMessage('')
        pushToast('Tài khoản đã được xác thực. Vui lòng đăng nhập!', 'info')
      } else {
        pushToast(response.message, 'info')
      }
    } catch (error) {
      setAuthError(error instanceof ApiError ? error.message : 'Không thể xác thực tài khoản!')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendVerification(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      const response = await resendVerification({
        channel: payload.channel as VerificationChannel,
        email: payload.email,
      })

      setVerificationEmail(payload.email)
      setAuthSuccessMessage(response.message)

      if (payload.channel === 'email') {
        setDevEmailVerificationCode(response.verificationCode || '')
      } else {
        setDevPhoneVerificationCode(response.verificationCode || '')
      }

      pushToast(response.message, 'info')
    } catch (error) {
      setAuthError(error instanceof ApiError ? error.message : 'Không thể gửi lại mã xác thực!')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgotPassword(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')
    setPasswordResetCode('')

    try {
      const response = await forgotPassword({
        email: payload.email,
      })

      setAuthSuccessMessage(response.message)
      setPasswordResetCode(response.resetCode || '')
      pushToast(response.message, 'info')
    } catch (error) {
      setAuthError(
        error instanceof ApiError ? error.message : 'Không thể tạo yêu cầu đặt lại mật khẩu!',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')

    try {
      const response = await resetPassword({
        email: payload.email,
        token: payload.token,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      })

      window.history.replaceState(null, '', toAuthPath('login'))
      setIsRouteKnown(true)
      setAuthScreen('login')
      setAuthSuccessMessage('')
      setPasswordResetCode('')
      setAuthError('')
      pushToast(response.message, 'info')
    } catch (error) {
      setAuthError(error instanceof ApiError ? error.message : 'Không thể đặt lại mật khẩu!')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoHomeFromNotFound() {
    const nextPath = isAuthenticated ? toAppPath({ view: 'chat' }) : toAuthPath('login')

    window.history.pushState(null, '', nextPath)
    setIsRouteKnown(true)
    setAuthScreen('login')
  }

  function handleGoBackFromNotFound() {
    if (window.history.length > 1) {
      window.history.back()
      return
    }

    handleGoHomeFromNotFound()
  }

  const content = (() => {
    if (!isRouteKnown) {
      return (
        <NotFoundPage
          isAuthenticated={isAuthenticated}
          onGoBack={handleGoBackFromNotFound}
          onGoHome={handleGoHomeFromNotFound}
        />
      )
    }

    if (window.location.pathname === '/terms') {
      return <TermsPage />
    }

    if (window.location.pathname === '/privacy') {
      return <PrivacyPolicyPage />
    }

    if (isAuthenticated) {
      return (
        <ChatApp
          currentUser={currentUser}
          onAccountDeleted={handleAccountDeleted}
          onLogout={handleLogout}
          onUserChange={handleUserChange}
        />
      )
    }

    if (authScreen === 'register') {
      return (
        <RegisterPage
          isSubmitting={isSubmitting}
          onSubmit={handleRegister}
          onSwitchMode={() => navigateAuth('login')}
          pushToast={pushToast}
        />
      )
    }

    if (authScreen === 'verify-account') {
      return (
        <VerifyAccountPage
          defaultEmail={verificationEmail}
          devEmailCode={devEmailVerificationCode}
          devPhoneCode={devPhoneVerificationCode}
          errorMessage={authError}
          isSubmitting={isSubmitting}
          onResend={handleResendVerification}
          onSubmit={handleVerifyAccount}
          onSwitchMode={() => navigateAuth('login')}
          requiredChannels={verificationChannels}
          successMessage={authSuccessMessage}
        />
      )
    }

    if (authScreen === 'forgot-password') {
      return (
        <ForgotPasswordPage
          errorMessage={authError}
          isSubmitting={isSubmitting}
          onResetPassword={() => navigateAuth('reset-password')}
          onSubmit={handleForgotPassword}
          onSwitchMode={() => navigateAuth('login')}
          resetCode={passwordResetCode}
          successMessage={authSuccessMessage}
        />
      )
    }

    if (authScreen === 'reset-password') {
      return (
        <ResetPasswordPage
          errorMessage={authError}
          isSubmitting={isSubmitting}
          onSubmit={handleResetPassword}
          onSwitchMode={() => navigateAuth('login')}
        />
      )
    }

    return (
      <LoginPage
        isSubmitting={isSubmitting}
        onSubmit={handleLogin}
        onForgotPassword={() => navigateAuth('forgot-password')}
        onSwitchMode={() => navigateAuth('register')}
      />
    )
  })()

  function renderToasts() {
    if (toasts.length === 0) {
      return null
    }

    return (
      <div aria-live="polite" className="toast-stack" role="status">
        {toasts.map((toast) => (
          <button
            className={`toast ${toast.tone === 'info' ? 'is-info' : 'is-error'}`}
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            {toast.text}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {content}
      {isRouteLoaderDisabled ? null : <RouteTransitionLoader isVisible={isRouteTransitioning} />}
      {renderToasts()}
    </>
  )
}
