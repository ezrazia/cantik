const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'admin', 'AdminDataReview.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace handleSimulateSelectFile and handleImportPrelist
const replaceFunctions = `
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          const cols = Object.keys(data[0]);
          setDetectedColumns(cols);
          setParsedExcelData(data);
          
          const kkCol = cols.find(c => c.toLowerCase().includes('kk') || c.toLowerCase().includes('keluarga'));
          if (kkCol) setGroupingColumn(kkCol);
          
          setUploadedFile({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            rowCount: data.length
          });
          setMappingStep(2);
        } else {
          alert("File kosong.");
        }
      } catch (err) {
        alert("Gagal membaca file Excel.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportPrelist = async () => {
    setIsUploading(true);
    try {
      const grouped = {};
      parsedExcelData.forEach(row => {
        const key = row[groupingColumn] || 'UNGROUPED';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });

      const payloadDocuments = [];

      Object.values(grouped).forEach(groupRows => {
        const docAnswers = [];
        let krt = "", desa = "", sls = "", subSls = "", kecamatan = "";

        questions.forEach(q => {
           const mappedCol = Object.keys(columnMapping).find(col => columnMapping[col] === q.id);
           
           if (mappedCol) {
             const lowerLabel = (q.label || "").toLowerCase();
             let valToSave;

             if (mappedCol === '__AUTO_COUNT__') {
               valToSave = groupRows.length.toString();
             } else {
               let isLoop = false;
               if (q.validation) {
                 try {
                   const parsed = JSON.parse(q.validation);
                   if (parsed.is_loop) isLoop = true;
                   if (q.parent_id || q.parentId) {
                     const parent = questions.find(p => p.id === (q.parent_id || q.parentId));
                     if (parent && parent.validation) {
                       const pParsed = JSON.parse(parent.validation);
                       if (pParsed.is_loop) isLoop = true;
                     }
                   }
                 } catch(e){}
               }

               if (isLoop) {
                 const vals = groupRows.map(r => String(r[mappedCol] || ""));
                 valToSave = JSON.stringify(vals);
               } else {
                 valToSave = String(groupRows[0][mappedCol] || "");
               }
             }

             if (lowerLabel.includes("kecamatan")) kecamatan = valToSave;
             if (lowerLabel.includes("desa") || lowerLabel.includes("kelurahan")) desa = valToSave;
             if (lowerLabel.includes("sls") || lowerLabel.match(/\\brt\\b/)) sls = valToSave;
             if (lowerLabel.includes("sub sls") || lowerLabel.includes("sub-sls") || lowerLabel.match(/\\brw\\b/)) subSls = valToSave;
             if (lowerLabel.includes("kepala") || lowerLabel.includes("krt") || lowerLabel.includes("nama kepala")) krt = valToSave;

             docAnswers.push({
               question_id: q.id,
               question_label: q.label,
               value: valToSave
             });
           }
        });

        payloadDocuments.push({
          kecamatan, desa, sls, sub_sls: subSls, krt,
          answers: docAnswers
        });
      });

      const res = await api.post('/dokumen/batch-prelist', {
        kegiatan_id: activeActivity?.id,
        documents: payloadDocuments
      });

      if (res.success) {
        setIsSuccess(true);
        fetchData();
      } else {
        alert(res.message);
      }
    } catch(err) {
      alert("Gagal import prelist.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };
`;

// Extract everything up to handleSimulateSelectFile
const regexRemoveOldFunctions = /const handleSimulateSelectFile = \(\) => \{[\s\S]*?const handleImportPrelist = \(\) => \{[\s\S]*?\}, 1200\);\r?\n\s*\};/m;
content = content.replace(regexRemoveOldFunctions, replaceFunctions);

// 2. Replace the Modal UI body
const newModalUI = `
            {isSuccess ? (
              <div className="py-8 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check size={36}/>
                </div>
                <h4 className="text-md font-bold text-slate-800 mb-1">Data Berhasil Diimpor!</h4>
                <p className="text-xs text-slate-400">Target Prelist keluarga telah ditambahkan ke sistem.</p>
              </div>
            ) : mappingStep === 1 ? (
              <>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Butuh template kolom file?</p>
                      <p className="text-[10px] text-slate-400">Gunakan format template standar agar data terbaca otomatis</p>
                    </div>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Upload size={12} className="rotate-180"/>
                      Unduh Template
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">File Prelist (Excel / CSV)</label>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls,.csv" className="hidden" />
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={\`border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center \${isUploading ? 'opacity-70 pointer-events-none' : ''}\`}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-3"/>
                          <p className="text-xs font-medium text-slate-500">Membaca dan memvalidasi file...</p>
                        </>
                      ) : (
                        <>
                          <Upload size={28} className="text-slate-300 mb-2.5" />
                          <p className="text-xs font-semibold text-slate-700 mb-1">
                            Klik untuk pilih file prelist keluarga
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Mendukung format xlsx/csv untuk semua desa sekaligus
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    disabled={isUploading}
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadedFile(null);
                      setDetectedColumns([]);
                      setPreviewRows([]);
                    }}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 cursor-pointer transition-all border-0 disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </>
            ) : mappingStep === 2 ? (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <FileText size={18}/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{uploadedFile?.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Terdeteksi {uploadedFile?.rowCount} baris data</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <label className="block text-xs font-bold text-blue-900 mb-1">Pilih Kolom Master Pengelompokan (Grouping Key)</label>
                  <p className="text-[10px] text-blue-600 mb-3">Kolom ini digunakan untuk menggabungkan baris yang memiliki nilai yang sama menjadi 1 Dokumen Keluarga (Misal: No KK). Jika Anda hanya mendaftar 1 baris per dokumen, pilih ID unik.</p>
                  <select 
                    value={groupingColumn} 
                    onChange={e => setGroupingColumn(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-blue-200 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Kolom Excel...</option>
                    {detectedColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 mt-2">Pemetaan Kolom Excel ke Kuesioner</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {[...detectedColumns, '__AUTO_COUNT__'].map(col => {
                      const isAutoCount = col === '__AUTO_COUNT__';
                      return (
                      <div key={col} className="flex flex-col md:flex-row md:items-center gap-2 p-2 border-b border-slate-100 last:border-0">
                        <div className="w-full md:w-1/3">
                          <span className={\`text-[11px] font-semibold \${isAutoCount ? 'text-emerald-600' : 'text-slate-700'}\`}>
                            {isAutoCount ? '[Otomatis: Jumlah Baris]' : col}
                          </span>
                        </div>
                        <div className="w-full md:w-2/3">
                          <select 
                            value={columnMapping[col] || ""}
                            onChange={e => setColumnMapping({...columnMapping, [col]: e.target.value})}
                            className="w-full text-[10px] p-2 rounded-lg border border-slate-200 bg-slate-50 outline-none focus:border-blue-500"
                          >
                            <option value="">Tidak Dipetakan (Abaikan)</option>
                            {questions.map(q => (
                              <option key={q.id} value={q.id}>{q.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button onClick={() => setMappingStep(1)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all border-0">
                    Kembali
                  </button>
                  <button 
                    disabled={!groupingColumn || isUploading}
                    onClick={handleImportPrelist}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    {isUploading ? "Memproses..." : "Impor Data Prelist"}
                  </button>
                </div>
              </div>
            )}
`;

const regexReplaceModalBody = /\{isSuccess \? \([\s\S]*?\n\s*\)\}/m;
content = content.replace(regexReplaceModalBody, newModalUI);

fs.writeFileSync(file, content, 'utf8');
console.log("AdminDataReview.jsx successfully patched!");
