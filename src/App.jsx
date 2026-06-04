import { useState } from "react";
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
import { PETUGAS_DATA } from "./constants/mockData";

/**
 * Komponen root aplikasi CAPI BPS (Desa Cantik).
 * Mengelola navigasi antar screen menggunakan state sederhana.
 * Setiap pergantian screen memicu remount penuh (via key) untuk animasi transisi.
 *
 * @returns {React.ReactElement}
 */
export default function App() {
  const [screen, setScreen] = useState("login");
  const [isOffline, setIsOffline] = useState(false);
  const [selectedProject, setSelectedProject] = useState(""); // empty string represents "Pilih Kegiatan"

  // Lifted petugas state
  const [petugas, setPetugas] = useState(() => {
    const phones = ["0812-7890-1234", "0856-1234-5678", "0813-9876-5432", "0878-5555-1234", "0821-4444-9876"];
    return PETUGAS_DATA.map((p, idx) => {
      const username = p.name.toLowerCase().replace(/\s+/g, ".");
      const id = `32710${idx + 1}0${idx + 1}`;
      const nik = `327101010101000${idx + 1}`;
      const phone = phones[idx % phones.length];
      const asalDesa = `Desa ${p.desa}`;
      let projects = [];
      if (idx === 0) projects = ["Desa Cantik 2026", "Pendataan PLS 2026"];
      else if (idx === 1) projects = ["Desa Cantik 2026", "Survei Ekonomi 2026"];
      else if (idx === 2) projects = ["Desa Cantik 2026", "Pendataan PLS 2026"];
      else if (idx === 3) projects = ["Survei Ekonomi 2026"];
      else projects = ["Survei Ekonomi 2026", "Pendataan PLS 2026"];
      
      let projectRoles = {};
      projects.forEach((proj, pIdx) => {
        projectRoles[proj] = (idx + pIdx) % 2 === 0 ? "PCL" : "PML";
      });

      return { ...p, id, username, phone, nik, asalDesa, projects, projectRoles };
    });
  });

  // Lifted activities state
  const [activities, setActivities] = useState([
    { 
      name: "Desa Cantik 2026", 
      desc: "Pembinaan statistik sektoral untuk desa/kelurahan berkinerja tinggi.", 
      progress: 68, 
      color: "bg-blue-600",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      date: "2026-05-15",
      status: "published" // viewable by officer
    },
    { 
      name: "Survei Ekonomi 2026", 
      desc: "Survei komprehensif pelaku usaha mikro, kecil, dan menengah nasional.", 
      progress: 54, 
      color: "bg-purple-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      date: "2026-06-01",
      status: "published"
    },
    { 
      name: "Pendataan PLS 2026", 
      desc: "Pendataan potensi lokal dan sosial ekonomi tingkat wilayah terkecil.", 
      progress: 75, 
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      date: "2026-04-10",
      status: "published"
    },
    { 
      name: "Survei Demografi 2026", 
      desc: "Pengumpulan parameter kependudukan, fertilitas, dan mortalitas daerah.", 
      progress: 0, 
      color: "bg-amber-600",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      date: "2026-07-20",
      status: "draft" // not viewable by officer
    }
  ]);

  // Shared Clean Data state for dynamic tabulations
  const [cleanData, setCleanData] = useState(() => {
    const desas = ["Harapan Jaya", "Maju Bersama", "Sejahtera"];
    const genders = ["Laki-laki", "Perempuan"];
    const pendidikans = ["Tidak Sekolah", "SD", "SMP", "SMA", "Diploma/S1"];
    const hubungans = ["Kepala Keluarga", "Istri", "Anak", "Orang Tua", "Lainnya"];
    const perkawinans = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
    const names = ["Ahmad", "Budi", "Candra", "Dewi", "Eka", "Feri", "Gita", "Hendra", "Indah", "Joko", "Kartika", "Lestari", "Mulyono", "Nining", "Oki", "Pratiwi", "Rian", "Sari", "Tono", "Wulan"];

    return Array.from({ length: 70 }, (_, i) => {
      const desa = desas[i % desas.length];
      const gender = genders[i % genders.length];
      const name = names[i % names.length] + " " + (i + 1);
      const umur = Math.floor(Math.random() * 60) + 5; // 5 to 65
      
      let hubungan = hubungans[i % hubungans.length];
      let perkawinan = perkawinans[i % perkawinans.length];
      let pendidikan = pendidikans[i % pendidikans.length];
      
      // Logic constraint
      if (umur < 17) {
        perkawinan = "Belum Kawin";
        hubungan = "Anak";
        if (umur < 6) pendidikan = "Tidak Sekolah";
        else if (umur < 12) pendidikan = "SD";
        else pendidikan = "SMP";
      } else {
        if (hubungan === "Anak" && i % 3 === 0) hubungan = "Kepala Keluarga";
      }
      
      const pekerjaan = umur > 15 && i % 4 !== 0 ? "Bekerja" : "Tidak Bekerja";

      return {
        id: i + 1,
        nama: name,
        desa,
        gender,
        umur,
        pendidikan,
        hubungan,
        perkawinan,
        pekerjaan
      };
    });
  });

  // State to notify child components about new data approved
  const [newDataTrigger, setNewDataTrigger] = useState(0);

  // Callback to add mock residents when a document is approved in Review Data
  const handleApproveDocument = (desaName) => {
    const simpleDesa = desaName.replace("Desa ", "");
    const genders = ["Laki-laki", "Perempuan"];
    const pendidikans = ["SMA", "Diploma/S1", "SMP"];
    const names = ["Andika", "Bela", "Citra", "Dodi", "Elsa"];

    const newResidents = Array.from({ length: 3 }, (_, i) => {
      const idx = cleanData.length + i + 1;
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const name = names[Math.floor(Math.random() * names.length)] + " New " + idx;
      const umur = Math.floor(Math.random() * 35) + 18; // 18 to 53
      const pendidikan = pendidikans[Math.floor(Math.random() * pendidikans.length)];
      const hubungan = i === 0 ? "Kepala Keluarga" : i === 1 ? "Istri" : "Anak";
      const perkawinan = hubungan === "Anak" ? "Belum Kawin" : "Kawin";
      const pekerjaan = Math.random() > 0.3 ? "Bekerja" : "Tidak Bekerja";

      return {
        id: idx,
        nama: name,
        desa: simpleDesa,
        gender,
        umur,
        pendidikan,
        hubungan,
        perkawinan,
        pekerjaan
      };
    });

    setCleanData(prev => [...prev, ...newResidents]);
    setNewDataTrigger(prev => prev + 1);
  };

  /**
   * Navigasi ke screen tertentu.
   * @param {string} s - Nama screen tujuan.
   */
  const go = (s) => setScreen(s);

  /** Pemetaan screen name ke komponen yang dirender. */
  const SCREENS = {
    "login":          <LoginScreen onLogin={(role) => go(role === "admin" ? "admin-beranda" : "petugas-home")} />,
    "petugas-home":   <PetugasHome onNavigate={go} isOffline={isOffline} setIsOffline={setIsOffline} />,
    "questionnaire":  <PetugasQuestionnaire onNavigate={go} />,
    "petugas-sync":   <PetugasSync onNavigate={go} />,
    "petugas-settings":<PetugasSettings onNavigate={go} />,
    "admin-beranda":  <AdminBeranda onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} activities={activities} />,
    "admin-dash":     <AdminDashboard onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} />,
    "admin-review":   <AdminDataReview onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} onApproveDocument={handleApproveDocument} />,
    "admin-builder":  <AdminFormBuilder onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} />,
    "admin-users":    <AdminPetugas onNavigate={go} isGlobal={false} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} />,
    "admin-master-petugas": <AdminPetugas onNavigate={go} isGlobal={true} selectedProject={selectedProject} onProjectChange={setSelectedProject} petugas={petugas} setPetugas={setPetugas} activities={activities} />,
    "admin-kegiatan": <AdminKegiatan onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} setActivities={setActivities} petugas={petugas} setPetugas={setPetugas} />,
    "admin-tabulasi": <AdminTabulasi onNavigate={go} selectedProject={selectedProject} onProjectChange={setSelectedProject} activities={activities} cleanData={cleanData} newDataTrigger={newDataTrigger} />,
  };

  return (
    <div className="capi w-full min-h-screen" key={screen}>
      <GlobalStyles />
      {SCREENS[screen] || SCREENS["login"]}
    </div>
  );
}