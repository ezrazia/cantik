import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { Database, Download, Sliders, CheckCircle, RefreshCw, X, Table, Info, ChevronDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Map variables for readable labels
const VARIABLE_LABELS = {
  desa: "Desa",
  pendidikan: "Pendidikan",
  hubungan: "Status Hubungan",
  perkawinan: "Status Perkawinan",
  pekerjaan: "Status Pekerjaan",
  gender: "Jenis Kelamin",
};

const METRIC_LABELS = {
  count: "Jumlah Penduduk (Jiwa)",
  avg_age: "Rata-rata Umur (Tahun)",
};

// Custom ordering for variables to look neat in tables
const VALUE_ORDER = {
  desa: ["Harapan Jaya", "Maju Bersama", "Sejahtera"],
  gender: ["Laki-laki", "Perempuan"],
  pendidikan: ["Tidak Sekolah", "SD", "SMP", "SMA", "Diploma/S1"],
  hubungan: ["Kepala Keluarga", "Istri", "Anak", "Orang Tua", "Lainnya"],
  perkawinan: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
  pekerjaan: ["Bekerja", "Tidak Bekerja"],
};

const PRESETS = [
  {
    name: "Kependudukan per Desa",
    row: "desa",
    col: "gender",
    metric: "count",
    desc: "Jumlah penduduk laki-laki dan perempuan di setiap desa binaan.",
  },
  {
    name: "Pendidikan & Pekerjaan",
    row: "pendidikan",
    col: "pekerjaan",
    metric: "count",
    desc: "Tingkat pendidikan disandingkan dengan status ketenagakerjaan.",
  },
  {
    name: "Rata-rata Umur & Gender",
    row: "perkawinan",
    col: "gender",
    metric: "avg_age",
    desc: "Rata-rata umur penduduk berdasarkan status nikah dan jenis kelamin.",
  },
  {
    name: "Hubungan Keluarga & Nikah",
    row: "hubungan",
    col: "perkawinan",
    metric: "count",
    desc: "Status hubungan dalam keluarga dan status perkawinan.",
  },
];

const COLORS = ["#2563eb", "#7c3aed", "#10b981", "#f59e0b", "#e11d48", "#06b6d4"];

export default function AdminTabulasi({
  onNavigate,
  selectedProject,
  onProjectChange,
  activities,
  cleanData,
  newDataTrigger,
}) {
  const [rowVar, setRowVar] = useState("desa");
  const [colVar, setColVar] = useState("gender");
  const [metric, setMetric] = useState("count");

  // Dropdown open states
  const [isRowDropdownOpen, setIsRowDropdownOpen] = useState(false);
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);

  // Real-time notification states
  const [showToast, setShowToast] = useState(false);
  const [prevTrigger, setPrevTrigger] = useState(newDataTrigger);

  // Recharts mount fix state (to prevent height: -1 collapses in Vite HMR)
  const [isChartMounted, setIsChartMounted] = useState(false);

  useEffect(() => {
    setIsChartMounted(true);
  }, []);

  useEffect(() => {
    if (newDataTrigger > 0 && newDataTrigger !== prevTrigger) {
      setShowToast(true);
      setPrevTrigger(newDataTrigger);
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [newDataTrigger, prevTrigger]);

  // Find selected activity status to show data finality info
  const currentActivity = activities ? activities.find(a => a.name === selectedProject) : null;
  const activityStatus = currentActivity ? currentActivity.status : "draft";

  const getStatusConfig = () => {
    switch (activityStatus) {
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

  // Extract unique values for Rows and Columns, applying custom order if available
  const getUniqueValues = (variable) => {
    const values = [...new Set(cleanData.map((d) => d[variable]))].filter(Boolean);
    const order = VALUE_ORDER[variable];
    if (order) {
      return order.filter((val) => values.includes(val)).concat(values.filter((val) => !order.includes(val)));
    }
    return values.sort();
  };

  const rowValues = getUniqueValues(rowVar);
  const colValues = getUniqueValues(colVar);

  // Compute Pivot Table Data
  const pivotData = {};
  const rowTotals = {};
  const colTotals = {};
  let grandTotal = 0;

  // Initialize
  rowValues.forEach((rVal) => {
    pivotData[rVal] = {};
    colValues.forEach((cVal) => {
      pivotData[rVal][cVal] = 0;
    });
  });

  if (metric === "count") {
    // 1. COUNT METRIC
    rowValues.forEach((rVal) => {
      let rSum = 0;
      colValues.forEach((cVal) => {
        const matches = cleanData.filter(
          (d) => String(d[rowVar]) === String(rVal) && String(d[colVar]) === String(cVal)
        );
        const val = matches.length;
        pivotData[rVal][cVal] = val;
        rSum += val;

        colTotals[cVal] = (colTotals[cVal] || 0) + val;
      });
      rowTotals[rVal] = rSum;
      grandTotal += rSum;
    });
  } else if (metric === "avg_age") {
    // 2. AVERAGE AGE METRIC
    // Compute cells
    rowValues.forEach((rVal) => {
      colValues.forEach((cVal) => {
        const matches = cleanData.filter(
          (d) => String(d[rowVar]) === String(rVal) && String(d[colVar]) === String(cVal)
        );
        if (matches.length > 0) {
          const sum = matches.reduce((acc, curr) => acc + curr.umur, 0);
          pivotData[rVal][cVal] = Math.round((sum / matches.length) * 10) / 10;
        } else {
          pivotData[rVal][cVal] = 0;
        }
      });
    });

    // Compute Row Totals (average age of all matching row values)
    rowValues.forEach((rVal) => {
      const matches = cleanData.filter((d) => String(d[rowVar]) === String(rVal));
      if (matches.length > 0) {
        const sum = matches.reduce((acc, curr) => acc + curr.umur, 0);
        rowTotals[rVal] = Math.round((sum / matches.length) * 10) / 10;
      } else {
        rowTotals[rVal] = 0;
      }
    });

    // Compute Column Totals (average age of all matching column values)
    colValues.forEach((cVal) => {
      const matches = cleanData.filter((d) => String(d[colVar]) === String(cVal));
      if (matches.length > 0) {
        const sum = matches.reduce((acc, curr) => acc + curr.umur, 0);
        colTotals[cVal] = Math.round((sum / matches.length) * 10) / 10;
      } else {
        colTotals[cVal] = 0;
      }
    });

    // Compute Grand Total (average age of all clean data)
    if (cleanData.length > 0) {
      const sum = cleanData.reduce((acc, curr) => acc + curr.umur, 0);
      grandTotal = Math.round((sum / cleanData.length) * 10) / 10;
    }
  }

  // Format Data for Recharts
  const chartData = rowValues.map((rVal) => {
    const item = { name: rVal };
    colValues.forEach((cVal) => {
      item[cVal] = pivotData[rVal]?.[cVal] || 0;
    });
    return item;
  });

  // Handle preset selection
  const applyPreset = (preset) => {
    setRowVar(preset.row);
    setColVar(preset.col);
    setMetric(preset.metric);
  };

  // CSV Export function
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Headers
    const headers = [VARIABLE_LABELS[rowVar], ...colValues, "Total / Rata-rata"];
    csvContent += headers.map((h) => `"${h}"`).join(",") + "\r\n";

    // Rows
    rowValues.forEach((rVal) => {
      const row = [rVal];
      colValues.forEach((cVal) => {
        row.push(pivotData[rVal]?.[cVal] || 0);
      });
      row.push(rowTotals[rVal] || 0);
      csvContent += row.map((v) => `"${v}"`).join(",") + "\r\n";
    });

    // Totals row
    const totalsRow = ["TOTAL / RATA-RATA"];
    colValues.forEach((cVal) => {
      totalsRow.push(colTotals[cVal] || 0);
    });
    totalsRow.push(grandTotal || 0);
    csvContent += totalsRow.map((v) => `"${v}"`).join(",") + "\r\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tabulasi_${rowVar}_vs_${colVar}_${metric}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFinalityBadge = () => {
    switch (activityStatus) {
      case "selesai":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250/50">
            <CheckCircle size={12} className="text-emerald-600" /> Data Final (Selesai)
          </span>
        );
      case "uji_coba":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-250/50">
            <AlertTriangle size={12} className="text-amber-600 animate-pulse" /> Data Simulasi (Uji Coba)
          </span>
        );
      case "published":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-250/50">
            <RefreshCw size={12} className="text-blue-600 animate-spin-slow" /> Data Sementara (Belum Final)
          </span>
        );
    }
  };

  return (
    <AdminLayout
      tab="admin-tabulasi"
      onNavigate={onNavigate}
      selectedProject={selectedProject}
      onProjectChange={onProjectChange}
      activities={activities}
    >
      <div className="p-6 lg:p-8 w-full slide-up relative">
        <style>{`
          .animate-spin-slow {
            animation: spin 6s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Toast Alert for Real-time updates */}
        {showToast && (
          <div
            className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl border border-blue-500/30 max-w-md animate-slide-in"
            style={{ animation: "slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw size={16} className="animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold tracking-wide text-blue-400 uppercase">Pembaruan Real-Time</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Dokumen baru telah disetujui. Tabulasi data diperbarui secara otomatis!
              </p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-slate-400 hover:text-white transition-all bg-transparent border-0 cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Database size={24} className="text-blue-600" />
                Tabulasi Data Kegiatan
              </h1>
              {selectedProject && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                  </span>
                  <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
                </div>
              )}
              <span className="text-xl font-medium text-slate-300 hidden sm:inline">—</span>
              <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                {selectedProject}
              </span>
              {getFinalityBadge()}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Analisis tabel silang (Cross-tabulation) dinamis untuk data hasil pencacahan lapangan yang sudah disetujui.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-600 cursor-pointer shadow-sm hover:shadow transition-all"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Side-by-Side Flex Layout on Desktop (lg and up) */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Panel: Configuration & Presets */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            
            {/* Custom Dropdown Control Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sliders size={16} className="text-blue-600" />
                Pengaturan Pivot
              </h3>

              {/* Rows Selector (Custom Dropdown) */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Baris (Rows)</label>
                <button
                  onClick={() => {
                    setIsRowDropdownOpen(!isRowDropdownOpen);
                    setIsColDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/60 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs transition-all cursor-pointer text-left"
                >
                  <span>{VARIABLE_LABELS[rowVar]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isRowDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isRowDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsRowDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-30 py-1 border border-slate-100 w-full animate-fade"
                      style={{ animation: 'scaleIn 0.15s ease' }}
                    >
                      {[
                        { value: "desa", label: "Desa" },
                        { value: "pendidikan", label: "Pendidikan" },
                        { value: "hubungan", label: "Status Hubungan" },
                        { value: "perkawinan", label: "Status Perkawinan" },
                        { value: "pekerjaan", label: "Status Pekerjaan" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setRowVar(opt.value);
                            setIsRowDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-xs border-0 cursor-pointer transition-all block ${
                            rowVar === opt.value
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "bg-white text-slate-500 hover:bg-slate-50 font-medium"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Columns Selector (Custom Dropdown) */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kolom (Columns)</label>
                <button
                  onClick={() => {
                    setIsColDropdownOpen(!isColDropdownOpen);
                    setIsRowDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/60 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs transition-all cursor-pointer text-left"
                >
                  <span>{VARIABLE_LABELS[colVar]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isColDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isColDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsColDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-30 py-1 border border-slate-100 w-full animate-fade"
                      style={{ animation: 'scaleIn 0.15s ease' }}
                    >
                      {[
                        { value: "gender", label: "Jenis Kelamin" },
                        { value: "pendidikan", label: "Pendidikan" },
                        { value: "perkawinan", label: "Status Perkawinan" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setColVar(opt.value);
                            setIsColDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-xs border-0 cursor-pointer transition-all block ${
                            colVar === opt.value
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "bg-white text-slate-500 hover:bg-slate-50 font-medium"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Metric Selector Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Nilai (Metric)</label>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setMetric("count")}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold border-0 transition-all cursor-pointer ${
                      metric === "count"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-transparent text-slate-400 hover:text-slate-650"
                    }`}
                  >
                    Jumlah
                  </button>
                  <button
                    onClick={() => setMetric("avg_age")}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold border-0 transition-all cursor-pointer ${
                      metric === "avg_age"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-transparent text-slate-400 hover:text-slate-650"
                    }`}
                  >
                    Rata-rata Umur
                  </button>
                </div>
              </div>
            </div>

            {/* Presets Card - Styled with premium border highlight */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Table size={16} className="text-blue-600" />
                Template Tabulasi
              </h3>
              <div className="space-y-3">
                {PRESETS.map((preset, idx) => {
                  const isActive = rowVar === preset.row && colVar === preset.col && metric === preset.metric;
                  return (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block ${
                        isActive
                          ? "bg-blue-50/40 border-blue-500 shadow-sm"
                          : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <h4 className={`text-xs font-bold ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                        {preset.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">{preset.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Pivot Table & Recharts */}
          <div className="flex-1 min-w-0 space-y-6 w-full">
            {/* Live Cross-Tabulation Pivot Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4.5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tabel Silang (Cross-Tabulation)</h3>
                  <p className="text-[11px] text-slate-450 mt-0.5 font-medium">
                    {VARIABLE_LABELS[rowVar]} vs {VARIABLE_LABELS[colVar]} ({METRIC_LABELS[metric]})
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                  <CheckCircle size={10} /> Data Bersih
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-6 py-3.5 text-xs font-bold tracking-wide rounded-tl-none border-b border-slate-800">
                        {VARIABLE_LABELS[rowVar].toUpperCase()}
                      </th>
                      {colValues.map((cVal) => (
                        <th key={cVal} className="px-6 py-3.5 text-xs font-bold text-center tracking-wide border-b border-slate-800">
                          {cVal.toUpperCase()}
                        </th>
                      ))}
                      <th className="px-6 py-3.5 text-xs font-bold text-center tracking-wide border-b border-slate-800">
                        {metric === "count" ? "TOTAL" : "RATA-RATA"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rowValues.map((rVal) => (
                      <tr key={rVal} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800 bg-slate-50/10">
                          {rVal}
                        </td>
                        {colValues.map((cVal) => (
                          <td key={cVal} className="px-6 py-4 text-xs text-center font-medium mono text-slate-650">
                            {pivotData[rVal]?.[cVal] ?? 0}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-xs text-center font-bold bg-slate-50/20 text-slate-800 mono">
                          {rowTotals[rVal] ?? 0}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-200 text-slate-900">
                      <td className="px-6 py-4.5 text-xs uppercase tracking-wide">
                        TOTAL / RATA-RATA
                      </td>
                      {colValues.map((cVal) => (
                        <td key={cVal} className="px-6 py-4.5 text-xs text-center mono">
                          {colTotals[cVal] ?? 0}
                        </td>
                      ))}
                      <td className="px-6 py-4.5 text-xs text-center bg-slate-200/40 text-blue-900 mono">
                        {grandTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Informative Banner */}
              <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex gap-2 text-slate-400 text-[10px] font-medium items-start">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Data kependudukan bersumber dari hasil agregasi formulir Desa Cantik yang telah melalui persetujuan
                  (approved) oleh Administrator di panel Review Data. Umur dihitung berdasarkan input langsung atau
                  rumusan form.
                </p>
              </div>
            </div>

            {/* Recharts Graphical Visualization */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Table size={18} className="text-blue-600" />
                  Visualisasi Distribusi Penduduk
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                  Grafik Teragregasi
                </span>
              </div>

              {/* Chart container - Explicit height to prevent ResponsiveContainer collapses */}
              <div className="w-full h-[320px] min-h-[320px] relative">
                {isChartMounted && (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #f1f5f9",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 12 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {colValues.map((cVal, index) => (
                        <Bar
                          key={cVal}
                          dataKey={cVal}
                          fill={COLORS[index % COLORS.length]}
                          radius={[4, 4, 0, 0]}
                          name={cVal}
                          maxBarSize={48}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
