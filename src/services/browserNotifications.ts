import { requestJson } from './apiClient'

type BrowserNotificationPayload = {
  body?: string
  tag?: string
  url?: string
}

type PushConfigResponse = {
  enabled: boolean
  publicKey: string
}

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported' as const
  }

  return Notification.requestPermission()
}

export function shouldShowBrowserNotification() {
  return 'Notification' in window && Notification.permission === 'granted'
}

export function showBrowserNotification(title: string, payload: BrowserNotificationPayload = {}) {
  if (!shouldShowBrowserNotification()) {
    return
  }

  const notification = new Notification(title, {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag,
  })

  notification.onclick = () => {
    window.focus()

    if (payload.url) {
      window.history.pushState(null, '', payload.url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }

    notification.close()
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export async function registerWebPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      enabled: false,
      reason: 'unsupported' as const,
    }
  }

  const config = await requestJson<PushConfigResponse>('/push/config')

  if (!config.enabled || !config.publicKey) {
    return {
      enabled: false,
      reason: 'missing-vapid' as const,
    }
  }

  const registration = await navigator.serviceWorker.register('/push-service-worker.js')
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      userVisibleOnly: true,
    }))

  await requestJson('/push/subscriptions', {
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
    method: 'POST',
  })

  return {
    enabled: true,
    reason: 'registered' as const,
  }
}
