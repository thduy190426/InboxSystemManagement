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

  return firstSegment === 'register' || legacyHash === 'register' ? 'register' : 'login'
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

  if (firstSegment === 'notifications' || legacyHash === 'notifications') {
    return { view: 'notifications' }
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
    legacyHash === 'login' ||
    legacyHash === 'register'
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
    legacyHash === 'chat' ||
    legacyHash === 'contacts' ||
    legacyHash === 'notifications' ||
    legacyHash === 'profile'
  )
}

export function isKnownRoute(location: RouteLocation = window.location) {
  const segments = getPathSegments(location)
  const legacyHash = getLegacyHash(location)
  const [firstSegment] = segments
  const knownFirstSegments = [
    'login',
    'register',
    'chat',
    'contacts',
    'notifications',
    'profile',
    'terms',
    'privacy',
  ]
  const knownLegacyHashes = [
    '',
    'login',
    'register',
    'chat',
    'contacts',
    'notifications',
    'profile',
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

  if (route.view === 'notifications') {
    return '/notifications'
  }

  if (route.conversationId) {
    return `/chat/${encodeURIComponent(route.conversationId)}`
  }

  return '/chat'
}
