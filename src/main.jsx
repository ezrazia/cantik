import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Clean up cache-busting query parameter from URL (PWA Cache Workaround)
if (window.location.search.includes('cb=')) {
  try {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  } catch (e) {
    console.error('Failed to clean cb param:', e);
  }
}

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

// ============================================
// PERSISTENT STORAGE INITIALIZATION
// ============================================
// Meminta browser agar penyimpanan lokal (IndexedDB/localStorage) dijamin permanen
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted().then((persisted) => {
    if (!persisted) {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          console.log('💾 Persistent Storage: Disetujui oleh browser (data aman dari pembersihan otomatis)')
        } else {
          console.warn('💾 Persistent Storage: Ditolak oleh browser (menggunakan best-effort storage)')
        }
      }).catch((err) => {
        console.error('💾 Persistent Storage: Gagal meminta izin:', err)
      })
    } else {
      console.log('💾 Persistent Storage: Sudah aktif (data terjamin permanen)')
    }
  }).catch((err) => {
    console.error('💾 Persistent Storage: Gagal mengecek status:', err)
  })
}

// ============================================
// PWA UPDATE UTILITY FOR STANDALONE
// ============================================
window.__checkForAppUpdates = async (forceBuster = false) => {
  console.log('🔍 Memeriksa pembaruan aplikasi PWA...')
  let hasUpdate = false;
  
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const oldInstalling = reg.installing;
        const oldWaiting = reg.waiting;
        
        await reg.update();
        
        if (reg.installing !== oldInstalling || reg.waiting !== oldWaiting || reg.active === null) {
          hasUpdate = true;
        }
      }
    } catch (e) {
      console.error('Gagal mengecek update service worker:', e);
    }
  }

  if (hasUpdate || forceBuster) {
    console.log('🔄 Update terdeteksi atau diminta. Melakukan pembersihan cache dan hard reload...');
    
    // Clear all caches
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        console.log('🧹 Cache Storage telah dibersihkan.');
      } catch (e) {
        console.error('Gagal membersihkan Cache Storage:', e);
      }
    }
    
    // Hard refresh with cache-buster parameter
    window.location.href = window.location.pathname + '?cb=' + Date.now();
    return true;
  }
  
  return false;
};

// Register Service Worker with auto-update
const updateSW = registerSW({
  onRegisteredSW(swUrl, registration) {
    console.log('✅ Service Worker registered:', swUrl)
    window.__pwaRegistration = registration;
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
