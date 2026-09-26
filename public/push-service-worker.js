self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {}
  const title = payload.title || 'Inbox'

  const isCustomSoundSender = title.includes('Trần Hoàng Duy') || title.includes('Bảo Nghi')

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/favicon.svg',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || 'inbox-notification',
      silent: isCustomSoundSender,
      data: {
        url: payload.url || '/',
      },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      const focusedClient = clients.find((client) => client.url === targetUrl)

      if (focusedClient) {
        return focusedClient.focus()
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})
