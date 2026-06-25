import { useEffect, useRef, useState } from 'react'
import { ChatApp } from './components/ChatApp'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { RegisterPage } from './pages/RegisterPage'
import { TermsPage } from './pages/TermsPage'
import { ApiError, login, logout, register, type AuthUser } from './services/authApi'
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

function shouldShowRouteTransitionLoader(pathname: string) {
  return pathname === '/chat' || pathname.startsWith('/chat/') || pathname === '/contacts' || pathname === '/notifications'
}

function useRouteTransitionLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    function startLoading() {
      if (!shouldShowRouteTransitionLoader(window.location.pathname)) {
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

    function emitRouteTransition() {
      window.dispatchEvent(new Event(ROUTE_TRANSITION_EVENT))
    }

    type HistoryStateArgs = [data: unknown, unused: string, url?: string | URL | null]
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function pushState(...args: HistoryStateArgs) {
      const previousHref = window.location.href
      const result = originalPushState.apply(window.history, args)

      if (window.location.href !== previousHref) {
        emitRouteTransition()
      }

      return result
    } as History['pushState']

    window.history.replaceState = function replaceState(...args: HistoryStateArgs) {
      const previousHref = window.location.href
      const result = originalReplaceState.apply(window.history, args)

      if (window.location.href !== previousHref) {
        emitRouteTransition()
      }

      return result
    } as History['replaceState']

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

export function App() {
  const storedAuthSession = getStoredAuthSession()
  const isRouteTransitioning = useRouteTransitionLoading()
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen)
  const [isRouteKnown, setIsRouteKnown] = useState(getInitialRouteKnown)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(storedAuthSession))
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      setIsSubmitting(false)
    })
  }, [])

  function navigateAuth(nextScreen: AuthScreen) {
    window.history.pushState(null, '', toAuthPath(nextScreen))
    setIsRouteKnown(true)
    setAuthScreen(nextScreen)
    setAuthError('')
  }

  function handleAuthSuccess(
    response: Awaited<ReturnType<typeof login>>,
    rememberLogin: boolean,
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
  }

  async function handleLogout() {
    await logout().catch(() => undefined)
    clearStoredAuthSession()
    window.history.replaceState(null, '', toAuthPath('login'))
    setIsRouteKnown(true)
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthScreen('login')
  }

  function handleAccountDeleted() {
    clearStoredAuthSession()
    window.history.replaceState(null, '', toAuthPath('login'))
    setIsRouteKnown(true)
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthScreen('login')
    setAuthError('Tài khoản của bạn đã được xoá.')
  }

  function handleUserChange(user: AuthUser) {
    updateStoredAuthUser(user)
    setCurrentUser(user)
  }

  async function handleLogin(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      const response = await login({
        email: payload.email,
        password: payload.password,
      })

      handleAuthSuccess(response, payload.rememberLogin === 'true')
    } catch (error) {
      setAuthError(error instanceof ApiError ? error.message : 'Không thể đăng nhập.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegister(payload: Record<string, string>) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      await register({
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      })

      const response = await login({
        email: payload.email,
        password: payload.password,
      })

      handleAuthSuccess(response, true)
    } catch (error) {
      setAuthError(error instanceof ApiError ? error.message : 'Không thể đăng kí.')
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
          errorMessage={authError}
          isSubmitting={isSubmitting}
          onSubmit={handleRegister}
          onSwitchMode={() => navigateAuth('login')}
        />
      )
    }

    return (
      <LoginPage
        errorMessage={authError}
        isSubmitting={isSubmitting}
        onSubmit={handleLogin}
        onSwitchMode={() => navigateAuth('register')}
      />
    )
  })()

  return (
    <>
      {content}
      <RouteTransitionLoader isVisible={isRouteTransitioning} />
    </>
  )
}
