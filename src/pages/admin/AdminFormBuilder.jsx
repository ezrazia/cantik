import AdminLayout from "../../components/layouts/AdminLayout";
import { api } from "../../services/api";
import { useState, useEffect, useRef } from "react";
import { 
  Hash, Eye, Save, Settings, Plus, ChevronDown, List, Type, 
  Trash2, Upload, Database, FileText, X, Check, GripVertical, 
  CornerDownRight, Edit3, Trash, AlertTriangle, ArrowRight, MapPin, Variable,
  StickyNote, Bold, Italic
} from "lucide-react";

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

function getRoman(num) {
  return ROMAN_NUMERALS[num - 1] || num.toString();
}

/**
 * Helper to compute the dynamic question numbering (e.g. 301, 301A)
 */
function getQuestionCode(q, allQuestions, allBlocks) {
  if (!q) return "";
  // Notes do NOT count in the R-numbering
  if (q.type === 'note') return "";
  const blockIdx = allBlocks.findIndex(b => b.id === q.blokId) + 1;
  if (blockIdx === 0) return "";
  
  if (q.parentId) {
    const parent = allQuestions.find(p => p.id === q.parentId);
    if (!parent) return "";
    const parentCode = getQuestionCode(parent, allQuestions, allBlocks);
    
    // Sibling sub-questions of same parent
    const siblings = allQuestions.filter(s => s.blokId === q.blokId && s.parentId === q.parentId);
    const sibIdx = siblings.findIndex(s => s.id === q.id);
    const letter = String.fromCharCode(65 + (sibIdx >= 0 ? sibIdx : 0)); // A, B, C...
    return `${parentCode}${letter}`;
  } else {
    // Index among main non-note questions of the block
    const mainQs = allQuestions.filter(s => s.blokId === q.blokId && !s.parentId && s.type !== 'note');
    const qIdx = mainQs.findIndex(s => s.id === q.id) + 1;
    const padded = qIdx.toString().padStart(2, '0');
    return `${blockIdx}${padded}`;
  }
}

/**
 * Returns block questions ordered (parent followed by children)
 */
function getOrderedQuestionsInBlock(blockId, allQuestions) {
  const blockQs = allQuestions.filter(q => q.blokId === blockId);
  const mainQs = blockQs.filter(q => !q.parentId);
  
  const ordered = [];
  mainQs.forEach(parent => {
    ordered.push(parent);
    const children = blockQs.filter(q => q.parentId === parent.id);
    ordered.push(...children);
  });
  return ordered;
}

/**
 * Renders note text supporting **bold** and *italic* markdown.
 * @param {string} text
 * @returns React nodes
 */
function renderNoteText(text) {
  if (!text) return null;
  // Process **bold** first, then *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Wraps the currently selected text in a textarea with before/after markers.
 * @param {string} textareaId
 * @param {string} before e.g. '**'
 * @param {string} after e.g. '**'
 * @param {string} currentValue current textarea value
 * @param {function} setter state setter
 */
function applyNoteFormat(textareaId, before, after, currentValue, setter) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = currentValue.slice(start, end) || 'teks';
  const newValue = currentValue.slice(0, start) + before + selected + after + currentValue.slice(end);
  setter(newValue);
  setTimeout(() => {
    ta.focus();
    ta.setSelectionRange(start + before.length, start + before.length + selected.length);
  }, 30);
}

/**
 * Renders a label string, highlighting $R{code} tokens as amber variable chips.
 */
function renderLabelWithVars(label) {
  if (!label || !label.includes('$R')) return label;
  const parts = label.split(/(\$R[A-Za-z0-9]+)/g);
  return parts.map((part, i) => {
    if (/^\$R[A-Za-z0-9]+$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded mx-0.5 align-middle"
          title={`Variabel: merujuk ke jawaban ${part.slice(1)}`}
        >
          <Variable size={8}/> {part.slice(1)}
        </span>
      );
    }
    return part;
  });
}

function AdminFormBuilder({ onNavigate, selectedProject, onProjectChange, activities }) {
  // Main Project Data Map
  const [projectData, setProjectData] = useState({});

  const [activeBlok, setActiveBlok] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({ label: "", type: "text", req: true });

  // Dynamic Block Creator States
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [isConfirmAddBlockOpen, setIsConfirmAddBlockOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editingBlockTitle, setEditingBlockTitle] = useState("");

  // Subquestion addition state
  const [addingSubParent, setAddingSubParent] = useState(null);
  const [newSubLabel, setNewSubLabel] = useState("");

  // Skip Logic relation arrows
  const [arrows, setArrows] = useState([]);
  const listContainerRef = useRef(null);

  // States for Questionnaire Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);

  // Check activity status to decide if builder is editable
  const activeActivity = activities?.find(a => a.name === selectedProject);
  const status = activeActivity ? activeActivity.status : "draft";

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
  const isDraft = activeActivity ? activeActivity.status === "draft" : false;
  const canEdit = selectedProject && isDraft;

  // Fetch structure from backend API
  const fetchFormStructure = async () => {
    if (!selectedProject || !activeActivity) return;
    try {
      const res = await api.form.getStructure(activeActivity.id);
      if (res && res.success) {
        const mappedBlocks = res.blocks.map(b => ({
          id: b.kode,
          dbId: b.id,
          title: b.title,
          sort_order: b.sort_order
        }));

        const mappedQuestions = res.questions.map(q => {
          const correspondingBlock = res.blocks.find(b => b.id === q.blok_id);
          return {
            id: q.id,
            label: q.label,
            type: q.type,
            req: !!q.required,
            val: q.validation,
            skip: q.skip_logic,
            blokId: correspondingBlock ? correspondingBlock.kode : "",
            parentId: q.parent_id,
            skipTarget: q.skip_target,
            options: q.options,
            sort_order: q.sort_order
          };
        });

        setProjectData(prev => ({
          ...prev,
          [selectedProject]: {
            blocks: mappedBlocks,
            questions: mappedQuestions
          }
        }));

        // Set default active block if none is set
        if (mappedBlocks.length > 0 && !activeBlok) {
          setActiveBlok(mappedBlocks[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil struktur kuesioner:", err);
    }
  };

  useEffect(() => {
    fetchFormStructure();
  }, [selectedProject, activeActivity]);

  // Read active data
  const currentProjectData = projectData[selectedProject] || {
    blocks: [],
    questions: []
  };

  const blocks = currentProjectData.blocks;
  const questions = currentProjectData.questions;

  // Keep active block valid if current list changes
  useEffect(() => {
    if (blocks.length > 0 && !blocks.some(b => b.id === activeBlok)) {
      setActiveBlok(blocks[0].id);
    }
  }, [blocks, activeBlok]);

  const selected = questions.find(q => q.id === selectedId);

  // Auto layout logic for relationship arrows (Skip Logic paths)
  const updateArrows = () => {
    const container = listContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    
    const newArrows = [];
    const blockQs = getOrderedQuestionsInBlock(activeBlok, questions);
    
    blockQs.forEach(q => {
      if (q.skipTarget) {
        const sourceEl = document.getElementById(`q-card-${q.id}`);
        const targetEl = document.getElementById(`q-card-${q.skipTarget}`);
        
        if (sourceEl && targetEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          
          const startX = sourceRect.right - containerRect.left;
          const startY = (sourceRect.top + sourceRect.bottom) / 2 - containerRect.top;
          
          const endX = targetRect.right - containerRect.left;
          const endY = (targetRect.top + targetRect.bottom) / 2 - containerRect.top;
          
          newArrows.push({ startX, startY, endX, endY, qCode: getQuestionCode(q, questions, blocks) });
        }
      }
    });
    setArrows(newArrows);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [questions, activeBlok, blocks]);

  const typeIcon = { text: Type, number: Hash, radio: List, select: ChevronDown, location: MapPin, note: StickyNote };

  // Add block logic
  const handleConfirmAddBlock = async () => {
    if (!newBlockTitle.trim() || !activeActivity) return;
    try {
      const activeIdx = blocks.findIndex(b => b.id === activeBlok);
      const nextSortOrder = activeIdx !== -1 ? (blocks[activeIdx].sort_order || 0) + 1 : blocks.length;
      const nextRoman = getRoman(blocks.length + 1);
      
      await api.form.createBlock({
        kegiatan_id: activeActivity.id,
        kode: `Blok ${nextRoman}`,
        title: newBlockTitle.trim(),
        sort_order: nextSortOrder
      });

      await fetchFormStructure();
      setActiveBlok(`Blok ${nextRoman}`);
      setNewBlockTitle("");
      setShowAddBlock(false);
      setIsConfirmAddBlockOpen(false);
    } catch (err) {
      alert("Gagal menambahkan blok: " + err.message);
    }
  };

  // Delete block logic
  const handleDeleteBlock = async (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    try {
      await api.form.deleteBlock(block.dbId);
      await fetchFormStructure();
      setBlockToDelete(null);
    } catch (err) {
      alert("Gagal menghapus blok: " + err.message);
    }
  };

  const handleStartEditBlock = (b, e) => {
    e.stopPropagation();
    setEditingBlockId(b.id);
    setEditingBlockTitle(b.title);
  };

  const handleSaveEditBlock = async (e) => {
    e.stopPropagation();
    if (!editingBlockTitle.trim()) return;
    const block = blocks.find(b => b.id === editingBlockId);
    if (!block) return;
    try {
      await api.form.updateBlock(block.dbId, {
        kode: block.id,
        title: editingBlockTitle.trim(),
        sort_order: block.sort_order
      });
      await fetchFormStructure();
      setEditingBlockId(null);
    } catch (err) {
      alert("Gagal mengupdate blok: " + err.message);
    }
  };

  // Add question
  const addQ = async () => {
    if (!newQ.label || !activeActivity) return;
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      const blockQs = questions.filter(q => q.blokId === activeBlok);
      const sortOrder = blockQs.length;

      const res = await api.form.createQuestion({
        blok_id: activeBlockObj.dbId,
        label: newQ.label,
        type: newQ.type,
        required: newQ.req,
        sort_order: sortOrder
      });

      await fetchFormStructure();
      setNewQ({ label: "", type: "text", req: true });
      setShowAdd(false);
      if (res && res.success) {
        setSelectedId(res.question.id);
      }
    } catch (err) {
      alert("Gagal menambahkan pertanyaan: " + err.message);
    }
  };

  /** Add a note (catatan) to the current block */
  const handleAddNote = async () => {
    if (!activeActivity) return;
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;
    try {
      const blockQs = questions.filter(q => q.blokId === activeBlok);
      // Insert after selected item, or at end
      const selectedIdx = selectedId ? blockQs.findIndex(q => q.id === selectedId) : -1;
      const sortOrder = selectedIdx >= 0 ? blockQs[selectedIdx].sort_order + 0.5 : blockQs.length;
      const res = await api.form.createQuestion({
        blok_id: activeBlockObj.dbId,
        label: 'Catatan baru...',
        type: 'note',
        required: false,
        sort_order: sortOrder
      });
      await fetchFormStructure();
      if (res && res.success) {
        setSelectedId(res.question.id);
      }
    } catch (err) {
      alert('Gagal menambahkan catatan: ' + err.message);
    }
  };

  // Add sub-question
  const handleAddSubQuestion = async () => {
    if (!newSubLabel.trim() || !addingSubParent) return;
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      const subQs = questions.filter(q => q.parentId === addingSubParent.id);
      const sortOrder = subQs.length;

      const res = await api.form.createQuestion({
        blok_id: activeBlockObj.dbId,
        parent_id: addingSubParent.id,
        label: newSubLabel.trim(),
        type: "text",
        required: true,
        sort_order: sortOrder
      });

      await fetchFormStructure();
      setNewSubLabel("");
      setAddingSubParent(null);
      if (res && res.success) {
        setSelectedId(res.question.id);
      }
    } catch (err) {
      alert("Gagal menambahkan sub-pertanyaan: " + err.message);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id) => {
    try {
      await api.form.deleteQuestion(id);
      await fetchFormStructure();
      setSelectedId(null);
    } catch (err) {
      alert("Gagal menghapus pertanyaan: " + err.message);
    }
  };

  // Edit question properties
  const handleUpdateQuestion = async (key, value) => {
    // Update locally first for smooth inputs
    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const updated = current.questions.map(q => q.id === selectedId ? { ...q, [key]: value } : q);
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          questions: updated
        }
      };
    });

    const questionObj = questions.find(q => q.id === selectedId);
    if (!questionObj) return;
    
    const blockObj = blocks.find(b => b.id === questionObj.blokId);
    if (!blockObj) return;

    const dbPayload = {
      blok_id: blockObj.dbId,
      parent_id: questionObj.parentId,
      label: key === 'label' ? value : questionObj.label,
      type: key === 'type' ? value : questionObj.type,
      required: key === 'req' ? value : questionObj.req,
      options: key === 'options' ? value : questionObj.options,
      validation: key === 'val' ? value : questionObj.val,
      skip_logic: key === 'skip' ? value : questionObj.skip,
      skip_target: key === 'skipTarget' ? value : questionObj.skipTarget,
      sort_order: questionObj.sort_order
    };

    try {
      await api.form.updateQuestion(selectedId, dbPayload);
      fetchFormStructure();
    } catch (err) {
      console.error("Gagal mengupdate pertanyaan:", err);
    }
  };

  const handleAddOption = (q, options) => {
    const nextIndex = options.length;
    const nextValue = q.type === 'select' 
      ? String.fromCharCode(97 + nextIndex) // a, b, c...
      : String(nextIndex + 1); // 1, 2, 3...
    const newOptions = [...options, { value: nextValue, label: `Pilihan ${nextIndex + 1}` }];
    handleUpdateQuestion("options", newOptions);
  };

  const handleUpdateOptionLabel = (options, idx, label) => {
    const newOptions = options.map((opt, i) => i === idx ? { ...opt, label } : opt);
    handleUpdateQuestion("options", newOptions);
  };

  const handleDeleteOption = (q, options, idx) => {
    const newOptions = options.filter((_, i) => i !== idx).map((opt, i) => {
      const newValue = q.type === 'select'
        ? String.fromCharCode(97 + i)
        : String(i + 1);
      return { ...opt, value: newValue };
    });
    handleUpdateQuestion("options", newOptions);
  };

  // Drag and drop sorting handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIdx) => {
    const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (sourceIdx === targetIdx) return;
    
    const blockQs = questions.filter(q => q.blokId === activeBlok);
    const mainQs = blockQs.filter(q => !q.parentId);
    
    const updatedMainQs = [...mainQs];
    const [dragged] = updatedMainQs.splice(sourceIdx, 1);
    updatedMainQs.splice(targetIdx, 0, dragged);
    
    const reconstructedBlockQs = [];
    updatedMainQs.forEach(parent => {
      reconstructedBlockQs.push(parent);
      const children = questions.filter(q => q.blokId === activeBlok && q.parentId === parent.id);
      reconstructedBlockQs.push(...children);
    });

    // Iterate over reconstructedBlockQs and update sort_order in database
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      for (let i = 0; i < reconstructedBlockQs.length; i++) {
        const q = reconstructedBlockQs[i];
        await api.form.updateQuestion(q.id, {
          blok_id: activeBlockObj.dbId,
          parent_id: q.parentId,
          label: q.label,
          type: q.type,
          required: q.req,
          options: q.options,
          validation: q.val,
          skip_logic: q.skip,
          skip_target: q.skipTarget,
          sort_order: i
        });
      }
      await fetchFormStructure();
    } catch (err) {
      console.error("Gagal menyimpan urutan drag & drop:", err);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,label,type,required,validation_rule,skip_logic\nApakah ada anggota keluarga yang disabilitas?,radio,Ya,,Jumlah kepemilikan aset kendaraan,number,Tidak,range: 0–99,\nSumber air minum utama,select,Ya,,\nBahan atap terluas,select,Ya,,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_pertanyaan_capi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulateSelectFile = () => {
    setIsUploading(true);
    setTimeout(() => {
      setUploadedFile({
        name: "kuesioner_tambahan_blok3.xlsx",
        size: "18.4 KB",
        rowCount: 4
      });
      setDetectedColumns(["label", "type", "required", "validation_rule", "skip_logic"]);
      setPreviewRows([
        { label: "Apakah ada anggota keluarga yang disabilitas?", type: "radio", req: "Ya", val: "", skip: "" },
        { label: "Jumlah kepemilikan aset kendaraan", type: "number", req: "Tidak", val: "range: 0–99", skip: "" },
        { label: "Sumber air minum utama", type: "select", req: "Ya", val: "", skip: "" },
        { label: "Bahan atap terluas", type: "select", req: "Ya", val: "", skip: "" }
      ]);
      setIsUploading(false);
    }, 1200);
  };

  const handleImportQuestions = () => {
    if (!uploadedFile || previewRows.length === 0) return;
    
    const newQList = previewRows.map((row, index) => ({
      id: Date.now() + index,
      label: row.label,
      type: row.type,
      req: row.req === "Ya" || row.req === true,
      val: row.val || null,
      skip: row.skip || null,
      blokId: activeBlok,
      parentId: null,
      skipTarget: null
    }));

    setQuestions(prev => [...prev, ...newQList]);
    setIsSuccess(true);
    
    setTimeout(() => {
      setIsUploadModalOpen(false);
      setUploadedFile(null);
      setDetectedColumns([]);
      setPreviewRows([]);
      setIsSuccess(false);
    }, 1500);
  };

  const orderedBlockQs = getOrderedQuestionsInBlock(activeBlok, questions);
  const activeBlockCount = questions.filter(q => q.blokId === activeBlok).length;

  return (
    <AdminLayout tab="admin-builder" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full slide-up">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Form Builder</h1>
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
              <p className="text-sm text-slate-400 font-medium">Kelola struktur kuesioner untuk {selectedProject || "Desa Cantik"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-500 cursor-pointer hover:bg-slate-50 transition-all">
              <Eye size={14}/> Preview
            </button>
            <button 
              disabled={!canEdit}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border-0 transition-all ${
                canEdit 
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              title={!canEdit ? "Kuesioner hanya dapat disimpan ketika berstatus Draft" : "Simpan kuesioner"}
            >
              <Save size={14}/> Simpan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Blok list */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Struktur Blok</h3>
                {canEdit && (
                  <button 
                    onClick={() => {
                      setNewBlockTitle("");
                      setShowAddBlock(true);
                    }}
                    className="p-1 hover:bg-blue-50 text-blue-600 rounded border-0 bg-transparent cursor-pointer transition-all"
                    title="Tambah Blok Baru"
                  >
                    <Plus size={14}/>
                  </button>
                )}
              </div>

              {/* Inline Add Block Form */}
              {showAddBlock && (
                <div className="p-3 bg-blue-50/30 border-b border-blue-50" style={{ animation: "slideDown 0.15s ease" }}>
                  <input
                    type="text"
                    placeholder="Nama/Keterangan Blok..."
                    value={newBlockTitle}
                    onChange={e => setNewBlockTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700"
                  />
                  <div className="flex gap-1.5 mt-2 justify-end">
                    <button 
                      onClick={() => setShowAddBlock(false)} 
                      className="px-2.5 py-1 text-[10px] font-medium text-slate-400 bg-transparent border-0 cursor-pointer hover:bg-slate-100 rounded"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={() => setIsConfirmAddBlockOpen(true)}
                      disabled={!newBlockTitle.trim()}
                      className="px-2.5 py-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-0 cursor-pointer rounded"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Block List */}
              <div className="divide-y divide-slate-50">
                {blocks.map(b => {
                  const isEditing = editingBlockId === b.id;
                  const isCurrent = activeBlok === b.id;
                  const blockQuestionCount = questions.filter(q => q.blokId === b.id).length;
                  return (
                    <div 
                      key={b.id} 
                      onClick={() => !isEditing && setActiveBlok(b.id)}
                      className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${
                        isCurrent ? "bg-blue-50/40 border-r-2 border-blue-600" : "bg-transparent hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className={`font-bold text-xs ${isCurrent ? 'text-blue-600' : 'text-slate-800'}`}>{b.id}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingBlockTitle}
                              onChange={e => setEditingBlockTitle(e.target.value)}
                              className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded outline-none focus:border-blue-500 font-medium text-slate-700 flex-1"
                            />
                            <button onClick={handleSaveEditBlock} className="p-1 hover:bg-emerald-50 text-emerald-600 border-0 bg-transparent cursor-pointer rounded">
                              <Check size={12}/>
                            </button>
                            <button onClick={() => setEditingBlockId(null)} className="p-1 hover:bg-red-50 text-red-500 border-0 bg-transparent cursor-pointer rounded">
                              <X size={12}/>
                            </button>
                          </div>
                        ) : (
                          <p className={`text-[10px] mt-0.5 truncate ${isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>{b.title}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {canEdit && !isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150">
                            <button 
                              onClick={(e) => handleStartEditBlock(b, e)} 
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer rounded"
                              title="Edit Deskripsi Blok"
                            >
                              <Edit3 size={11}/>
                            </button>
                            {blocks.length > 1 && (
                              <button 
                                onClick={() => setBlockToDelete(b)} 
                                className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer rounded"
                                title="Hapus Blok"
                              >
                                <Trash2 size={11}/>
                              </button>
                            )}
                          </div>
                        )}
                        {!isEditing && (
                          <span className={`mono text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'
                          }`}>{blockQuestionCount}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center: Questions */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{activeBlok} — Daftar Rincian</h3>
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={!canEdit}
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${
                    canEdit 
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer" 
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                  title={!canEdit ? "Impor dinonaktifkan untuk kegiatan published" : "Impor daftar rincian pertanyaan via Excel/CSV"}
                >
                  <Upload size={13}/>
                  <span>Impor Excel</span>
                </button>
                {/* Tambah Catatan button */}
                <button
                  disabled={!canEdit}
                  onClick={handleAddNote}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${
                    canEdit
                      ? "text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                  title={!canEdit ? "Catatan dinonaktifkan untuk kegiatan published" : "Tambah catatan/instruksi di antara pertanyaan"}
                >
                  <StickyNote size={13}/>
                  <span>+ Catatan</span>
                </button>
                <button 
                  disabled={!canEdit}
                  onClick={() => setShowAdd(!showAdd)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${
                    canEdit 
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer" 
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                  title={!canEdit ? "Tambah dinonaktifkan untuk kegiatan published" : "Tambah rincian secara manual"}
                >
                  <Plus size={13}/>
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Add question form */}
            {showAdd && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 mb-4 shadow-sm" style={{ animation: 'slideUp 0.2s ease' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">No. Rincian</label>
                    <div className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg font-semibold text-blue-600 mono">
                      R.{`${blocks.findIndex(b=>b.id===activeBlok)+1}${(questions.filter(x=>x.blokId===activeBlok && !x.parentId).length+1).toString().padStart(2,'0')}`} (Otomatis)
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Tipe</label>
                    <select value={newQ.type} onChange={e => setNewQ({...newQ, type: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer">
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="radio">Radio/Pilihan</option>
                      <option value="select">Select/Dropdown</option>
                      <option value="location">Geotagging</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Label Pertanyaan</label>
                  <input value={newQ.label} onChange={e => setNewQ({...newQ, label: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" placeholder="Contoh: Nama Kepala Rumah Tangga"/>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={newQ.req} onChange={e => setNewQ({...newQ, req: e.target.checked})} className="rounded accent-blue-600"/>
                    Wajib diisi
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-50 rounded-lg border-0 cursor-pointer hover:bg-slate-100 transition-all">Batal</button>
                    <button onClick={addQ} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg border-0 cursor-pointer hover:bg-blue-700 transition-all">Tambah</button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions Container with relation lines */}
            <div className="relative" ref={listContainerRef}>
              
              {/* Skip logic relationship SVG lines */}
              {arrows.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 10 }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#3b82f6" />
                    </marker>
                  </defs>
                  {arrows.map(arrow => {
                    const distance = Math.abs(arrow.y2 - arrow.y1);
                    const depthOffset = Math.min(45, distance * 0.2); // curve depth
                    return (
                      <g key={arrow.id}>
                        {/* Shadow path for highlight hover */}
                        <path 
                          d={`M ${arrow.x1} ${arrow.y1} C ${arrow.x1 + 35 + depthOffset} ${arrow.y1}, ${arrow.x2 + 35 + depthOffset} ${arrow.y2}, ${arrow.x2} ${arrow.y2}`} 
                          fill="none" 
                          stroke="transparent" 
                          strokeWidth="8"
                          className="cursor-pointer pointer-events-auto"
                          title={`Lompat dari R.${arrow.sourceCode} ke R.${arrow.targetCode}`}
                        />
                        {/* Relationship line */}
                        <path 
                          d={`M ${arrow.x1} ${arrow.y1} C ${arrow.x1 + 35 + depthOffset} ${arrow.y1}, ${arrow.x2 + 35 + depthOffset} ${arrow.y2}, ${arrow.x2} ${arrow.y2}`} 
                          fill="none" 
                          stroke="#3b82f6" 
                          strokeWidth="1.5" 
                          strokeDasharray="4 3"
                          markerEnd="url(#arrow)"
                        />
                        {/* Skip Badge Indicator */}
                        <g transform={`translate(${arrow.x1 + 25 + depthOffset / 2}, ${(arrow.y1 + arrow.y2) / 2})`}>
                          <circle r="6" fill="#3b82f6" />
                          <path d="M-2 -2 L2 0 L-2 2 Z" fill="#fff" transform="scale(0.8)" />
                        </g>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Questions Cards List */}
              <div className="space-y-2 pr-6 pb-8">
                {orderedBlockQs.map((q, idx) => {
                  const isSelected = selectedId === q.id;
                  const qCode = getQuestionCode(q, questions, blocks);
                  const Icon = typeIcon[q.type] || Type;
                  const isSub = !!q.parentId;

                  // Find index among main questions for reordering
                  const mainQs = orderedBlockQs.filter(x => !x.parentId);
                  const mainIdx = mainQs.findIndex(x => x.id === q.id);

                  const dragProps = !isSub && canEdit ? {
                    draggable: true,
                    onDragStart: (e) => handleDragStart(e, mainIdx),
                    onDragOver: handleDragOver,
                    onDrop: (e) => handleDrop(e, mainIdx),
                  } : {};

                  return (
                    <div key={q.id} className="flex items-center gap-1.5">
                      {isSub && (
                        <div className="w-8 flex items-center justify-end mr-1 text-slate-300 flex-shrink-0 animate-sidebar-enter">
                          <CornerDownRight size={14}/>
                        </div>
                      )}

                      {/* NOTE card — special amber dashed style */}
                      {q.type === 'note' ? (
                        <div
                          id={`q-card-${q.id}`}
                          onClick={() => setSelectedId(isSelected ? null : q.id)}
                          {...dragProps}
                          className={`group/card flex-1 flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                            isSelected
                              ? 'border-amber-300 bg-amber-50/80'
                              : 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70'
                          }`}
                        >
                          {!isSub && canEdit && (
                            <div className="text-amber-300 group-hover/card:text-amber-400 cursor-grab flex-shrink-0 p-0.5 mt-0.5">
                              <GripVertical size={13}/>
                            </div>
                          )}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600 mt-0.5">
                            <StickyNote size={13}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                              <StickyNote size={8}/> CATATAN
                            </span>
                            <p className="text-xs font-medium text-amber-900 leading-relaxed break-words">
                              {renderNoteText(q.label)}
                            </p>
                          </div>
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                              className="opacity-0 group-hover/card:opacity-100 w-6 h-6 rounded flex items-center justify-center text-amber-400 hover:text-red-500 hover:bg-red-50 border-0 bg-transparent cursor-pointer transition-all flex-shrink-0 mt-0.5"
                              title="Hapus catatan"
                            >
                              <Trash size={11}/>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Regular question card */
                        <div 
                          id={`q-card-${q.id}`}
                          onClick={() => setSelectedId(isSelected ? null : q.id)}
                          {...dragProps}
                          className={`group/card flex-1 flex items-center gap-3 p-4 rounded-xl text-left border cursor-pointer transition-all ${
                            isSelected 
                              ? "border-blue-200 bg-blue-50/50 shadow-sm" 
                              : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                          }`}
                        >
                          {/* Drag Handle (for main questions only) */}
                          {!isSub && canEdit && (
                            <div className="text-slate-300 group-hover/card:text-slate-400 cursor-grab flex-shrink-0 p-0.5">
                              <GripVertical size={13}/>
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400"
                          }`}>
                            <Icon size={14}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="mono text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">R.{qCode}</span>
                              {q.req && <span className="w-1 h-1 rounded-full bg-red-400"/>}
                            </div>
                            <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">
                              {renderLabelWithVars(q.label)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {/* "+ Sub" button for main questions */}
                            {!isSub && canEdit && (
                              <button 
                                onClick={() => {
                                  setAddingSubParent(q);
                                  setNewSubLabel("");
                                }}
                                className="opacity-0 group-hover/card:opacity-100 text-[10px] font-semibold px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded transition-all border-0 cursor-pointer"
                                title="Tambah Sub-Pertanyaan"
                              >
                                + Sub
                              </button>
                            )}
                            {q.skipTarget && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex-shrink-0">Alur</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {orderedBlockQs.length === 0 && (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100/70 p-12 text-center">
                    <AlertTriangle size={24} className="text-slate-300 mx-auto mb-2.5"/>
                    <p className="text-xs text-slate-400 font-semibold">Blok ini masih kosong</p>
                    <p className="text-[11px] text-slate-300 mt-1">Gunakan tombol 'Tambah' atau 'Impor Excel' untuk mengisi kuesioner</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Properties & Sub-Question Addition Modal */}
          <div className="lg:col-span-4">
            
            {/* Inline Subquestion Creator */}
            {addingSubParent && (
              <div className="bg-white rounded-xl border border-blue-200 p-5 mb-4 shadow-sm animate-sidebar-enter">
                <div className="flex items-center gap-2 mb-3">
                  <CornerDownRight size={14} className="text-blue-600"/>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tambah Sub untuk R.{getQuestionCode(addingSubParent, questions, blocks)}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Pertanyaan Induk</label>
                    <p className="text-xs font-semibold text-slate-500 truncate bg-slate-50 p-2.5 rounded-lg">{addingSubParent.label}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Label Sub-Pertanyaan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Nama/Hubungan..."
                      value={newSubLabel}
                      onChange={e => setNewSubLabel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setAddingSubParent(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg border-0 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleAddSubQuestion}
                      disabled={!newSubLabel.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg border-0 cursor-pointer"
                    >
                      Simpan Sub
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Properties Panel */}
            {selected ? (() => {
              // === NOTE EDITOR (early return) ===
              if (selected.type === 'note') {
                return (
                  <div className="bg-white rounded-xl border border-amber-100 overflow-hidden sticky top-6 shadow-sm">
                    <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between bg-amber-50/50">
                      <div className="flex items-center gap-2">
                        <StickyNote size={14} className="text-amber-600"/>
                        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Edit Catatan</h3>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">CATATAN</span>
                    </div>
                    {!canEdit && (
                      <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"/>
                        Catatan hanya dapat direview (Mode Read-Only)
                      </div>
                    )}
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase">Isi Catatan</label>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyNoteFormat('note-textarea', '**', '**', selected.label, (val) => handleUpdateQuestion('label', val));
                                }}
                                className="w-7 h-7 flex items-center justify-center text-xs font-extrabold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-all"
                                title="Bold — pilih teks lalu klik"
                              >
                                <Bold size={12}/>
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyNoteFormat('note-textarea', '*', '*', selected.label, (val) => handleUpdateQuestion('label', val));
                                }}
                                className="w-7 h-7 flex items-center justify-center italic font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-all"
                                title="Italic — pilih teks lalu klik"
                              >
                                <Italic size={12}/>
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea
                          id="note-textarea"
                          value={selected.label}
                          readOnly={!canEdit}
                          onChange={e => handleUpdateQuestion('label', e.target.value)}
                          rows={4}
                          placeholder="Tulis catatan untuk petugas... **tebal** *miring*"
                          className={`w-full px-3 py-2.5 text-xs border rounded-lg font-medium outline-none resize-none focus:border-amber-400 leading-relaxed ${canEdit ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                        />
                        <p className="text-[9px] text-slate-400 mt-1">
                          Gunakan <code className="bg-slate-50 px-1 rounded font-bold">**teks**</code> tebal, <code className="bg-slate-50 px-1 rounded">*teks*</code> miring
                        </p>
                      </div>
                      {selected.label && (
                        <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <span className="text-[9px] font-bold text-amber-600 uppercase block mb-1.5">Preview</span>
                          <p className="text-xs text-amber-900 font-medium leading-relaxed">{renderNoteText(selected.label)}</p>
                        </div>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteQuestion(selected.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg border-0 transition-all text-red-500 bg-red-50 hover:bg-red-100 cursor-pointer"
                        >
                          <Trash2 size={13}/> Hapus Catatan
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // === REGULAR QUESTION PROPERTIES ===
              let parsedVal = { type: "unlimited", min: "", max: "", hint: "" };
              if (selected.val) {
                const trimmed = selected.val.trim();
                if (trimmed.startsWith('{')) {
                  try { parsedVal = { ...parsedVal, ...JSON.parse(trimmed) }; } catch (e) {}
                } else if (trimmed.startsWith('range:')) {
                  const parts = trimmed.replace('range:', '').trim().split('-');
                  parsedVal.type = "range"; parsedVal.min = parts[0] || ""; parsedVal.max = parts[1] || "";
                } else if (trimmed.startsWith('min:')) {
                  parsedVal.type = "min"; parsedVal.min = trimmed.replace('min:', '').trim();
                } else if (trimmed.startsWith('gt:')) {
                  parsedVal.type = "gt"; parsedVal.min = trimmed.replace('gt:', '').trim();
                } else { parsedVal.hint = trimmed; }
              }
              const updateValObj = (updates) => handleUpdateQuestion("val", JSON.stringify({ ...parsedVal, ...updates }));
              const optionsList = Array.isArray(selected.options) ? selected.options : [];

              return (
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden sticky top-6 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Properti Rincian</h3>
                    <Settings size={14} className="text-slate-300 animate-spin-slow"/>
                  </div>
                  {!canEdit && (
                    <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"/>
                      Properti hanya dapat direview (Mode Read-Only)
                    </div>
                  )}
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">No. Rincian</label>
                      <input
                        value={`R.${getQuestionCode(selected, questions, blocks)}`}
                        readOnly
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-bold mono outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase">Label Pertanyaan (Utama)</label>
                        {canEdit && (
                          <VariableInserterDropdown
                            questions={questions}
                            blocks={blocks}
                            currentQuestionId={selectedId}
                            onInsert={(code) => {
                              const textarea = document.getElementById('label-textarea-main');
                              const start = textarea?.selectionStart ?? selected.label.length;
                              const end = textarea?.selectionEnd ?? selected.label.length;
                              const newLabel = selected.label.slice(0, start) + `$R${code}` + selected.label.slice(end);
                              handleUpdateQuestion('label', newLabel);
                              setTimeout(() => {
                                if (textarea) {
                                  textarea.focus();
                                  const pos = start + `$R${code}`.length;
                                  textarea.setSelectionRange(pos, pos);
                                }
                              }, 50);
                            }}
                          />
                        )}
                      </div>
                      <textarea
                        id="label-textarea-main"
                        value={selected.label}
                        readOnly={!canEdit}
                        onChange={e => handleUpdateQuestion("label", e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2.5 text-xs border rounded-lg font-semibold outline-none resize-none focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                      />
                      {selected.label.includes('$R') && (
                        <div className="mt-1.5 px-3 py-2 bg-amber-50/60 border border-amber-100 rounded-lg text-xs text-slate-600 leading-relaxed">
                          <span className="text-[9px] font-bold text-amber-600 uppercase block mb-0.5">Preview Variabel</span>
                          {renderLabelWithVars(selected.label)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Petunjuk Pengisian (Keterangan)</label>
                      <textarea
                        value={parsedVal.hint || ""}
                        readOnly={!canEdit}
                        placeholder="Contoh: Isi dengan umur dalam satuan tahun genap..."
                        onChange={e => updateValObj({ hint: e.target.value })}
                        rows={2}
                        className={`w-full px-3 py-2.5 text-xs border rounded-lg font-medium outline-none resize-none focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Tipe Input</label>
                        {canEdit ? (
                          <select
                            value={selected.type}
                            onChange={e => handleUpdateQuestion("type", e.target.value)}
                            className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                          >
                            <option value="text">Text (Kapital)</option>
                            <option value="number">Number</option>
                            <option value="radio">Radio</option>
                            <option value="select">Select (Multi-Select)</option>
                            <option value="location">Geotagging</option>
                          </select>
                        ) : (
                          <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-semibold capitalize">{selected.type}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Wajib diisi</label>
                        {canEdit ? (
                          <select
                            value={selected.req ? "Ya" : "Tidak"}
                            onChange={e => handleUpdateQuestion("req", e.target.value === "Ya")}
                            className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                          >
                            <option value="Ya">Ya</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        ) : (
                          <div className={`px-3 py-2.5 text-xs border border-slate-100 rounded-lg font-semibold ${selected.req ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}>{selected.req ? "Ya" : "Tidak"}</div>
                        )}
                      </div>
                    </div>

                    {selected.type === "number" && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Validasi Batasan Angka</label>
                        <div>
                          <select
                            value={parsedVal.type}
                            disabled={!canEdit}
                            onChange={e => updateValObj({ type: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-600 font-semibold"
                          >
                            <option value="unlimited">Tidak Dibatasi</option>
                            <option value="range">Rentang Nilai (Min-Max)</option>
                            <option value="min">Lebih Dari / Sama Dengan (&gt;=)</option>
                            <option value="gt">Lebih Dari (&gt;)</option>
                          </select>
                        </div>
                        {parsedVal.type === "range" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Nilai Min</label>
                              <input type="number" value={parsedVal.min} disabled={!canEdit} onChange={e => updateValObj({ min: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"/>
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Nilai Max</label>
                              <input type="number" value={parsedVal.max} disabled={!canEdit} onChange={e => updateValObj({ max: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"/>
                            </div>
                          </div>
                        )}
                        {(parsedVal.type === "min" || parsedVal.type === "gt") && (
                          <div>
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Batas Nilai</label>
                            <input type="number" value={parsedVal.min} disabled={!canEdit} onChange={e => updateValObj({ min: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"/>
                          </div>
                        )}
                      </div>
                    )}

                    {(selected.type === "radio" || selected.type === "select") && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Daftar Pilihan Opsi</label>
                          {canEdit && (
                            <button type="button" onClick={() => handleAddOption(selected, optionsList)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded border-0 cursor-pointer">
                              + Opsi
                            </button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {optionsList.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-150">
                              <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-blue-600 bg-blue-50 rounded-md uppercase">{opt.value}</span>
                              <input type="text" value={opt.label} readOnly={!canEdit} onChange={e => handleUpdateOptionLabel(optionsList, idx, e.target.value)} className="flex-1 px-2 py-1 text-xs border border-transparent hover:border-slate-100 focus:border-blue-300 rounded outline-none font-medium text-slate-700 bg-transparent"/>
                              {canEdit && (
                                <button type="button" onClick={() => handleDeleteOption(selected, optionsList, idx)} className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 border-0 bg-transparent cursor-pointer rounded">
                                  <Trash size={12}/>
                                </button>
                              )}
                            </div>
                          ))}
                          {optionsList.length === 0 && <p className="text-[10px] text-slate-400 text-center italic py-2">Belum ada pilihan opsi</p>}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Lompat ke Rincian (Skip Logic)</label>
                      {canEdit ? (
                        <select
                          value={selected.skipTarget || ""}
                          onChange={e => handleUpdateQuestion("skipTarget", e.target.value ? parseInt(e.target.value, 10) : null)}
                          className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-blue-600 outline-none cursor-pointer focus:border-blue-500"
                        >
                          <option value="">-- Tidak ada lompatan --</option>
                          {blocks.map(b => {
                            const blockQs = questions.filter(x => x.blokId === b.id && x.id !== selected.id && x.type !== 'note');
                            if (blockQs.length === 0) return null;
                            return (
                              <optgroup key={b.id} label={`${b.id}: ${b.title}`}>
                                {blockQs.map(x => (
                                  <option key={x.id} value={x.id}>R.{getQuestionCode(x, questions, blocks)}: {x.label.substring(0, 30)}...</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-medium">
                          {selected.skipTarget ? `Lompat ke R.${getQuestionCode(questions.find(t => t.id === selected.skipTarget), questions, blocks)}` : "Tidak ada"}
                        </div>
                      )}
                    </div>

                    {selected.skipTarget && (
                      <div className="p-3 bg-blue-50/20 border border-blue-50 rounded-xl space-y-2 animate-custom-fade">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Syarat Jawaban Pemicu Lompatan</label>
                        {canEdit ? (
                          optionsList.length > 0 ? (
                            <select value={selected.skip || ""} onChange={e => handleUpdateQuestion("skip", e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                              <option value="">-- Pilih opsi pemicu --</option>
                              {optionsList.map(opt => <option key={opt.value} value={opt.value}>{opt.value}. {opt.label}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={selected.skip || ""} onChange={e => handleUpdateQuestion("skip", e.target.value)} placeholder="Contoh: 2 atau a" className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none focus:border-blue-500"/>
                          )
                        ) : (
                          <div className="px-3 py-2 text-xs bg-white border border-slate-100 rounded-lg text-slate-600 font-semibold">{selected.skip ? `Jika bernilai: ${selected.skip}` : "Belum ditentukan"}</div>
                        )}
                        <p className="text-[9px] text-slate-400 leading-snug">Semua rincian setelah pertanyaan ini hingga sebelum target akan dilewati (*skipped*) jika petugas memilih opsi di atas.</p>
                      </div>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleDeleteQuestion(selected.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg border-0 transition-all mt-2 text-red-500 bg-red-50 hover:bg-red-100 cursor-pointer"
                        title="Hapus rincian ini beserta sub-pertanyaannya"
                      >
                        <Trash2 size={13}/> Hapus Rincian
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Settings size={28} className="text-slate-200 mb-3 animate-pulse"/>
                <p className="text-sm text-slate-400 font-bold">Pilih rincian untuk melihat propertinya</p>
                <p className="text-xs text-slate-300 mt-1">Klik pada salah satu rincian kuesioner</p>
              </div>
      {isConfirmAddBlockOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ animation: "fadeIn 0.15s ease" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg" style={{ animation: "scaleIn 0.2s ease" }}>
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <CheckCircleWrapper />
              <h3 className="text-sm font-bold text-slate-800">Konfirmasi Tambah Blok</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menambahkan blok baru bernama <strong className="text-slate-700">"{newBlockTitle}"</strong> setelah {activeBlok}? Penomoran romawi blok lainnya akan bergeser otomatis secara berurutan.
            </p>
            <div className="flex gap-2.5 mt-6 justify-end">
              <button 
                onClick={() => setIsConfirmAddBlockOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl border-0 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmAddBlock}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl border-0 cursor-pointer"
              >
                Ya, Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Block Confirmation Modal */}
      {blockToDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ animation: "fadeIn 0.15s ease" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg" style={{ animation: "scaleIn 0.2s ease" }}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-bold text-slate-800">Hapus Blok {blockToDelete.id}?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus <strong className="text-slate-700">"{blockToDelete.id} — {blockToDelete.title}"</strong> beserta seluruh rincian pertanyaan di dalamnya. Penomoran romawi blok di bawahnya akan disesuaikan. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5 mt-6 justify-end">
              <button 
                onClick={() => setBlockToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl border-0 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => handleDeleteBlock(blockToDelete.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl border-0 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unggah Pertanyaan Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => { if (!isUploading && !isSuccess) setIsUploadModalOpen(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg"
            style={{ maxWidth: 580, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database size={20}/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Unggah Rincian Pertanyaan</h3>
                  <p className="text-xs text-slate-400">Impor daftar pertanyaan kuesioner sekaligus via Excel/CSV</p>
                </div>
              </div>
              <button 
                disabled={isUploading || isSuccess}
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent disabled:opacity-50">
                <X size={18}/>
              </button>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check size={36}/>
                </div>
                <h4 className="text-md font-bold text-slate-800 mb-1">Rincian Pertanyaan Berhasil Diimpor!</h4>
                <p className="text-xs text-slate-400">Pertanyaan baru telah ditambahkan ke {activeBlok}.</p>
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Butuh template kolom pertanyaan?</p>
                      <p className="text-[10px] text-slate-400">Gunakan format template standar agar kolom data terpetakan otomatis</p>
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
                    <label className="block text-xs font-semibold text-slate-500 mb-2">File Kuesioner (Excel / CSV)</label>
                    {!uploadedFile ? (
                      <div 
                        onClick={handleSimulateSelectFile}
                        className={`border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
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
                              Klik untuk pilih file pertanyaan kuesioner
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Mendukung format xlsx/csv sesuai dengan struktur rincian CAPI BPS
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4" style={{ animation: 'scaleIn 0.15s ease' }}>
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                              <FileText size={18}/>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{uploadedFile.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{uploadedFile.size} • Terdeteksi {uploadedFile.rowCount} rincian pertanyaan</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setUploadedFile(null);
                              setDetectedColumns([]);
                              setPreviewRows([]);
                            }}
                            className="w-7 h-7 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg flex items-center justify-center border-0 bg-transparent cursor-pointer transition-all"
                          >
                            <X size={14}/>
                          </button>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Kolom Terdeteksi</span>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedColumns.map(c => (
                              <span key={c} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-semibold border border-blue-100/50">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Pratinjau Pertanyaan (Akan Diimpor ke {activeBlok})</span>
                          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px] bg-slate-50/30">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50/60 text-slate-400 font-semibold border-b border-slate-100 text-left">
                                  <th className="px-3 py-2 w-16">No. Rincian</th>
                                  <th className="px-3 py-2">Pertanyaan / Label</th>
                                  <th className="px-3 py-2 w-16">Tipe</th>
                                  <th className="px-3 py-2 w-16">Wajib</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                {previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 mono font-semibold text-blue-600">R.{`${blocks.findIndex(b=>b.id===activeBlok)+1}${(questions.filter(x=>x.blokId===activeBlok && !x.parentId).length + idx + 1).toString().padStart(2,'0')}`}</td>
                                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                                        {row.type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">
                                      {row.req}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"/> Validasi format sukses. Struktur rincian kuesioner siap diimpor.
                          </p>
                        </div>
                      </div>
                    )}
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
                  <button 
                    disabled={!uploadedFile || isUploading}
                    onClick={handleImportQuestions}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    Impor Pertanyaan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function CheckCircleWrapper() {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
      <Check size={16} />
    </div>
  );
}

/**
 * Dropdown button that lists all questions before the current one (across all blocks)
 * and inserts $R{code} at the cursor position in the label textarea.
 */
function VariableInserterDropdown({ questions, blocks, currentQuestionId, onInsert }) {
  const [open, setOpen] = useState(false);

  // Build a list of questions that appear before the current one (from any block)
  // using the same getQuestionCode logic
  const prior = [];
  blocks.forEach(b => {
    const mainQs = questions.filter(q => q.blokId === b.id && !q.parentId);
    mainQs.forEach(parent => {
      const code = getQuestionCode(parent, questions, blocks);
      if (parent.id !== currentQuestionId) {
        prior.push({ id: parent.id, code, label: parent.label, blockId: b.id, blockTitle: b.title });
      }
      // sub-questions
      const children = questions.filter(q => q.blokId === b.id && q.parentId === parent.id);
      children.forEach(child => {
        if (child.id !== currentQuestionId) {
          const childCode = getQuestionCode(child, questions, blocks);
          prior.push({ id: child.id, code: childCode, label: child.label, blockId: b.id, blockTitle: b.title });
        }
      });
    });
  });

  if (prior.length === 0) return null;

  // Group by block
  const grouped = blocks.map(b => ({
    block: b,
    items: prior.filter(p => p.blockId === b.id)
  })).filter(g => g.items.length > 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg border-solid cursor-pointer transition-all"
        title="Sisipkan variabel dari jawaban pertanyaan sebelumnya"
      >
        <Variable size={11}/> Variabel
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-50 border border-slate-100 w-64 max-h-56 overflow-y-auto" style={{ animation: 'scaleIn 0.15s ease' }}>
            <p className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">Pilih Pertanyaan Rujukan</p>
            {grouped.map(g => (
              <div key={g.block.id}>
                <p className="px-3 py-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider bg-slate-50/50">{g.block.id}: {g.block.title}</p>
                {g.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onInsert(item.code); setOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs border-0 bg-white hover:bg-amber-50 cursor-pointer transition-all flex items-start gap-2"
                  >
                    <span className="mono text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">R{item.code}</span>
                    <span className="text-slate-600 font-medium truncate leading-snug">{item.label.substring(0, 40)}{item.label.length > 40 ? '…' : ''}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminFormBuilder;