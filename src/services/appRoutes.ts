import type { AppView, AuthScreen } from '../types'

export type AppRoute = {
  view: AppView
  conversationId?: string
}

type RouteLocation = Pick<Location, 'hash' | 'pathname'>

function getPathSegments(location: RouteLocation) {
  return location.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function getLegacyHash(location: RouteLocation) {
  return location.hash.replace(/^#\/?/, '').trim()
}

export function readAuthScreenFromLocation(location: RouteLocation = window.location): AuthScreen {
  const [firstSegment] = getPathSegments(location)
  const legacyHash = getLegacyHash(location)

  if (firstSegment === 'register' || legacyHash === 'register') {
    return 'register'
  }

  if (firstSegment === 'forgot-password' || legacyHash === 'forgot-password') {
    return 'forgot-password'
  }

  if (firstSegment === 'verify-account' || legacyHash === 'verify-account') {
    return 'verify-account'
  }

  if (firstSegment === 'reset-password' || legacyHash === 'reset-password') {
    return 'reset-password'
  }

  return 'login'
}

export function readAppRouteFromLocation(location: RouteLocation = window.location): AppRoute {
  const [firstSegment, secondSegment] = getPathSegments(location)
  const legacyHash = getLegacyHash(location)

  if (firstSegment === 'contacts' || legacyHash === 'contacts') {
    return { view: 'contacts' }
  }

  if (firstSegment === 'profile' || legacyHash === 'profile') {
    return { view: 'profile' }
  }

  if (firstSegment === 'settings' || legacyHash === 'settings') {
    return { view: 'settings' }
  }

  if (firstSegment === 'notifications' || legacyHash === 'notifications') {
    return { view: 'notifications' }
  }

  if (firstSegment === 'admin' || legacyHash === 'admin') {
    return { view: 'admin' }
  }

  if (firstSegment === 'chat') {
    return {
      view: 'chat',
      conversationId: secondSegment ? decodeURIComponent(secondSegment) : undefined,
    }
  }

  return { view: 'chat' }
}

export function isAuthRoute(location: RouteLocation = window.location) {
  const [firstSegment] = getPathSegments(location)
  const legacyHash = getLegacyHash(location)

  return (
    firstSegment === 'login' ||
    firstSegment === 'register' ||
    firstSegment === 'forgot-password' ||
    firstSegment === 'verify-account' ||
    firstSegment === 'reset-password' ||
    legacyHash === 'login' ||
    legacyHash === 'register' ||
    legacyHash === 'forgot-password' ||
    legacyHash === 'verify-account' ||
    legacyHash === 'reset-password'
  )
}

export function isAppRoute(location: RouteLocation = window.location) {
  const [firstSegment] = getPathSegments(location)
  const legacyHash = getLegacyHash(location)

  return (
    firstSegment === 'chat' ||
    firstSegment === 'contacts' ||
    firstSegment === 'notifications' ||
    firstSegment === 'profile' ||
    firstSegment === 'settings' ||
    firstSegment === 'admin' ||
    legacyHash === 'chat' ||
    legacyHash === 'contacts' ||
    legacyHash === 'notifications' ||
    legacyHash === 'profile' ||
    legacyHash === 'settings' ||
    legacyHash === 'admin'
  )
}

export function isKnownRoute(location: RouteLocation = window.location) {
  const segments = getPathSegments(location)
  const legacyHash = getLegacyHash(location)
  const [firstSegment] = segments
  const knownFirstSegments = [
    'login',
    'register',
    'forgot-password',
    'verify-account',
    'reset-password',
    'chat',
    'contacts',
    'notifications',
    'profile',
    'settings',
    'admin',
    'terms',
    'privacy',
  ]
  const knownLegacyHashes = [
    '',
    'login',
    'register',
    'forgot-password',
    'verify-account',
    'reset-password',
    'chat',
    'contacts',
    'notifications',
    'profile',
    'settings',
    'admin',
    'terms',
    'privacy',
  ]

  if (segments.length === 0) {
    return knownLegacyHashes.includes(legacyHash)
  }

  if (!knownFirstSegments.includes(firstSegment)) {
    return false
  }

  if (firstSegment === 'chat') {
    return segments.length <= 2
  }

  return segments.length === 1
}

export function toAuthPath(screen: AuthScreen) {
  return `/${screen}`
}

export function toAppPath(route: AppRoute) {
  if (route.view === 'contacts') {
    return '/contacts'
  }

  if (route.view === 'profile') {
    return '/profile'
  }

  if (route.view === 'settings') {
    return '/settings'
  }

  if (route.view === 'notifications') {
    return '/notifications'
  }

  if (route.view === 'admin') {
    return '/admin'
  }

  if (route.conversationId) {
    return `/chat/${encodeURIComponent(route.conversationId)}`
  }

  return '/chat'
}
