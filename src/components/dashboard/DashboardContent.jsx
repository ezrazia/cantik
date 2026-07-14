import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Cell, Tooltip, PieChart, Pie, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { FileText, CheckCircle, Clock, XCircle, RefreshCw, ChevronDown, PlusCircle, Target, Maximize2, X, ClipboardList } from "lucide-react";
import useDropdown from '../../hooks/useDropdown';
import SelectDropdown from '../ui/SelectDropdown';

export default function DashboardContent({ 
  activities, 
  petugas, 
  kegiatanId = '', // bisa berupa ID single, atau string comma-separated
  groupBy = 'desa', // 'desa' | 'kegiatan'
  isGabungan = false,
  title = "Monitoring Pencacahan",
  activeProjectName = ""
}) {
  const [desaStats, setDesaStats] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [chartRange, setChartRange] = useState("7");
  const [fullscreenCard, setFullscreenCard] = useState(null);
  const villageDropdown = useDropdown("Semua Desa");
  const kegiatanDropdown = useDropdown("Semua Kegiatan");

  const activeActivity = activities?.find(a => a.name === activeProjectName) || null;
  const status = isGabungan ? "published" : (activeActivity ? activeActivity.status : "draft");

  const fetchStats = async () => {
    // If not gabungan and no active activity, skip
    if (!isGabungan && !activeActivity) return;
    
    setLocalLoading(true);
    try {
      const apiPromises = [];
      // Hanya ambil desa stats jika single kegiatan
      if (!isGabungan && activeActivity) {
         apiPromises.push(api.desa.getStats(activeActivity.id));
      } else {
         apiPromises.push(Promise.resolve([]));
      }

      let dashUrl = `/dashboard/stats?range=${chartRange}`;
      
      let finalKegiatanId = kegiatanId;
      if (isGabungan && kegiatanDropdown.selected !== "Semua Kegiatan") {
        const selectedAct = activities?.find(a => a.name === kegiatanDropdown.selected);
        if (selectedAct) finalKegiatanId = selectedAct.id.toString();
      }
      
      if (finalKegiatanId) {
         dashUrl += `&kegiatan_id=${finalKegiatanId}`;
      }
      if (groupBy) {
         dashUrl += `&groupBy=${groupBy}`;
      }
      if (villageDropdown.selected && villageDropdown.selected !== "Semua Desa") {
         dashUrl += `&desa=${encodeURIComponent(villageDropdown.selected)}`;
      }

      // Fetch dashboard directly
      const dashPromise = fetch(`/api${dashUrl}`, {
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());

      const [desaData, dashData] = await Promise.all([
        apiPromises[0],
        dashPromise
      ]);
      setDesaStats(desaData);
      setDashboardStats(dashData);
    } catch (err) {
      console.error("Gagal mengambil stats dashboard:", err);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [kegiatanId, villageDropdown.selected, kegiatanDropdown.selected, chartRange, groupBy]);

  const handleRefresh = async () => {
    await fetchStats();
    setLastUpdated(new Date());
  };

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(lastUpdated).replace(/\./g, ':');

  const getStatusConfig = () => {
    switch (status) {
      case "published":
        return { dot: "bg-emerald-500", pulse: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50", label: "Published" };
      case "selesai":
        return { dot: "bg-red-500", pulse: "bg-red-400", text: "text-red-600", bg: "bg-red-50", label: "Selesai" };
      case "uji_coba":
        return { dot: "bg-blue-500", pulse: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50", label: "Uji Coba" };
      case "draft":
      default:
        return { dot: "bg-amber-500", pulse: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50", label: "Draft" };
    }
  };

  const statusConfig = getStatusConfig();

  // Villages mapping
  let activeDesas = [];
  if (!isGabungan && activeActivity?.lokus) {
    let parsedLokus = { desa: [] };
    if (typeof activeActivity.lokus === 'string') {
      try { parsedLokus = JSON.parse(activeActivity.lokus); } catch (e) {}
    } else {
      parsedLokus = activeActivity.lokus;
    }
    activeDesas = parsedLokus.desa || [];
  }

  const villages = (activeDesas.length > 0 && !isGabungan)
    ? ["Semua Desa", ...activeDesas]
    : ["Semua Desa"];

  let combinedActivities = [];
  if (isGabungan && activities) {
    if (kegiatanId) {
      const ids = kegiatanId.split(',').map(id => parseInt(id, 10));
      combinedActivities = activities.filter(a => ids.includes(a.id));
    } else {
      combinedActivities = activities;
    }
  }
  const kegiatanOptions = ["Semua Kegiatan", ...combinedActivities.map(a => a.name)];

  const officersList = petugas || [];
  let activeProjectOfficers = officersList;
  if (!isGabungan && activeProjectName) {
    activeProjectOfficers = officersList.filter(p => p.projects?.includes(activeProjectName));
  } else if (isGabungan && kegiatanDropdown.selected !== "Semua Kegiatan") {
    activeProjectOfficers = officersList.filter(p => p.projects?.includes(kegiatanDropdown.selected));
  }

  const filteredPetugas = villageDropdown.selected === "Semua Desa"
    ? activeProjectOfficers
    : activeProjectOfficers.filter(p => {
        const villageName = villageDropdown.selected.replace("Desa ", "");
        return p.desa === villageName;
      });

  const draft = dashboardStats?.summary?.draft ?? 0;
  const review = dashboardStats?.summary?.pending ?? 0;
  const ditolak = dashboardStats?.summary?.rejected ?? 0;
  const selesaiTotal = dashboardStats?.summary?.approved ?? 0;
  const tambahan = dashboardStats?.summary?.tambahan ?? 0;
  const totalAssignment = dashboardStats?.summary?.totalAssignment ?? 0;
  const prelist = dashboardStats?.summary?.prelist ?? (totalAssignment - tambahan);

  // Breakdowns from server
  const approvedPrelist = dashboardStats?.summary?.approvedPrelist ?? Math.max(0, prelist - draft - review - ditolak);
  const approvedTambahan = dashboardStats?.summary?.approvedTambahan ?? Math.max(0, selesaiTotal - approvedPrelist);
  const reviewPrelist = dashboardStats?.summary?.reviewPrelist ?? review;
  const reviewTambahan = dashboardStats?.summary?.reviewTambahan ?? 0;
  const rejectedPrelist = dashboardStats?.summary?.rejectedPrelist ?? ditolak;
  const rejectedTambahan = dashboardStats?.summary?.rejectedTambahan ?? 0;
  const draftPrelist = dashboardStats?.summary?.draftPrelist ?? draft;
  const draftTambahan = dashboardStats?.summary?.draftTambahan ?? 0;

  // Dalam Proses Tambahan (Draft + Review/Pending + Rejected)
  const prosesTambahan = Math.max(0, tambahan - approvedTambahan);
  const total = totalAssignment;

  const completionPercent = totalAssignment > 0 ? Math.round((selesaiTotal / totalAssignment) * 100) : 0;
  const lokusProgress = dashboardStats?.summary?.lokusProgress || [];

  const workloadStats = [
    { icon: Target, l: "Total Assignment", v: totalAssignment, color: "text-indigo-600", bg: "bg-indigo-50", ic: "text-indigo-500", sub: `${prelist} Prelist · ${tambahan} Tambahan` },
  ];

  const statusStats = [
    { icon: FileText, l: "Draft / Dalam Proses", v: draft + prosesTambahan, color: "text-slate-900", bg: "bg-slate-50", ic: "text-slate-500", sub: `${draft} Prelist · ${prosesTambahan} Tambahan (Proses)` },
    { icon: Clock, l: "Review", v: review + reviewTambahan, color: "text-amber-600", bg: "bg-amber-50", ic: "text-amber-500", sub: `${review} Prelist · ${reviewTambahan} Tambahan` },
    { icon: XCircle, l: "Ditolak", v: ditolak + rejectedTambahan, color: "text-red-600", bg: "bg-red-50", ic: "text-red-500", sub: `${ditolak} Prelist · ${rejectedTambahan} Tambahan` },
    { icon: CheckCircle, l: "Selesai", v: selesaiTotal, color: "text-emerald-600", bg: "bg-emerald-50", ic: "text-emerald-500", sub: `${approvedPrelist} Prelist · ${approvedTambahan} Tambahan` },
  ];

  const PIE_DATA = [
    { name: "Disetujui", value: selesaiTotal, color: "#16a34a" },
    { name: "Pending",   value: review, color: "#f59e0b" },
    { name: "Ditolak",   value: ditolak, color: "#dc2626" },
    { name: "Draft",     value: draft,  color: "#94a3b8" },
  ];

  const CHART_DATA = dashboardStats?.chartData?.length > 0
    ? dashboardStats.chartData.map(d => {
        const dateObj = new Date(d.date);
        return {
          ...d,
          h: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(dateObj),
          k: d.k
        };
      })
    : [];
    
  const barColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316'];

  if (localLoading) {
    return (
      <div className="w-full animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Workload Group Skeleton */}
            <div className="lg:col-span-3 bg-white/50 rounded-2xl p-5 border border-slate-100/80">
              <div className="h-3 w-32 bg-slate-200 rounded mb-4 animate-pulse"></div>
              <div className="grid grid-cols-1">
                <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-16 bg-slate-100 rounded"></div>
                    <div className="h-5 w-10 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Progress Group Skeleton */}
            <div className="lg:col-span-9 bg-white/50 rounded-2xl p-5 border border-slate-100/80">
              <div className="h-3 w-36 bg-slate-200 rounded mb-4 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-16 bg-slate-100 rounded"></div>
                      <div className="h-5 w-10 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 space-y-4">
              <div className="h-4 w-36 bg-slate-200 rounded"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-slate-100 rounded"></div>
                      <div className="h-3 w-8 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-100 lg:col-span-2 space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-[200px] bg-slate-100 rounded-xl"></div>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {(!isGabungan && activeProjectName) && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                </span>
                <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {activeProjectName && (
               <>
                 <span className="text-xs font-medium text-slate-400">{activeProjectName}</span>
                 <span className="text-slate-200">·</span>
               </>
            )}
            
            {!isGabungan && (
              <div className="relative">
                <button 
                  onClick={villageDropdown.toggle}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border-0"
                >
                  {villageDropdown.selected} <ChevronDown size={12} className={`transition-transform duration-200 ${villageDropdown.isOpen ? 'rotate-180' : ''}`}/>
                </button>
                
                {villageDropdown.isOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={villageDropdown.close}/>
                    <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-56 overflow-hidden" style={{ animation: 'scaleIn 0.15s ease' }}>
                      {villages.map((desa) => (
                        <button
                          key={desa}
                          onClick={() => {
                            villageDropdown.select(desa);
                            villageDropdown.close();
                          }}
                          className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${villageDropdown.selected === desa ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'}`}
                        >
                          {desa}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {isGabungan && (
              <div className="relative">
                <button 
                  onClick={kegiatanDropdown.toggle}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-all cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg border-0"
                >
                  {kegiatanDropdown.selected} <ChevronDown size={12} className={`transition-transform duration-200 ${kegiatanDropdown.isOpen ? 'rotate-180' : ''}`}/>
                </button>
                
                {kegiatanDropdown.isOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={kegiatanDropdown.close}/>
                    <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-64 overflow-y-auto max-h-60 custom-scrollbar" style={{ animation: 'scaleIn 0.15s ease' }}>
                      {kegiatanOptions.map((keg) => (
                        <button
                          key={keg}
                          onClick={() => {
                            kegiatanDropdown.select(keg);
                            kegiatanDropdown.close();
                          }}
                          className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${kegiatanDropdown.selected === keg ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'}`}
                        >
                          {keg}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            <span className="hidden sm:inline text-xs text-slate-400 font-medium ml-1">
              {!isGabungan ? '· ' : ''}{formattedDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={localLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-500 cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={localLoading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {status === "draft" && !isGabungan ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Kegiatan Belum Dimulai</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Kegiatan "{activeProjectName}" saat ini masih berstatus Draft. Monitoring pencacahan akan aktif setelah kegiatan ini dipublikasikan (Published).
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Workload Group */}
            <div className="lg:col-span-3 bg-white/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-100/80">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Ringkasan Beban Kerja
              </h4>
              <div className="grid grid-cols-1">
                {workloadStats.map(c => (
                  <div key={c.l} className="bg-white rounded-xl p-4 border border-slate-100/50 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}>
                      <c.icon size={18} className={c.ic}/>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{c.l}</p>
                      <p className={`mono text-2xl font-bold ${c.color} mt-0.5`}>{c.v}</p>
                      {c.sub && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-normal">
                          {c.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Progress Group */}
            <div className="lg:col-span-9 bg-white/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-100/80">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Progress Status Dokumen
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statusStats.map(c => (
                  <div key={c.l} className="bg-white rounded-xl p-4 border border-slate-100/50 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}>
                      <c.icon size={18} className={c.ic}/>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{c.l}</p>
                      <p className={`mono text-xl font-bold ${c.color} mt-0.5`}>{c.v}</p>
                      {c.sub && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-normal">
                          {c.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {villageDropdown.selected === "Semua Desa" && (
              <div className="bg-white rounded-xl p-6 border border-slate-100 flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"/>
                    {groupBy === 'kegiatan' ? 'Progress per Kegiatan' : 'Progress per Lokus'}
                  </div>
                  <button onClick={() => setFullscreenCard('lokus')} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Perbesar">
                    <Maximize2 size={16} />
                  </button>
                </h3>
                
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-medium text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Selesai</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"/> Review</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ditolak</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Tambahan</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"/> Draft</span>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '300px' }}>
                  {lokusProgress.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-8">Memuat data...</div>
                  )}
                  {lokusProgress.map(d => {
                    const max = Math.max(d.Total, 1);
                    const pctSelesai = (d.Selesai / max) * 100;
                    const pctReview = (d.Review / max) * 100;
                    const pctDitolak = (d.Ditolak / max) * 100;
                    const unapprovedTambahan = Math.max(0, (d.Tambahan || 0) - (d.TambahanApproved || 0));
                    const pctTambahan = (unapprovedTambahan / max) * 100;
                    const pctDraft = (d.Draft / max) * 100;

                    const tooltipText = `Total: ${d.Total}\nSelesai: ${d.Selesai}\nReview: ${d.Review}\nDitolak: ${d.Ditolak}\nTambahan: ${d.Tambahan}\nDraft: ${d.Draft}`;

                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-700 truncate pr-4" title={d.name}>{d.name}</span>
                          <span className="mono text-[10px] font-semibold text-slate-400">{d.Total} Dokumen</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                          {d.Selesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                          {d.Review > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${pctReview}%` }} />}
                          {d.Ditolak > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctDitolak}%` }} />}
                          {d.Tambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                          {d.Draft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {villageDropdown.selected !== "Semua Desa" && (
              <div className="bg-white rounded-xl p-6 border border-slate-100 flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full"/>
                    Status Dokumen
                  </div>
                  <button onClick={() => setFullscreenCard('status')} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer" title="Perbesar">
                    <Maximize2 size={16} />
                  </button>
                </h3>
                <div className="flex-1 flex flex-col justify-center items-center py-4">
                  <div className="relative w-48 h-48 mb-4">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12"/>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#2563eb" strokeWidth="12"
                        strokeDasharray={`${completionPercent * 3.14} 314`} strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="mono text-3xl font-bold text-slate-900">{completionPercent}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{selesaiTotal} dari {total} selesai</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 border border-slate-100 lg:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"/>
                  Kiriman Harian
                </h3>
                <div className="flex items-center gap-2">
                  <SelectDropdown 
                    value={chartRange}
                    onChange={(e) => setChartRange(e.target.value)}
                    align="right"
                    options={[
                      { value: '7', label: '7 Hari Terakhir' },
                      { value: '30', label: '1 Bulan Terakhir' },
                      { value: 'all', label: 'Semua Waktu' }
                    ]}
                  />
                  <button onClick={() => setFullscreenCard('harian')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Perbesar">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  {isGabungan && kegiatanDropdown.selected === "Semua Kegiatan" ? (
                    <LineChart data={CHART_DATA} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickMargin={12} />
                      <YAxis domain={[0, Math.max(...CHART_DATA.map(d => d.k || 0), 5)]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} tickCount={5} />
                      <Tooltip 
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12, padding: '12px' }}
                        labelStyle={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      {combinedActivities.map((act, i) => (
                        <Line key={act.name} type="monotone" dataKey={act.name} name={act.name} stroke={barColors[i % barColors.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart data={CHART_DATA} barGap={4} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickMargin={12} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} tickCount={5} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12, padding: '12px' }}
                        labelStyle={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                      />
                      <Bar dataKey="k" radius={[6,6,0,0]} name="Dokumen Terkirim" maxBarSize={48} fill="#2563eb">
                        {CHART_DATA.map((_, i) => <Cell key={i} fill="#2563eb"/>)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {villageDropdown.selected === "Semua Desa" && (
              <div className="bg-white rounded-xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full"/>
                  Status Dokumen
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={70} outerRadius={95}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {PIE_DATA.map(e => <Cell key={e.name} fill={e.color}/>)}
                    </Pie>
                    <Tooltip
                      content={({ active }) => {
                        if (active) {
                          return (
                            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg min-w-[150px]">
                              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 pb-2 border-b border-slate-100">Semua Status</p>
                              <div className="space-y-1.5">
                                {PIE_DATA.map(d => (
                                  <div key={d.name} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }}/>
                                      <span className="text-slate-600 font-medium">{d.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-800">{d.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {PIE_DATA.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }}/>
                      <span className="text-[10px] text-slate-500 font-medium">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGabungan && villageDropdown.selected === "Semua Desa" && (
              <div className="bg-white rounded-xl p-6 border border-slate-100 flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full"/>
                    Progress per Kegiatan
                  </div>
                  <button onClick={() => setFullscreenCard('kegiatan')} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer" title="Perbesar">
                    <Maximize2 size={16} />
                  </button>
                </h3>
                
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-medium text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Selesai</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"/> Review</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ditolak</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Tambahan</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"/> Draft</span>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '280px' }}>
                  {dashboardStats?.summary?.kegiatanProgress?.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-8">Belum ada data</div>
                  )}
                  {dashboardStats?.summary?.kegiatanProgress
                    ?.sort((a, b) => {
                       const maxA = Math.max(a.Total, 1);
                       const maxB = Math.max(b.Total, 1);
                       const pctDraftA = (a.Draft / maxA) * 100;
                       const pctDraftB = (b.Draft / maxB) * 100;
                       return pctDraftA - pctDraftB;
                    })
                    ?.map(d => {
                    const max = Math.max(d.Total, 1);
                    const pctSelesai = (d.Selesai / max) * 100;
                    const pctReview = (d.Review / max) * 100;
                    const pctDitolak = (d.Ditolak / max) * 100;
                    const unapprovedTambahan = Math.max(0, (d.Tambahan || 0) - (d.TambahanApproved || 0));
                    const pctTambahan = (unapprovedTambahan / max) * 100;
                    const pctDraft = (d.Draft / max) * 100;
                    const progressVal = (100 - pctDraft).toFixed(1);

                    const tooltipText = `Kegiatan: ${d.name}\nTotal Assignment: ${d.Total}\nPersentase Progress: ${progressVal}%\nSelesai: ${d.Selesai}\nReview: ${d.Review}\nDitolak: ${d.Ditolak}\nTambahan: ${d.Tambahan}\nDraft: ${d.Draft}`;

                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-700 truncate pr-4" title={d.name}>{d.name}</span>
                          <span className="mono text-[10px] font-semibold text-slate-400">{d.Total} Dok ({progressVal}%)</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                          {d.Selesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                          {d.Review > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${pctReview}%` }} />}
                          {d.Ditolak > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctDitolak}%` }} />}
                          {d.Tambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                          {d.Draft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`${villageDropdown.selected === "Semua Desa" ? (isGabungan ? "lg:col-span-1" : "lg:col-span-2") : "lg:col-span-3"} bg-white rounded-xl border border-slate-100 flex flex-col`}>
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-400 rounded-full"/>
                  Aktivitas Petugas
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">{filteredPetugas.length} petugas</span>
                  <button onClick={() => setFullscreenCard('petugas')} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer" title="Perbesar">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="px-6 pt-4 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Selesai</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"/> Review</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ditolak</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Tambahan</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"/> Draft</span>
              </div>

              <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: '280px' }}>
                <div className="space-y-5">
                  {[...filteredPetugas]
                    .map(p => {
                      let pSelesai = 0, pPending = 0, pRejected = 0, pTambahan = 0, pTambahanApproved = 0, pDraft = 0;
                      let target = 0;
                      
                      if (isGabungan && kegiatanDropdown.selected === "Semua Kegiatan") {
                          if (p.assignments) {
                              Object.values(p.assignments).forEach(ass => {
                                  pSelesai += ass.selesai || 0;
                                  pPending += ass.pending || 0;
                                  pRejected += ass.rejected || 0;
                                  pTambahan += ass.tambahan || 0;
                                  pTambahanApproved += ass.tambahan_approved || 0;
                                  pDraft += ass.draft || 0;
                                  target += ass.target || 0;
                              });
                          } else {
                              pSelesai = p.selesai || 0;
                              pDraft = p.draft || 0;
                              target = p.target || 0;
                          }
                      } else if (isGabungan && kegiatanDropdown.selected !== "Semua Kegiatan") {
                          const ass = p.assignments?.[kegiatanDropdown.selected];
                          pSelesai = ass?.selesai || 0;
                          pPending = ass?.pending || 0;
                          pRejected = ass?.rejected || 0;
                          pTambahan = ass?.tambahan || 0;
                          pTambahanApproved = ass?.tambahan_approved || 0;
                          pDraft = ass?.draft || 0;
                          target = ass?.target || 0;
                      } else {
                          const ass = p.assignments?.[activeProjectName] || p.assignments?.[p.projects?.[0]];
                          pSelesai = ass?.selesai || p.selesai || 0;
                          pPending = ass?.pending || 0;
                          pRejected = ass?.rejected || 0;
                          pTambahan = ass?.tambahan || 0;
                          pTambahanApproved = ass?.tambahan_approved || 0;
                          pDraft = ass?.draft || p.draft || 0;
                          target = ass?.target || p.target || 0;
                      }
                      
                      const unapprovedTambahan = Math.max(0, pTambahan - pTambahanApproved);
                      const totalBar = pSelesai + pPending + pRejected + unapprovedTambahan + pDraft;
                      return { p, pSelesai, pPending, pRejected, pTambahan, unapprovedTambahan, pDraft, target, totalBar };
                    })
                    .sort((a, b) => b.pSelesai - a.pSelesai)
                    .map(({ p, pSelesai, pPending, pRejected, pTambahan, unapprovedTambahan, pDraft, target, totalBar }) => {
                      const max = Math.max(totalBar, 1);
                      
                      const pctSelesai = (pSelesai / max) * 100;
                      const pctPending = (pPending / max) * 100;
                      const pctRejected = (pRejected / max) * 100;
                      const pctTambahan = (unapprovedTambahan / max) * 100;
                      const pctDraft = (pDraft / max) * 100;
                      
                      const tooltipText = `Petugas: ${p.name}\nTotal Bar: ${totalBar}\nSelesai: ${pSelesai}\nReview: ${pPending}\nDitolak: ${pRejected}\nTambahan: ${pTambahan}\nDraft: ${pDraft}`;

                      return (
                        <div key={p.name} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-[9px] font-bold text-blue-600">
                                {p.name?.split(' ').map(n=>n[0]).join('') || p.name?.[0]}
                              </div>
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={p.name}>{p.name}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[100px]">{p.desa}</span>
                            </div>
                            <span className="mono text-[10px] font-semibold text-slate-400">{target || totalBar} Dokumen</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                            {pSelesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                            {pPending > 0 && <div className="h-full bg-orange-400 transition-all" style={{ width: `${pctPending}%` }} />}
                            {pRejected > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctRejected}%` }} />}
                            {pTambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                            {pDraft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Modal */}
      {fullscreenCard && (
        <div className="fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setFullscreenCard(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             {/* Header */}
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {fullscreenCard === 'lokus' && <><div className="w-1.5 h-6 bg-blue-600 rounded-full"/> Progress per Lokus</>}
                  {fullscreenCard === 'harian' && <><div className="w-1.5 h-6 bg-blue-600 rounded-full"/> Kiriman Harian</>}
                  {fullscreenCard === 'status' && <><div className="w-1.5 h-6 bg-emerald-500 rounded-full"/> Status Dokumen</>}
                  {fullscreenCard === 'kegiatan' && <><div className="w-1.5 h-6 bg-indigo-500 rounded-full"/> Progress per Kegiatan</>}
                  {fullscreenCard === 'petugas' && <><div className="w-1.5 h-6 bg-amber-400 rounded-full"/> Aktivitas Petugas</>}
               </h2>
               <button onClick={() => setFullscreenCard(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                 <X size={20} />
               </button>
             </div>
             {/* Content */}
             <div className="flex-1 overflow-y-auto p-6 bg-white">
                {fullscreenCard === 'lokus' && (
                  <>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 mb-6">
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/> Selesai</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"/> Review</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/> Ditolak</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"/> Tambahan</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300"/> Draft</span>
                    </div>

                    <div className="space-y-6 pr-4">
                      {lokusProgress.length === 0 && (
                        <div className="text-center text-sm text-slate-500 py-8">Memuat data...</div>
                      )}
                      {lokusProgress.map(d => {
                        const max = Math.max(d.Total, 1);
                        const pctSelesai = (d.Selesai / max) * 100;
                        const pctReview = (d.Review / max) * 100;
                        const pctDitolak = (d.Ditolak / max) * 100;
                        const unapprovedTambahan = Math.max(0, (d.Tambahan || 0) - (d.TambahanApproved || 0));
                        const pctTambahan = (unapprovedTambahan / max) * 100;
                        const pctDraft = (d.Draft / max) * 100;

                        const tooltipText = `Total: ${d.Total}\nSelesai: ${d.Selesai}\nReview: ${d.Review}\nDitolak: ${d.Ditolak}\nTambahan: ${d.Tambahan}\nDraft: ${d.Draft}`;

                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-800 truncate pr-4" title={d.name}>{d.name}</span>
                              <span className="mono text-xs font-bold text-slate-500">{d.Total} Dokumen</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                              {d.Selesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                              {d.Review > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${pctReview}%` }} />}
                              {d.Ditolak > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctDitolak}%` }} />}
                              {d.Tambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                              {d.Draft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {fullscreenCard === 'status' && (
                  <div className="flex-1 flex flex-col justify-center items-center py-10">
                    <div className="relative w-64 h-64 mb-6">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12"/>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#2563eb" strokeWidth="12"
                          strokeDasharray={`${(selesaiTotal/Math.max(total, 1)) * 314} 314`} strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="mono text-5xl font-bold text-slate-900">{Math.round((selesaiTotal/Math.max(total, 1)) * 100)}%</span>
                      </div>
                    </div>
                    <p className="text-lg text-slate-500 font-medium mb-8">{selesaiTotal} dari {total} selesai</p>
                    
                    <div className="w-full max-w-md">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={PIE_DATA || []} cx="50%" cy="50%" innerRadius={90} outerRadius={120}
                            paddingAngle={3} dataKey="value" stroke="none">
                            {PIE_DATA?.map(e => <Cell key={e.name} fill={e.color}/>)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {fullscreenCard === 'harian' && (
                  <div className="w-full h-[60vh] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {isGabungan && kegiatanDropdown.selected === "Semua Kegiatan" ? (
                        <LineChart data={CHART_DATA} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="h" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickMargin={16} />
                          <YAxis domain={[0, Math.max(...CHART_DATA.map(d => d.k || 0), 5)]} tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} allowDecimals={false} tickCount={8} />
                          <Tooltip 
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 14, padding: '16px' }}
                            labelStyle={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                          />
                          <Legend verticalAlign="top" height={50} wrapperStyle={{ fontSize: 14 }} />
                          {combinedActivities.map((act, i) => (
                            <Line key={act.name} type="monotone" dataKey={act.name} name={act.name} stroke={barColors[i % barColors.length]} strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          ))}
                        </LineChart>
                      ) : (
                        <BarChart data={CHART_DATA} barGap={6} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="h" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickMargin={16} />
                          <YAxis tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} allowDecimals={false} tickCount={8} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 14, padding: '16px' }}
                            labelStyle={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                          />
                          <Bar dataKey="k" radius={[8,8,0,0]} name="Dokumen Terkirim" maxBarSize={64} fill="#2563eb">
                            {CHART_DATA.map((_, i) => <Cell key={i} fill="#2563eb"/>)}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}

                {fullscreenCard === 'kegiatan' && (
                  <>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 mb-6">
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/> Selesai</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"/> Review</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/> Ditolak</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"/> Tambahan</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300"/> Draft</span>
                    </div>

                    <div className="space-y-6 pr-4">
                      {dashboardStats?.summary?.kegiatanProgress?.length === 0 && (
                        <div className="text-center text-sm text-slate-500 py-8">Belum ada data</div>
                      )}
                      {dashboardStats?.summary?.kegiatanProgress
                        ?.sort((a, b) => {
                           const maxA = Math.max(a.Total, 1);
                           const maxB = Math.max(b.Total, 1);
                           const pctDraftA = (a.Draft / maxA) * 100;
                           const pctDraftB = (b.Draft / maxB) * 100;
                           return pctDraftA - pctDraftB;
                        })
                        ?.map(d => {
                        const max = Math.max(d.Total, 1);
                        const pctSelesai = (d.Selesai / max) * 100;
                        const pctReview = (d.Review / max) * 100;
                        const pctDitolak = (d.Ditolak / max) * 100;
                        const unapprovedTambahan = Math.max(0, (d.Tambahan || 0) - (d.TambahanApproved || 0));
                        const pctTambahan = (unapprovedTambahan / max) * 100;
                        const pctDraft = (d.Draft / max) * 100;
                        const progressVal = (100 - pctDraft).toFixed(1);

                        const tooltipText = `Kegiatan: ${d.name}\nTotal Assignment: ${d.Total}\nPersentase Progress: ${progressVal}%\nSelesai: ${d.Selesai}\nReview: ${d.Review}\nDitolak: ${d.Ditolak}\nTambahan: ${d.Tambahan}\nDraft: ${d.Draft}`;

                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-800 truncate pr-4" title={d.name}>{d.name}</span>
                              <span className="mono text-xs font-bold text-slate-500">{d.Total} Dok ({progressVal}%)</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                              {d.Selesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                              {d.Review > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${pctReview}%` }} />}
                              {d.Ditolak > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctDitolak}%` }} />}
                              {d.Tambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                              {d.Draft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {fullscreenCard === 'petugas' && (
                  <>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 mb-6">
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/> Selesai</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-400"/> Review</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/> Ditolak</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"/> Tambahan</span>
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300"/> Draft</span>
                    </div>

                    <div className="space-y-6 pr-4">
                      {[...filteredPetugas]
                        .map(p => {
                          let pSelesai = 0, pPending = 0, pRejected = 0, pTambahan = 0, pTambahanApproved = 0, pDraft = 0;
                          let target = 0;
                          
                          if (isGabungan && kegiatanDropdown.selected === "Semua Kegiatan") {
                              if (p.assignments) {
                                  Object.values(p.assignments).forEach(ass => {
                                      pSelesai += ass.selesai || 0;
                                      pPending += ass.pending || 0;
                                      pRejected += ass.rejected || 0;
                                      pTambahan += ass.tambahan || 0;
                                      pTambahanApproved += ass.tambahan_approved || 0;
                                      pDraft += ass.draft || 0;
                                      target += ass.target || 0;
                                  });
                              } else {
                                  pSelesai = p.selesai || 0;
                                  pDraft = p.draft || 0;
                                  target = p.target || 0;
                              }
                          } else if (isGabungan && kegiatanDropdown.selected !== "Semua Kegiatan") {
                              const ass = p.assignments?.[kegiatanDropdown.selected];
                              pSelesai = ass?.selesai || 0;
                              pPending = ass?.pending || 0;
                              pRejected = ass?.rejected || 0;
                              pTambahan = ass?.tambahan || 0;
                              pTambahanApproved = ass?.tambahan_approved || 0;
                              pDraft = ass?.draft || 0;
                              target = ass?.target || 0;
                          } else {
                              const ass = p.assignments?.[activeProjectName] || p.assignments?.[p.projects?.[0]];
                              pSelesai = ass?.selesai || p.selesai || 0;
                              pPending = ass?.pending || 0;
                              pRejected = ass?.rejected || 0;
                              pTambahan = ass?.tambahan || 0;
                              pTambahanApproved = ass?.tambahan_approved || 0;
                              pDraft = ass?.draft || p.draft || 0;
                              target = ass?.target || p.target || 0;
                          }
                          
                          const unapprovedTambahan = Math.max(0, pTambahan - pTambahanApproved);
                          const totalBar = pSelesai + pPending + pRejected + unapprovedTambahan + pDraft;
                          return { p, pSelesai, pPending, pRejected, pTambahan, unapprovedTambahan, pDraft, target, totalBar };
                        })
                        .filter(item => {
                           if (isGabungan && kegiatanDropdown.selected !== "Semua Kegiatan") {
                               const ass = item.p.assignments?.[kegiatanDropdown.selected];
                               return ass && (ass.target > 0 || item.totalBar > 0 || (ass.sls && ass.sls.length > 0));
                           }
                           return true;
                        })
                        .sort((a, b) => b.pSelesai - a.pSelesai)
                        .map(({ p, pSelesai, pPending, pRejected, pTambahan, unapprovedTambahan, pDraft, target, totalBar }) => {
                          const max = Math.max(totalBar, 1);
                          
                          const pctSelesai = (pSelesai / max) * 100;
                          const pctPending = (pPending / max) * 100;
                          const pctRejected = (pRejected / max) * 100;
                          const pctTambahan = (unapprovedTambahan / max) * 100;
                          const pctDraft = (pDraft / max) * 100;
                          
                          const tooltipText = `Petugas: ${p.name}\nTotal Bar: ${totalBar}\nSelesai: ${pSelesai}\nReview: ${pPending}\nDitolak: ${pRejected}\nTambahan: ${pTambahan}\nDraft: ${pDraft}`;

                          return (
                            <div key={p.name} className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
                                    {p.name?.split(' ').map(n=>n[0]).join('') || p.name?.[0]}
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[300px]" title={p.name}>{p.name}</span>
                                  <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded truncate">{p.desa}</span>
                                </div>
                                <span className="mono text-xs font-semibold text-slate-500">{target || totalBar} Dokumen</span>
                              </div>
                              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex w-full cursor-help" title={tooltipText}>
                                {pSelesai > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSelesai}%` }} />}
                                {pPending > 0 && <div className="h-full bg-orange-400 transition-all" style={{ width: `${pctPending}%` }} />}
                                {pRejected > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${pctRejected}%` }} />}
                                {pTambahan > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${pctTambahan}%` }} />}
                                {pDraft > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${pctDraft}%` }} />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
