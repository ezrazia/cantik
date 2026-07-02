import { useState, useEffect } from "react";
import GlobalStyles from "./styles/GlobalStyles";
import LoginScreen from "./pages/auth/LoginScreen";
import PetugasHome from "./pages/petugas/PetugasHome";
import PetugasQuestionnaire from "./pages/petugas/PetugasQuestionnaire";
import PetugasSync from "./pages/petugas/PetugasSync";
import PetugasSettings from "./pages/petugas/PetugasSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDataReview from "./pages/admin/AdminDataReview";
import AdminFormBuilder from "./pages/admin/AdminFormBuilder";
import AdminMasterPetugas from "./pages/admin/AdminMasterPetugas";
import AdminPetugasKegiatan from "./pages/admin/AdminPetugasKegiatan";
import AdminBeranda from "./pages/admin/AdminBeranda";
import AdminKegiatan from "./pages/admin/AdminKegiatan";
import AdminTabulasi from "./pages/admin/AdminTabulasi";
import AdminFreeform from "./pages/admin/AdminFreeform";
import AdminBackup from "./pages/admin/AdminBackup";
import { api, API_BASE } from "./services/api";
import PWAPrompt from "./components/ui/PWAPrompt";
import { NotificationProvider } from "./components/ui/NotificationContext";
import { initAutoSync } from "./services/syncQueue";
import { offlineDB } from "./services/offlineStorage";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * Komponen root aplikasi CAPI BPS (Desa Cantik).
 * Mengelola navigasi antar screen menggunakan state sederhana.
 * Mengambil data secara dinamis dari REST API Backend (MySQL).
 *
 * @returns {React.ReactElement}
 */
export default function App() {
  // Safe initialization with try-catch for localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      try {
        localStorage.removeItem("currentUser");
      } catch {}
      return null;
    }
  });

  const [screen, setScreen] = useState(() => {
    try {
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const savedScreen = localStorage.getItem("currentScreen");
          if (savedScreen && savedScreen !== "login") {
            return savedScreen;
          }
          if (parsedUser.role === "superadmin" || parsedUser.role === "admin") {
            return "admin-beranda";
          } else if (parsedUser.role === "admin_kegiatan") {
            return "admin-dash";
          }
          return "petugas-home";
        } catch {
          try {
            localStorage.removeItem("currentUser");
            localStorage.removeItem("currentScreen");
          } catch {}
          return "login";
        }
      }
    } catch {}
    return "login";
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [selectedProject, setSelectedProject] = useState("");
  const [activities, setActivities] = useState([]);
  const [petugas, setPetugas] = useState([]);
  const [newDataTrigger, setNewDataTrigger] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(true);

  // ─── PWA: Initialize auto-sync when app mounts ─────
  useEffect(() => {
    const cleanup = initAutoSync(API_BASE);
    return cleanup;
  }, []);

  // Load activities and officers dynamically from API
  const refreshData = async () => {
    setGlobalLoading(true);
    try {
      const [acts, pets] = await Promise.all([
        api.kegiatan.getAll(),
        api.petugas.getAll()
      ]);

      // Safe array check before setting state
      const safeActs = Array.isArray(acts) ? acts : [];
      const safePets = Array.isArray(pets) ? pets : [];

      setActivities(safeActs);
      setPetugas(safePets);

      // Sync currentUser state and localStorage with latest database values
      try {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser && currentUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === 'petugas') {
            const latestInfo = safePets.find(p => p.id === parsedUser.id);
            if (latestInfo) {
              const updatedUser = { ...parsedUser, ...latestInfo };
              setCurrentUser(updatedUser);
              localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to sync user data:', e);
      }

      // PWA: Cache data ke IndexedDB untuk offline access
      try {
        if (safeActs.length > 0) await offlineDB.saveAllKegiatan(safeActs);
        if (safePets.length > 0) await offlineDB.saveAllPetugas(safePets);
      } catch (e) {
        console.warn('Gagal cache ke IndexedDB:', e);
      }

      // Auto-select first activity if none is selected
      if (safeActs.length > 0 && !selectedProject) {
        const published = safeActs.find(a => a.status === 'published' || a.status === 'uji_coba');
        setSelectedProject(published ? published.name : safeActs[0].name);
      }
    } catch (err) {
      console.error("Gagal mengambil data dari API:", err);

      // PWA: Fallback ke IndexedDB jika offline
      if (!navigator.onLine) {
        try {
          const cachedActs = await offlineDB.getAllKegiatan();
          const cachedPets = await offlineDB.getAllPetugas();
          if (cachedActs.length > 0) setActivities(cachedActs);
          if (cachedPets.length > 0) setPetugas(cachedPets);
          console.log('📱 Loaded cached data from IndexedDB');
        } catch (e) {
          console.warn('IndexedDB fallback failed:', e);
        }
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser?.id]);

  /**
   * Handler login.
   * @param {Object} user
   */
  const handleLogin = (user) => {
    if (!user || !user.id) {
      console.error('Invalid user data for login');
      return;
    }
    setCurrentUser(user);
    try {
      localStorage.setItem("currentUser", JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user to localStorage:', e);
    }

    let targetScreen = "login";
    if (user.role === "superadmin" || user.role === "admin") {
      targetScreen = "admin-beranda";
    } else if (user.role === "admin_kegiatan") {
      targetScreen = "admin-dash";
    } else {
      targetScreen = "petugas-home";
    }

    setScreen(targetScreen);
    try {
      localStorage.setItem("currentScreen", targetScreen);
    } catch (e) {
      console.warn('Failed to save screen to localStorage:', e);
    }
  };

  /**
   * Handler logout.
   */
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentScreen");
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    setScreen("login");
  };

  /**
   * Navigasi ke screen tertentu.
   * @param {string} s - Nama screen tujuan.
   */
  const go = (s) => {
    if (s === "logout") {
      handleLogout();
    } else {
      setScreen(s);
      try {
        localStorage.setItem("currentScreen", s);
      } catch (e) {
        console.warn('Failed to save screen to localStorage:', e);
      }
    }
  };

  /** Pemetaan screen name ke komponen yang dirender. */
  const SCREENS = {
    "login": <LoginScreen onLogin={handleLogin} />,

    // ─── PETUGAS SCREENS ────────────────────────────────
    "petugas-home": <ErrorBoundary><PetugasHome onNavigate={go} isOffline={isOffline} setIsOffline={setIsOffline} petugas={petugas} activities={activities} currentUser={currentUser} loading={globalLoading} /></ErrorBoundary>,
    "questionnaire": <ErrorBoundary><PetugasQuestionnaire onNavigate={go} petugas={petugas} activities={activities} currentUser={currentUser} isOffline={isOffline} loading={globalLoading} /></ErrorBoundary>,
    "petugas-sync": <ErrorBoundary><PetugasSync onNavigate={go} currentUser={currentUser} isOffline={isOffline} loading={globalLoading} activities={activities} petugas={petugas} /></ErrorBoundary>,
    "petugas-settings": <ErrorBoundary><PetugasSettings onNavigate={go} currentUser={currentUser} /></ErrorBoundary>,

    // ─── ADMIN SCREENS ──────────────────────────────────
    "admin-beranda": <ErrorBoundary><AdminBeranda onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} activities={activities} currentUser={currentUser} loading={globalLoading} /></ErrorBoundary>,
    "admin-dash": <ErrorBoundary><AdminDashboard onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} petugas={petugas} loading={globalLoading} refreshData={refreshData} currentUser={currentUser} /></ErrorBoundary>,
    "admin-review": <ErrorBoundary><AdminDataReview onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} onApproveDocument={() => setNewDataTrigger(t => t + 1)} petugas={petugas} loading={globalLoading} currentUser={currentUser} /></ErrorBoundary>,
    "admin-builder": <ErrorBoundary><AdminFormBuilder onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} loading={globalLoading} /></ErrorBoundary>,
    "admin-users": <ErrorBoundary><AdminPetugasKegiatan onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} refreshData={refreshData} loading={globalLoading} currentUser={currentUser} /></ErrorBoundary>,
    "admin-master-petugas": <ErrorBoundary><AdminMasterPetugas onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} refreshData={refreshData} loading={globalLoading} /></ErrorBoundary>,
    "admin-freeform": <ErrorBoundary><AdminFreeform onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} currentUser={currentUser} /></ErrorBoundary>,
    "admin-kegiatan": <ErrorBoundary><AdminKegiatan onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} setActivities={setActivities} petugas={petugas} setPetugas={setPetugas} refreshData={refreshData} loading={globalLoading} /></ErrorBoundary>,
    "admin-tabulasi": <ErrorBoundary><AdminTabulasi onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} newDataTrigger={newDataTrigger} loading={globalLoading} /></ErrorBoundary>,
    "admin-backup": <ErrorBoundary><AdminBackup onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} loading={globalLoading} /></ErrorBoundary>,
  };

  return (
    <NotificationProvider>
      <div className="capi w-full min-h-screen" key={screen}>
        <GlobalStyles />
        <PWAPrompt />
        {SCREENS[screen] || SCREENS["login"]}
      </div>
    </NotificationProvider>
  );
}
