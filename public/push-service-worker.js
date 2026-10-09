importScripts('https://unpkg.com/localforage@1.10.0/dist/localforage.min.js')

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages())
  }
})

async function syncMessages() {
  const pendingMessagesStore = localforage.createInstance({
    name: 'inbox_offline_db',
    storeName: 'pending_messages'
  })
  
  const authStore = localforage.createInstance({
    name: 'inbox_offline_db',
    storeName: 'auth'
  })

  try {
    const queue = await pendingMessagesStore.getItem('queue') || []
    if (queue.length === 0) return

    const token = await authStore.getItem('refreshToken')
    if (!token) return

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    const successfullySent = []

    for (const item of queue) {
      const payload = {
        text: item.message.text,
        parentMessageId: item.parentMessageId,
        isE2ee: item.message.isE2ee,
        e2eeType: item.message.e2eeType
      }

      try {
        const API_BASE_URL = 'http://127.0.0.1:4000/api'
        const response = await fetch(`${API_BASE_URL}/conversations/${item.conversationId}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          successfullySent.push(item.message.id)
        }
      } catch (err) {
        console.error('Failed to sync message', item.message.id, err)
        break 
      }
    }

    if (successfullySent.length > 0) {
      const remainingQueue = queue.filter(item => !successfullySent.includes(item.message.id))
      await pendingMessagesStore.setItem('queue', remainingQueue)
      
      const clients = await self.clients.matchAll()
      clients.forEach(client => {
        client.postMessage({
          type: 'MESSAGES_SYNCED',
          syncedIds: successfullySent
        })
      })
    }
  } catch (err) {
    console.error('Error in syncMessages:', err)
  }
}

self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {}
  const title = payload.title || 'Inbox'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/MessageIcon.jpg',
      badge: payload.badge || '/MessageIcon.jpg',
      tag: payload.tag || 'inbox-notification',
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
