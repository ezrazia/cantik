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
import AdminPetugas from "./pages/admin/AdminPetugas";
import AdminBeranda from "./pages/admin/AdminBeranda";
import AdminKegiatan from "./pages/admin/AdminKegiatan";
import AdminTabulasi from "./pages/admin/AdminTabulasi";
import { api, API_BASE } from "./services/api";
import PWAPrompt from "./components/ui/PWAPrompt";
import { initAutoSync } from "./services/syncQueue";
import { offlineDB } from "./services/offlineStorage";

/**
 * Komponen root aplikasi CAPI BPS (Desa Cantik).
 * Mengelola navigasi antar screen menggunakan state sederhana.
 * Mengambil data secara dinamis dari REST API Backend (MySQL).
 *
 * @returns {React.ReactElement}
 */
export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedProject, setSelectedProject] = useState(""); // empty string represents "Pilih Kegiatan"
  const [activities, setActivities] = useState([]);
  const [petugas, setPetugas] = useState([]);
  const [newDataTrigger, setNewDataTrigger] = useState(0);

  // ─── PWA: Initialize auto-sync when app mounts ─────
  useEffect(() => {
    const cleanup = initAutoSync(API_BASE);
    return cleanup;
  }, []);

  // Load activities and officers dynamically from API
  const refreshData = async () => {
    try {
      const [acts, pets] = await Promise.all([
        api.kegiatan.getAll(),
        api.petugas.getAll()
      ]);
      setActivities(acts);
      setPetugas(pets);
      
      // PWA: Cache data ke IndexedDB untuk offline access
      try {
        await offlineDB.saveAllKegiatan(acts);
        await offlineDB.saveAllPetugas(pets);
      } catch (e) {
        console.warn('Gagal cache ke IndexedDB:', e);
      }
      
      // Auto-select first activity if none is selected
      if (acts.length > 0 && !selectedProject) {
        // Find first published/active activity if possible
        const published = acts.find(a => a.status === 'published' || a.status === 'uji_coba');
        setSelectedProject(published ? published.name : acts[0].name);
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
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]); // Refresh data when login/logout/change occurs

  /**
   * Handler untuk login sukses.
   */
  const handleLogin = (user) => {
    setCurrentUser(user);
    go(user.role === "admin" ? "admin-beranda" : "petugas-home");
  };

  /**
   * Handler logout.
   */
  const handleLogout = () => {
    setCurrentUser(null);
    go("login");
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
    }
  };

  /** Pemetaan screen name ke komponen yang dirender. */
  const SCREENS = {
    "login":          <LoginScreen onLogin={handleLogin} />,
    
    // ─── PETUGAS SCREENS ────────────────────────────────
    "petugas-home":   <PetugasHome onNavigate={go} isOffline={isOffline} setIsOffline={setIsOffline} petugas={petugas} activities={activities} currentUser={currentUser} />,
    "questionnaire":  <PetugasQuestionnaire onNavigate={go} petugas={petugas} activities={activities} currentUser={currentUser} isOffline={isOffline} />,
    "petugas-sync":   <PetugasSync onNavigate={go} currentUser={currentUser} isOffline={isOffline} />,
    "petugas-settings":<PetugasSettings onNavigate={go} currentUser={currentUser} />,
    
    // ─── ADMIN SCREENS ──────────────────────────────────
    "admin-beranda":  <AdminBeranda onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} activities={activities} currentUser={currentUser} />,
    "admin-dash":     <AdminDashboard onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} petugas={petugas} />,
    "admin-review":   <AdminDataReview onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} onApproveDocument={() => setNewDataTrigger(t => t + 1)} petugas={petugas} />,
    "admin-builder":  <AdminFormBuilder onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} />,
    "admin-users":    <AdminPetugas onNavigate={go} isGlobal={false} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} refreshData={refreshData} />,
    "admin-master-petugas": <AdminPetugas onNavigate={go} isGlobal={true} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} refreshData={refreshData} />,
    "admin-kegiatan": <AdminKegiatan onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} setActivities={setActivities} petugas={petugas} setPetugas={setPetugas} refreshData={refreshData} />,
    "admin-tabulasi": <AdminTabulasi onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} newDataTrigger={newDataTrigger} />,
  };

  return (
    <div className="capi w-full min-h-screen" key={screen}>
      <GlobalStyles />
      <PWAPrompt />
      {SCREENS[screen] || SCREENS["login"]}
    </div>
  );
}