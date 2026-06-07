import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { Database, Download, Sliders, CheckCircle, RefreshCw, X, Table, Info, ChevronDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../../services/api";

const COLORS = ["#2563eb", "#7c3aed", "#10b981", "#f59e0b", "#e11d48", "#06b6d4"];

export default function AdminTabulasi({
  onNavigate,
  selectedProject,
  onProjectChange,
  activities,
  newDataTrigger,
}) {
  const [rowVar, setRowVar] = useState("desa");
  const [colVar, setColVar] = useState("desa");
  const [metric, setMetric] = useState("count");

  // State to hold data loaded from backend
  const [cleanData, setCleanData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Find selected activity status to show data finality info
  const currentActivity = activities ? activities.find(a => a.name === selectedProject) : null;
  const activityStatus = currentActivity ? currentActivity.status : "draft";

  // Fetch clean tabulation data when activity changes or a real-time sync updates data
  useEffect(() => {
    if (!currentActivity?.id) {
      setCleanData([]);
      setQuestions([]);
      return;
    }

    let isMounted = true;
    const fetchTabulationData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.tabulasi.getData(currentActivity.id);
        if (isMounted) {
          if (res.success) {
            setCleanData(res.cleanData || []);
            setQuestions(res.questions || []);
          } else {
            setError(res.message || "Gagal memuat data tabulasi");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Gagal menghubungi server");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTabulationData();

    return () => {
      isMounted = false;
    };
  }, [currentActivity?.id, newDataTrigger]);

  // Handle toast notification for real-time changes
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

  // Adjust rowVar, colVar and metric selections if current values are invalid with the loaded questions
  useEffect(() => {
    const selectQuestions = questions.filter(q => q.type === "select" || q.type === "radio");
    const numberQuestions = questions.filter(q => q.type === "number");

    const validRowVars = ["desa", "kecamatan", "sls", "sub_sls"];
    const validColVars = ["desa", "kecamatan", "sls", "sub_sls"];
    selectQuestions.forEach(q => {
      validRowVars.push(`q${q.id}_label`);
      validColVars.push(`q${q.id}_label`);
    });

    if (!validRowVars.includes(rowVar)) {
      setRowVar("desa");
    }

    let defaultCol = "desa";
    if (selectQuestions.length > 0) {
      defaultCol = `q${selectQuestions[0].id}_label`;
    } else {
      defaultCol = "kecamatan";
    }

    if (!validColVars.includes(colVar)) {
      setColVar(defaultCol);
    }

    const validMetrics = ["count", ...numberQuestions.map(q => `avg_q${q.id}`)];
    if (!validMetrics.includes(metric)) {
      setMetric("count");
    }
  }, [questions]);

  // Dynamic variable labels mapping helper
  const getVarLabel = (v) => {
    if (v === "desa") return "Desa";
    if (v === "kecamatan") return "Kecamatan";
    if (v === "sls") return "SLS";
    if (v === "sub_sls") return "Sub-SLS";

    if (v.startsWith("q") && v.endsWith("_label")) {
      const qId = parseInt(v.substring(1, v.length - 6), 10);
      const q = questions.find(question => question.id === qId);
      if (q) return q.label;
    }
    return v;
  };

  // Dynamic metric label helper
  const getMetricLabel = (m) => {
    if (m === "count") return "Jumlah Record (Dokumen)";
    if (m.startsWith("avg_q")) {
      const qId = parseInt(m.substring(5), 10);
      const q = questions.find(question => question.id === qId);
      if (q) return `Rata-rata ${q.label}`;
    }
    return m;
  };

  // Filter option questions (for pivot variables) and number questions (for averages)
  const selectQuestions = questions.filter(q => q.type === "select" || q.type === "radio");
  const numberQuestions = questions.filter(q => q.type === "number");

  const rowOptions = [
    { value: "desa", label: "Desa" },
    { value: "kecamatan", label: "Kecamatan" },
    { value: "sls", label: "SLS" },
    { value: "sub_sls", label: "Sub-SLS" },
    ...selectQuestions.map(q => ({ value: `q${q.id}_label`, label: q.label }))
  ];

  const colOptions = [
    { value: "desa", label: "Desa" },
    { value: "kecamatan", label: "Kecamatan" },
    { value: "sls", label: "SLS" },
    { value: "sub_sls", label: "Sub-SLS" },
    ...selectQuestions.map(q => ({ value: `q${q.id}_label`, label: q.label }))
  ];

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

  // Extract unique values for Rows and Columns, applying options sorting if available
  const getUniqueValues = (variable) => {
    const values = [...new Set(cleanData.map((d) => d[variable]))].filter(v => v !== null && v !== undefined && v !== '');
    if (variable.startsWith('q') && variable.endsWith('_label')) {
      const qId = parseInt(variable.substring(1, variable.length - 6), 10);
      const q = questions.find(question => question.id === qId);
      if (q && q.options && Array.isArray(q.options)) {
        const order = q.options.map(opt => opt.label);
        return order.filter((val) => values.includes(val)).concat(values.filter((val) => !order.includes(val)));
      }
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

  // Initialize pivot table grid structure
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
        const val = cleanData.filter(
          (d) => String(d[rowVar]) === String(rVal) && String(d[colVar]) === String(cVal)
        ).length;
        pivotData[rVal][cVal] = val;
        rSum += val;
        colTotals[cVal] = (colTotals[cVal] || 0) + val;
      });
      rowTotals[rVal] = rSum;
      grandTotal += rSum;
    });
  } else if (metric.startsWith("avg_q")) {
    // 2. DYNAMIC AVERAGE METRIC FOR NUMERIC QUESTIONS
    const qIdKey = metric.replace("avg_", ""); // e.g. "q15"
    
    // Compute cell values
    rowValues.forEach((rVal) => {
      colValues.forEach((cVal) => {
        const matches = cleanData.filter(
          (d) => String(d[rowVar]) === String(rVal) && String(d[colVar]) === String(cVal)
        );
        const validValues = matches.map(d => Number(d[qIdKey])).filter(v => !isNaN(v));
        if (validValues.length > 0) {
          const sum = validValues.reduce((acc, curr) => acc + curr, 0);
          pivotData[rVal][cVal] = Math.round((sum / validValues.length) * 10) / 10;
        } else {
          pivotData[rVal][cVal] = 0;
        }
      });
    });

    // Compute Row Totals (average for all matching row values)
    rowValues.forEach((rVal) => {
      const matches = cleanData.filter((d) => String(d[rowVar]) === String(rVal));
      const validValues = matches.map(d => Number(d[qIdKey])).filter(v => !isNaN(v));
      if (validValues.length > 0) {
        const sum = validValues.reduce((acc, curr) => acc + curr, 0);
        rowTotals[rVal] = Math.round((sum / validValues.length) * 10) / 10;
      } else {
        rowTotals[rVal] = 0;
      }
    });

    // Compute Column Totals (average for all matching col values)
    colValues.forEach((cVal) => {
      const matches = cleanData.filter((d) => String(d[colVar]) === String(cVal));
      const validValues = matches.map(d => Number(d[qIdKey])).filter(v => !isNaN(v));
      if (validValues.length > 0) {
        const sum = validValues.reduce((acc, curr) => acc + curr, 0);
        colTotals[cVal] = Math.round((sum / validValues.length) * 10) / 10;
      } else {
        colTotals[cVal] = 0;
      }
    });

    // Compute Grand Total (average for all cleanData records)
    const validValues = cleanData.map(d => Number(d[qIdKey])).filter(v => !isNaN(v));
    if (validValues.length > 0) {
      const sum = validValues.reduce((acc, curr) => acc + curr, 0);
      grandTotal = Math.round((sum / validValues.length) * 10) / 10;
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

  // Dynamic presets based on the loaded questions schema
  const getDynamicPresets = () => {
    const presets = [];
    if (selectQuestions.length > 0) {
      presets.push({
        name: `Distribusi per ${selectQuestions[0].label}`,
        row: "desa",
        col: `q${selectQuestions[0].id}_label`,
        metric: "count",
        desc: `Jumlah record berdasarkan wilayah Desa dan ${selectQuestions[0].label}.`
      });
    } else {
      presets.push({
        name: "Laporan Wilayah Desa",
        row: "desa",
        col: "kecamatan",
        metric: "count",
        desc: "Jumlah records berdasarkan Kecamatan dan Desa."
      });
    }

    if (selectQuestions.length > 1) {
      presets.push({
        name: `${selectQuestions[0].label} & ${selectQuestions[1].label}`,
        row: `q${selectQuestions[0].id}_label`,
        col: `q${selectQuestions[1].id}_label`,
        metric: "count",
        desc: `Analisis silang antara ${selectQuestions[0].label} dengan ${selectQuestions[1].label}.`
      });
    }

    if (numberQuestions.length > 0 && selectQuestions.length > 0) {
      presets.push({
        name: `Rata-rata ${numberQuestions[0].label}`,
        row: "desa",
        col: `q${selectQuestions[0].id}_label`,
        metric: `avg_q${numberQuestions[0].id}`,
        desc: `Rata-rata ${numberQuestions[0].label} berdasarkan Desa dan ${selectQuestions[0].label}.`
      });
    }

    return presets;
  };

  const dynamicPresets = getDynamicPresets();

  const applyPreset = (preset) => {
    setRowVar(preset.row);
    setColVar(preset.col);
    setMetric(preset.metric);
  };

  // CSV Export function
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Headers
    const headers = [getVarLabel(rowVar), ...colValues, metric === "count" ? "Total" : "Rata-rata"];
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 border-solid">
            <CheckCircle size={12} className="text-emerald-600" /> Data Final (Selesai)
          </span>
        );
      case "uji_coba":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50 border-solid">
            <AlertTriangle size={12} className="text-amber-600 animate-pulse" /> Data Simulasi (Uji Coba)
          </span>
        );
      case "published":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/50 border-solid">
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
            className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl border border-solid border-blue-500/30 max-w-md animate-slide-in"
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 pb-5 border-b border-solid border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Database size={24} className="text-blue-600" />
                Tabulasi Data Kegiatan
              </h1>
              {selectedProject && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 border border-solid rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
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
              disabled={loading || error || cleanData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white border border-solid border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-600 cursor-pointer shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Display Panels */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-solid border-slate-100 shadow-sm p-8">
            <RefreshCw size={40} className="text-blue-600 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600">Memuat data tabulasi dari server...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-solid border-red-100 shadow-sm p-8 text-center">
            <AlertTriangle size={40} className="text-red-500 mb-4 animate-bounce" />
            <p className="text-sm font-semibold text-slate-800">Gagal Memuat Data</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        ) : cleanData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-solid border-slate-100 shadow-sm p-8 text-center">
            <Database size={40} className="text-slate-300 mb-4" />
            <p className="text-sm font-semibold text-slate-700">Tidak Ada Data Bersih</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Belum ada kuesioner yang disetujui (approved) untuk kegiatan "{selectedProject}". Data tabulasi hanya menghitung kuesioner dengan status "approved".
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
            {/* Left Panel: Configuration & Presets */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
              
              {/* Custom Dropdown Control Card */}
              <div className="bg-white rounded-xl p-6 border border-solid border-slate-100 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-solid border-slate-100">
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
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/60 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-solid border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs transition-all cursor-pointer text-left"
                  >
                    <span>{getVarLabel(rowVar)}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isRowDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isRowDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsRowDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-30 py-1 border border-solid border-slate-100 w-full animate-fade max-h-60 overflow-y-auto"
                        style={{ animation: 'scaleIn 0.15s ease' }}
                      >
                        {rowOptions.map((opt) => (
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
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/60 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-solid border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs transition-all cursor-pointer text-left"
                  >
                    <span>{getVarLabel(colVar)}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isColDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isColDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsColDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-30 py-1 border border-solid border-slate-100 w-full animate-fade max-h-60 overflow-y-auto"
                        style={{ animation: 'scaleIn 0.15s ease' }}
                      >
                        {colOptions.map((opt) => (
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
                  <div className="flex flex-col gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-solid border-slate-200">
                    <button
                      onClick={() => setMetric("count")}
                      className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold border-0 transition-all cursor-pointer text-left ${
                        metric === "count"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Jumlah Dokumen
                    </button>
                    {numberQuestions.map(q => (
                      <button
                        key={q.id}
                        onClick={() => setMetric(`avg_q${q.id}`)}
                        className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold border-0 transition-all cursor-pointer text-left ${
                          metric === `avg_q${q.id}`
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Rata-rata {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Presets Card - Styled with premium border highlight */}
              {dynamicPresets.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-solid border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-solid border-slate-100">
                    <Table size={16} className="text-blue-600" />
                    Template Tabulasi
                  </h3>
                  <div className="space-y-3">
                    {dynamicPresets.map((preset, idx) => {
                      const isActive = rowVar === preset.row && colVar === preset.col && metric === preset.metric;
                      return (
                        <button
                          key={idx}
                          onClick={() => applyPreset(preset)}
                          className={`w-full text-left p-3.5 rounded-xl border border-solid transition-all cursor-pointer block ${
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
              )}
            </div>

            {/* Right Panel: Pivot Table & Recharts */}
            <div className="flex-1 min-w-0 space-y-6 w-full">
              {/* Live Cross-Tabulation Pivot Table */}
              <div className="bg-white rounded-xl border border-solid border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4.5 border-b border-solid border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tabel Silang (Cross-Tabulation)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      {getVarLabel(rowVar)} vs {getVarLabel(colVar)} ({getMetricLabel(metric)})
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                    <CheckCircle size={10} /> Data Bersih (Approved)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white border-none">
                        <th className="px-6 py-3.5 text-xs font-bold tracking-wide rounded-tl-none border-b border-solid border-slate-800">
                          {getVarLabel(rowVar).toUpperCase()}
                        </th>
                        {colValues.map((cVal) => (
                          <th key={cVal} className="px-6 py-3.5 text-xs font-bold text-center tracking-wide border-b border-solid border-slate-800">
                            {cVal.toUpperCase()}
                          </th>
                        ))}
                        <th className="px-6 py-3.5 text-xs font-bold text-center tracking-wide border-b border-solid border-slate-800">
                          {metric === "count" ? "TOTAL" : "RATA-RATA"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solid divide-slate-100 text-slate-700">
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
                      <tr className="bg-slate-100/50 font-bold border-t-2 border-solid border-slate-200 text-slate-900">
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
                <div className="p-4.5 bg-slate-50 border-t border-solid border-slate-100 flex gap-2 text-slate-400 text-[10px] font-medium items-start">
                  <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Data kependudukan bersumber dari hasil agregasi formulir Desa Cantik yang telah melalui persetujuan
                    (approved) oleh Administrator di panel Review Data. Umur dihitung berdasarkan input langsung atau
                    rumusan form.
                  </p>
                </div>
              </div>

              {/* Recharts Graphical Visualization */}
              <div className="bg-white rounded-xl p-6 border border-solid border-slate-100 shadow-sm">
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
        )}
      </div>
    </AdminLayout>
  );
}
