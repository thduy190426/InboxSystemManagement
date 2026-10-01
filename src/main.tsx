import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './style.css'
import { App } from './App'
import { ThemeProvider } from './components/providers/ThemeProvider'

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
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
