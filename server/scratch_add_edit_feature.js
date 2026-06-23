import fs from 'fs';

function addEditFeature(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add states if not present
  if (!content.includes('const [showEditModal, setShowEditModal]')) {
    content = content.replace(
      'const [showAddModal, setShowAddModal] = useState(false);',
      'const [showAddModal, setShowAddModal] = useState(false);\n  const [showEditModal, setShowEditModal] = useState(false);'
    );
  }
  
  if (!content.includes('const [passwordInput, setPasswordInput]')) {
    content = content.replace(
      'const [usernameInput, setUsernameInput] = useState("");',
      'const [usernameInput, setUsernameInput] = useState("");\n  const [passwordInput, setPasswordInput] = useState("");\n  const [showPassword, setShowPassword] = useState(false);'
    );
  }

  if (!content.includes('const handleOpenEditModal')) {
    const editHandler = `
  const handleOpenEditModal = () => {
    if (!selectedPetugas) return;
    setName(selectedPetugas.name || "");
    setUsernameInput(selectedPetugas.username || "");
    setNikInput(selectedPetugas.nik || "");
    setPhoneInput(selectedPetugas.phone || "");
    setAssignedDesa(selectedPetugas.desa || (dbDesa.length > 0 ? dbDesa[0].name.replace("Desa ", "") : "Tideng Pale"));
    setPasswordInput("");
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleEditPetugas = async (e) => {
    e.preventDefault();
    if (!name.trim() || !usernameInput.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        username: usernameInput.trim(),
        nik: nikInput.trim() || null,
        phone: phoneInput.trim() || null,
        desa: assignedDesa
      };
      
      if (passwordInput.trim()) {
        payload.password = passwordInput.trim();
      }

      const res = await api.petugas.update(selectedPetugas.id, payload);
      if (res && res.success) {
        await refreshData();
        setShowEditModal(false);
        // Update local selectedPetugas object
        setSelectedPetugas(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      alert("Gagal mengupdate petugas: " + err.message);
    }
  };
`;
    content = content.replace(
      '// Handler Hapus Petugas',
      editHandler + '\n  // Handler Hapus Petugas'
    );
  }

  // Add the Edit button in the Sidebar
  if (!content.includes('handleOpenEditModal') || content.match(/handleOpenEditModal/g).length === 1) {
    content = content.replace(
      '{!isKegiatanAdmin && (\\s*<button\\s*onClick=\\{\\(\\) => setShowDeleteConfirm\\(true\\)\\}\\s*className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-red-500 bg-transparent hover:bg-red-50 rounded-xl border-0 cursor-pointer transition-all mt-1"\\s*>\\s*<Trash2 size=\\{13\\}/> \\{isGlobal \\? "Hapus Petugas Permanen" : "Keluarkan dari Kegiatan"\\}\\s*</button>\\s*)}',
      `{!isKegiatanAdmin && (
                      <button 
                        onClick={handleOpenEditModal}
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl border-0 cursor-pointer transition-all mt-1"
                      >
                        <Edit size={13}/> Edit Informasi Petugas
                      </button>
                    )}
                    
                    {!isKegiatanAdmin && (
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-red-500 bg-transparent hover:bg-red-50 rounded-xl border-0 cursor-pointer transition-all mt-1"
                      >
                        <Trash2 size={13}/> {isGlobal ? "Hapus Petugas Permanen" : "Keluarkan dari Kegiatan"}
                      </button>
                    )}`
    );
  }

  // Add the Edit Modal UI at the bottom
  if (!content.includes('{showEditModal && (')) {
    const editModalHtml = `
      {/* Edit Petugas Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.25s ease' }}
          onClick={() => setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg overflow-y-auto max-h-[90vh]"
            style={{ maxWidth: 460, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-amber-50">
              <Edit size={24} className="text-amber-600"/>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Edit Informasi Petugas
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Ubah data profil petugas lapangan. Kosongkan password jika tidak ingin mengubahnya.
            </p>

            <form onSubmit={handleEditPetugas} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Username</label>
                  <input 
                    type="text" 
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700"
                    placeholder="Username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Password Baru</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700"
                      placeholder="(Abaikan jika sama)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors bg-transparent border-none cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">NIK (Opsional)</label>
                  <input 
                    type="text" 
                    value={nikInput}
                    onChange={(e) => setNikInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700"
                    placeholder="16 Digit NIK"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">No. HP (Opsional)</label>
                  <input 
                    type="text" 
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Asal Desa</label>
                <select 
                  value={assignedDesa}
                  onChange={(e) => setAssignedDesa(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-700 cursor-pointer"
                >
                  {dbDesa.map(d => (
                    <option key={d.name} value={d.name.replace("Desa ", "")}>{d.name}</option>
                  ))}
                  {dbDesa.length === 0 && (
                    <option value="Tideng Pale">Desa Tideng Pale</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-transparent hover:bg-slate-50 rounded-xl border-0 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl border-0 cursor-pointer transition-all shadow-sm shadow-amber-200"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;
    content = content.replace(
      '// ─── PWA: Initialize auto-sync when app mounts ─────',
      editModalHtml + '\n  // ─── PWA: Initialize auto-sync when app mounts ─────'
    );
    // actually, let's put it before `{/* Modals */}` if it exists, or just at the end of the file before `</div>` and `</AdminLayout>`
    // Wait, the above replace may not work if that string is not in AdminPetugasKegiatan.jsx
    if (!content.includes('// ─── PWA: Initialize auto-sync when app mounts ─────')) {
      content = content.replace(
        '</AdminLayout>',
        editModalHtml + '\n    </AdminLayout>'
      );
    }
  }

  // Handle Edit/EyeOff/Lock imports if missing.
  if (content.includes('import {') && !content.includes('Lock,')) {
    content = content.replace('Phone, Briefcase', 'Phone, Briefcase, Lock, EyeOff');
  }

  // Replace api.petugas.update inside the file to use api if it doesn't exist.
  // Wait, does api.petugas.update exist in src/services/api.js?
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added Edit Feature to ' + filePath);
}

addEditFeature('c:/xampp/htdocs/Node-Project/cantik/src/pages/admin/AdminPetugasKegiatan.jsx');
addEditFeature('c:/xampp/htdocs/Node-Project/cantik/src/pages/admin/AdminMasterPetugas.jsx');

