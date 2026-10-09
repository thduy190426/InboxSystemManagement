import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import localforage from 'localforage'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n'
import './style.css'
import { App } from './App'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { Toaster } from 'sonner'

window.addEventListener('vite:preloadError', () => {
  const isReloading = sessionStorage.getItem('vite-preload-error-reload')
  if (!isReloading) {
    sessionStorage.setItem('vite-preload-error-reload', 'true')
    window.location.reload()
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, 
      retry: 1, 
      staleTime: 5 * 60 * 1000, 
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
})

const queryClientPersister = createAsyncStoragePersister({
  storage: localforage,
  key: 'INBOX_QUERY_OFFLINE_CACHE',
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'MESSAGES_SYNCED') {
      console.log('Background sync completed for messages:', event.data.syncedIds)
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-placeholder.apps.googleusercontent.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryClientPersister }}>
        <ThemeProvider>
          <App />
          <Toaster richColors position="top-right" expand={true} visibleToasts={5} />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
