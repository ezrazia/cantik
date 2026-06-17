import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// ============================================
// ANTI-ZOOM PROTECTION (PWA App Mode Only)
// ============================================
// Zoom hanya dinonaktifkan saat aplikasi berjalan sebagai PWA (standalone)
// Admin di browser masih bisa zoom normally

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true ||
                     document.referrer.includes('android-app://')

if (isStandalone) {
  // Prevent pinch-to-zoom
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })

  // Prevent double-tap zoom
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })

  // Prevent gesture changes (Safari)
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener('gesturechange', (e) => e.preventDefault())
  document.addEventListener('gestureend', (e) => e.preventDefault())

  // Prevent keyboard zoom (Android)
  const metaViewport = document.querySelector('meta[name="viewport"]')
  if (metaViewport) {
    metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover')
  }

  console.log('🔒 Zoom protection enabled (PWA standalone mode)')
} else {
  console.log('🌐 Zoom allowed (browser mode - admin can zoom)')
}

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
