import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import { GlobalLoader } from './components/ui/AppSkeleton'

const ChatApp = lazy(() => import('./components/views/ChatApp').then(m => ({ default: m.ChatApp })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const TermsPage = lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })))

import {
  ApiError,
  login,
  loginWithGoogle,
  loginWithFacebook,
  logout,
  register,
  type AuthUser,
} from './services/api/authApi'
import { onSessionExpired } from './services/api/apiClient'
import {
  isAppRoute,
  isAuthRoute,
  isKnownRoute,
  readAuthScreenFromLocation,
  readAppRouteFromLocation,
  toAppPath,
  toAuthPath,
} from './services/core/appRoutes'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession,
  updateStoredAuthUser,
} from './services/storage/authStorage'
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

import { toast } from 'sonner'

export function App() {
  const storedAuthSession = getStoredAuthSession()
  const isRouteTransitioning = useRouteTransitionLoading()
  const isRouteLoaderDisabled = isLoaderDisabledRoute(window.location.pathname, window.location.hash)
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen)
  const [isRouteKnown, setIsRouteKnown] = useState(getInitialRouteKnown)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(storedAuthSession))

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string>('')
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
      pushToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 'error')
      setIsSubmitting(false)
    })
  }, [])

  const pushToast = useCallback(
    (text: string, tone: 'info' | 'error' = 'info') => {
      if (tone === 'error') {
        toast.error(text)
      } else {
        toast.success(text)
      }
    },
    [],
  )

  function navigateAuth(nextScreen: AuthScreen) {
    window.history.pushState(null, '', toAuthPath(nextScreen))
    setIsRouteKnown(true)
    setAuthScreen(nextScreen)
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
    pushToast('Tài khoản của bạn đã được xoá!', 'error')
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
        recaptchaToken: payload.recaptchaToken,
      })

      handleAuthSuccess(response, payload.rememberLogin === 'true')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể đăng nhập!'
      setAuthError(message)
      pushToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLoginAction(token: string) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      const response = await loginWithGoogle(token)
      handleAuthSuccess(response, true)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể đăng nhập bằng Google!'
      setAuthError(message)
      pushToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFacebookLoginAction(token: string) {
    setIsSubmitting(true)
    setAuthError('')

    try {
      const response = await loginWithFacebook(token)
      handleAuthSuccess(response, true)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể đăng nhập bằng Facebook!'
      setAuthError(message)
      pushToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegister(payload: Record<string, string>) {
    setIsSubmitting(true)

    try {
      const response = await register({
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      })

      window.history.replaceState(null, '', toAuthPath('login'))
      setIsRouteKnown(true)
      setAuthScreen('login')
      setAuthError('')
      pushToast(response.message, 'info')

    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'Không thể đăng ký!', 'error')
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


    return (
      <LoginPage
        errorMessage={authError}
        isSubmitting={isSubmitting}
        onSubmit={handleLogin}
        onSwitchMode={() => {
          setAuthError('')
          navigateAuth('register')
        }}
        onGoogleLogin={handleGoogleLoginAction}
        onFacebookLogin={handleFacebookLoginAction}
      />
    )
  })()

  return (
    <>
      <Suspense fallback={<GlobalLoader />}>
        {content}
      </Suspense>
      {isRouteLoaderDisabled ? null : <RouteTransitionLoader isVisible={isRouteTransitioning} />}
    </>
  )
}
