import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register Service Worker with auto-update
const updateSW = registerSW({
  onRegisteredSW(swUrl, registration) {
    console.log('✅ Service Worker registered:', swUrl)
    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onOfflineReady() {
    console.log('📱 App siap digunakan secara offline!')
  },
  onNeedRefresh() {
    // Auto-update: reload when new version available
    console.log('🔄 Versi baru tersedia, memperbarui...')
    updateSW(true)
  },
  onRegisterError(error) {
    console.error('❌ SW registration error:', error)
  },
})

// Expose updateSW globally for PWAPrompt component
window.__pwaUpdateSW = updateSW

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
