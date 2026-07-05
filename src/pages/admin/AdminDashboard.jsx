import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, PieChart, Pie, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, CheckCircle, Clock, XCircle, RefreshCw, ChevronDown, PlusCircle, Target } from "lucide-react";
import useDropdown from '../../hooks/useDropdown';

/**
 * Dashboard Admin — minimalis dengan data visualisasi clean.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminDashboard({ onNavigate, selectedProject, onProjectChange, activities, petugas, loading, refreshData }) {
  const activeActivity = activities?.find(a => a.name === selectedProject);
  const status = activeActivity ? activeActivity.status : "draft";

  const villageDropdown = useDropdown("Semua Desa");
  const [desaStats, setDesaStats] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async () => {
    if (!activeActivity) return;
    setLocalLoading(true);
    try {
      const [desaData, dashData] = await Promise.all([
        api.desa.getStats(activeActivity.id),
        api.dashboard.getStats(activeActivity.id, villageDropdown.selected)
      ]);
      setDesaStats(desaData);
      setDashboardStats(dashData);
    } catch (err) {
      console.error("Gagal mengambil stats dashboard:", err);
    } finally {
      setLocalLoading(false);
    }
  };

  const prevProjectRef = useRef(selectedProject);
  useEffect(() => {
    if (prevProjectRef.current !== selectedProject) {
      prevProjectRef.current = selectedProject;
      villageDropdown.select("Semua Desa");
      return;
    }
    fetchStats();
  }, [selectedProject, activeActivity, villageDropdown.selected]);

  const handleRefresh = async () => {
    if (refreshData) {
      await refreshData();
    }
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

  const isLoading = loading || localLoading;

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

  // Get actual village data from activity lokus - handle both string JSON and object
  const parseLokus = (lokus) => {
    if (!lokus) return { kecamatan: [], desa: [], sls: [], subSls: [] };
    if (typeof lokus === 'string') {
      try {
        return JSON.parse(lokus);
      } catch {
        return { kecamatan: [], desa: [], sls: [], subSls: [] };
      }
    }
    return lokus;
  };

  const parsedLokus = parseLokus(activeActivity?.lokus);
  const activeDesas = parsedLokus.desa || [];

  // If lokus.desa is not set, use the actual village codes from API
  const villages = activeDesas.length > 0
    ? ["Semua Desa", ...activeDesas]
    : ["Semua Desa"]; // Will be populated from API

  const officersList = petugas || [];
  const activeProjectOfficers = officersList.filter(p => p.projects?.includes(selectedProject));

  // Match by village name (without "Desa " prefix)
  const filteredPetugas = villageDropdown.selected === "Semua Desa"
    ? activeProjectOfficers
    : activeProjectOfficers.filter(p => {
        const villageName = villageDropdown.selected.replace("Desa ", "");
        return p.desa === villageName;
      });

  // Use API data for desa stats if available, otherwise use lokus data
  const finalDesaData = desaStats.length > 0
    ? desaStats.map(d => ({
        name: d.name || d.desa, // Use d.desa directly without "Desa " prefix
        target: d.target || 0,
        selesai: d.selesai || 0,
        color: d.color || "#2563eb"
      }))
    : activeDesas.map((desaName, idx) => {
        const colors = ["#2563eb", "#0891b2", "#7c3aed", "#10b981"];
        // If only one village, show it directly without "Desa " prefix
        const displayName = activeDesas.length === 1 ? desaName : desaName;
        return {
          name: displayName,
          target: 0, // No target set yet
          selesai: 0,
          color: colors[idx % colors.length]
        };
      });

  const filteredDesa = villageDropdown.selected === "Semua Desa"
    ? finalDesaData
    : finalDesaData.filter(d => {
        const villageName = villageDropdown.selected.replace("Desa ", "");
        return d.name === villageName;
      });

  const draft = dashboardStats?.summary?.draft ?? 0;
  const review = dashboardStats?.summary?.pending ?? 0;
  const ditolak = dashboardStats?.summary?.rejected ?? 0;
  const selesaiTotal = dashboardStats?.summary?.approved ?? 0;
  const tambahan = dashboardStats?.summary?.tambahan ?? 0;
  const totalAssignment = dashboardStats?.summary?.totalAssignment ?? 0;

  const completionPercent = totalAssignment > 0 ? Math.round((selesaiTotal / totalAssignment) * 100) : 0;

  const lokusProgress = dashboardStats?.summary?.lokusProgress || [];

  const stats = [
    { icon: Target, l: "Total Assignment", v: totalAssignment, color: "text-indigo-600", bg: "bg-indigo-50", ic: "text-indigo-500" },
    { icon: FileText, l: "Draft", v: draft, color: "text-slate-900", bg: "bg-slate-50", ic: "text-slate-500" },
    { icon: Clock, l: "Review", v: review, color: "text-amber-600", bg: "bg-amber-50", ic: "text-amber-500" },
    { icon: XCircle, l: "Ditolak", v: ditolak, color: "text-red-600", bg: "bg-red-50", ic: "text-red-500" },
    { icon: CheckCircle, l: "Selesai", v: selesaiTotal, color: "text-emerald-600", bg: "bg-emerald-50", ic: "text-emerald-500" },
    { icon: PlusCircle, l: "Tambahan", v: tambahan, color: "text-purple-600", bg: "bg-purple-50", ic: "text-purple-500" },
  ];

  const PIE_DATA = [
    { name: "Disetujui", value: selesaiTotal, color: "#16a34a" },
    { name: "Pending",   value: review, color: "#f59e0b" },
    { name: "Ditolak",   value: ditolak, color: "#dc2626" },
    { name: "Draft",     value: draft,  color: "#94a3b8" },
  ];

  const CHART_DATA = dashboardStats?.chartData?.length > 0
    ? dashboardStats.chartData
    : [
        { h: "Sen", k: Math.round(selesaiTotal * 0.15), t: Math.round(ditolak * 0.15) },
        { h: "Sel", k: Math.round(selesaiTotal * 0.2),  t: Math.round(ditolak * 0.2) },
        { h: "Rab", k: Math.round(selesaiTotal * 0.25), t: Math.round(ditolak * 0.15) },
        { h: "Kam", k: Math.round(selesaiTotal * 0.15), t: Math.round(ditolak * 0.2) },
        { h: "Jum", k: Math.round(selesaiTotal * 0.2),  t: Math.round(ditolak * 0.1) },
        { h: "Sab", k: Math.round(selesaiTotal * 0.05), t: Math.round(ditolak * 0.2) },
      ];

  if (isLoading) {
    return (
      <AdminLayout tab="admin-dash" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
        <div className="p-6 lg:p-8 w-full animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
          </div>

          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
                  <div className="h-5 w-10 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row Skeleton */}
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

          {/* Bottom Row Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 flex flex-col items-center justify-center space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded self-start"></div>
              <div className="w-32 h-32 rounded-full border-[12px] border-slate-100 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-100"></div>
              </div>
              <div className="h-3 w-24 bg-slate-100 rounded"></div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 overflow-hidden space-y-4">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
              </div>
              <div className="p-6 pt-0 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                      <div className="h-4.5 w-32 bg-slate-150 rounded"></div>
                    </div>
                    <div className="h-4 w-20 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout tab="admin-dash" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monitoring Pencacahan</h1>
              {selectedProject && (
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
              <span className="text-xs font-medium text-slate-400">{selectedProject}</span>
              <span className="text-slate-200">·</span>
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
                      {villages.map(v => (
                        <button
                          key={v}
                          onClick={() => villageDropdown.select(v)}
                          className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                            villageDropdown.selected === v ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <span className="hidden sm:inline text-xs text-slate-400 font-medium ml-1">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-500 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>
        </div>

        {status === "draft" ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Kegiatan Belum Dimulai</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Kegiatan "{selectedProject}" saat ini masih berstatus Draft. Monitoring pencacahan akan aktif setelah kegiatan ini dipublikasikan (Published).
            </p>
          </div>
        ) : (
          <>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          {stats.map(c => (
            <div key={c.l} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}>
                <c.icon size={18} className={c.ic}/>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{c.l}</p>
                <p className={`mono text-xl font-bold ${c.color}`}>{c.v}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Progress per Lokus */}
          {villageDropdown.selected === "Semua Desa" && (
            <div className="bg-white rounded-xl p-6 border border-slate-100 flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"/>
                  Progress per Lokus
                </div>
              </h3>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-medium text-slate-500 mb-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Selesai</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"/> Review</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ditolak</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Tambahan</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"/> Draft</span>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '300px' }}>
                {lokusProgress.length === 0 && (
                  <div className="text-center text-sm text-slate-500 py-8">Memuat data lokus...</div>
                )}
                {lokusProgress.map(d => {
                  const max = Math.max(d.Total, 1);
                  const pctSelesai = (d.Selesai / max) * 100;
                  const pctReview = (d.Review / max) * 100;
                  const pctDitolak = (d.Ditolak / max) * 100;
                  const pctTambahan = (d.Tambahan / max) * 100;
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
              <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full"/>
                Status Dokumen
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

          {/* Bar chart */}
          <div className="bg-white rounded-xl p-6 border border-slate-100 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
              <div className="w-1 h-5 bg-blue-600 rounded-full"/>
              Kiriman Harian
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={CHART_DATA} barGap={4} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickMargin={8} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="k" radius={[4,4,0,0]} name="Kirim" maxBarSize={40}>
                  {CHART_DATA.map((_, i) => <Cell key={i} fill="#2563eb"/>)}
                </Bar>
                <Bar dataKey="t" radius={[4,4,0,0]} name="Tolak" maxBarSize={40}>
                  {CHART_DATA.map((_, i) => <Cell key={i} fill="#fbbf24"/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Pie */}
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

          {/* Petugas List */}
          <div className={`${villageDropdown.selected === "Semua Desa" ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-xl border border-slate-100 flex flex-col`}>
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-400 rounded-full"/>
                Aktivitas Petugas
              </h3>
              <span className="text-xs text-slate-400 font-medium">{filteredPetugas.length} petugas</span>
            </div>
            
            {/* Legend */}
            <div className="px-6 pt-4 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Selesai</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"/> Review</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ditolak</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Tambahan</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"/> Draft</span>
            </div>

            {/* List with 5 visible items max height */}
            <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: '280px' }}>
              <div className="space-y-5">
                {[...filteredPetugas]
                  .sort((a, b) => {
                    const aSelesai = a.assignments?.[selectedProject]?.selesai || a.selesai || 0;
                    const bSelesai = b.assignments?.[selectedProject]?.selesai || b.selesai || 0;
                    return bSelesai - aSelesai;
                  })
                  .map(p => {
                    const assignment = p.assignments?.[selectedProject] || p.assignments?.[p.projects?.[0]];
                    const pSelesai = assignment?.selesai || p.selesai || 0;
                    const pPending = assignment?.pending || 0;
                    const pRejected = assignment?.rejected || 0;
                    const pTambahan = assignment?.tambahan || 0;
                    const pDraft = assignment?.draft || p.draft || 0;
                    
                    const totalBar = pSelesai + pPending + pRejected + pTambahan + pDraft;
                    const max = Math.max(totalBar, 1);
                    
                    const pctSelesai = (pSelesai / max) * 100;
                    const pctPending = (pPending / max) * 100;
                    const pctRejected = (pRejected / max) * 100;
                    const pctTambahan = (pTambahan / max) * 100;
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
                          <span className="mono text-[10px] font-semibold text-slate-400">{assignment?.target || totalBar} Dokumen</span>
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
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
