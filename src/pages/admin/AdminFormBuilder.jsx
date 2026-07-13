import SelectDropdown from '../../components/ui/SelectDropdown';
import React from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { api } from "../../services/api";
import { useState, useEffect, useRef } from "react";
import {
  Hash, Eye, Save, Settings, Plus, ChevronDown, List, Type,
  Trash2, Upload, Database, FileText, X, Check, GripVertical,
  CornerDownRight, Edit3, Trash, AlertTriangle, ArrowRight, MapPin, Variable,
  StickyNote, Bold, Italic, Calendar, User, Users, Smartphone, Copy, Clock
} from "lucide-react";
import QCard from "../../components/ui/QCard";
import SearchableSelect from "../../components/ui/SearchableSelect";



const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

function getRoman(num) {
  return ROMAN_NUMERALS[num - 1] || num.toString();
}

const checkOptionTrigger = (val, triggerOptions) => {
  if (val === undefined || val === null || val === '') return false;
  
  if (Array.isArray(val)) {
    return val.some(item => triggerOptions.includes(String(item)));
  }
  
  if (val && typeof val === 'object') {
    if ('value' in val) {
      return triggerOptions.includes(String(val.value));
    }
    return triggerOptions.some(opt => {
      const optVal = val[opt];
      return optVal !== undefined && optVal !== null && optVal !== '' && optVal !== 0 && optVal !== '0';
    });
  }

  const trimmed = typeof val === 'string' ? val.trim() : '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedVal = JSON.parse(trimmed);
      if (Array.isArray(parsedVal)) {
        return parsedVal.some(item => triggerOptions.includes(String(item)));
      }
      if (parsedVal && typeof parsedVal === 'object') {
        if ('value' in parsedVal) {
          return triggerOptions.includes(String(parsedVal.value));
        }
        return triggerOptions.some(opt => {
          const optVal = parsedVal[opt];
          return optVal !== undefined && optVal !== null && optVal !== '' && optVal !== 0 && optVal !== '0';
        });
      }
    } catch (e) { }
  }
  return triggerOptions.includes(String(val));
};

const evaluateCondition = (c, values) => {
  const val = values[c.question_id];
  if (c.operator && ['=', '>', '>=', '<', '<='].includes(c.operator)) {
    if (val === undefined || val === null || val === '') return false;
    let actualVal = val;
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        actualVal = val[0];
      } else if ('value' in val) {
        actualVal = val.value;
      }
    } else if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          actualVal = parsed[0];
        } else if (parsed && 'value' in parsed) {
          actualVal = parsed.value;
        }
      } catch (e) { }
    }
    
    const numericVal = parseFloat(actualVal);
    const targetVal = parseFloat(c.value);
    if (isNaN(numericVal) || isNaN(targetVal)) {
      if (c.operator === '=') {
        return String(actualVal) === String(c.value);
      }
      return false;
    }
    switch (c.operator) {
      case '=': return numericVal === targetVal;
      case '>': return numericVal > targetVal;
      case '>=': return numericVal >= targetVal;
      case '<': return numericVal < targetVal;
      case '<=': return numericVal <= targetVal;
      default: return false;
    }
  }
  const triggerOptions = String(c.value).split(",").map(x => x.trim()).filter(Boolean);
  return checkOptionTrigger(val, triggerOptions);
};

function sortBlocksNaturally(blks) {
  const romanToDecimal = (roman) => {
    const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    let dec = 0;
    const str = roman.toLowerCase();
    for (let i = 0; i < str.length; i++) {
      const current = map[str[i]];
      const next = map[str[i + 1]];
      if (next && current < next) {
        dec += next - current;
        i++;
      } else {
        dec += current;
      }
    }
    return dec || 0;
  };
  const getBlockSortKey = (block) => {
    const kodeStr = String(block.kode || block.id || "");
    const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
    if (match) {
      return romanToDecimal(match[1]);
    }
    if (kodeStr.toLowerCase() === "pengantar") {
      return 0;
    }
    return 999;
  };
  return [...(blks || [])].sort((a, b) => {
    const keyA = getBlockSortKey(a);
    const keyB = getBlockSortKey(b);
    if (keyA !== keyB) return keyA - keyB;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function getOrderedQuestionsInBlock(blockId, allQuestions) {
  const blockQs = allQuestions.filter(q => q.blokId === blockId);
  console.log('[getOrderedQuestionsInBlock] blockId:', blockId, 'blockQs.length:', blockQs.length);
  const mainQs = blockQs.filter(q => !q.parentId);
  console.log('[getOrderedQuestionsInBlock] mainQs.length:', mainQs.length);

  const ordered = [];
  const addChildren = (parentId) => {
    const children = blockQs.filter(q => q.parentId === parentId);
    children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    children.forEach(child => {
      ordered.push(child);
      addChildren(child.id);
    });
  };

  mainQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  mainQs.forEach(parent => {
    ordered.push(parent);
    addChildren(parent.id);
  });
  console.log('[getOrderedQuestionsInBlock] ordered.length:', ordered.length);
  return ordered;
} function getQuestionCode(q, allQuestions, allBlocks) {
  if (!q) return "";
  // Notes do NOT count in the R-numbering
  if (q.type === 'note') return "";

  // Support custom code set in validation JSON
  const valStr = q.validation || q.val;
  if (valStr && valStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(valStr);
      if (parsed.custom_code || parsed.customCode) {
        return parsed.custom_code || parsed.customCode;
      }
    } catch (e) { }
  }

  const block = allBlocks.find(b => b.id === q.blokId || b.kode === q.blokId);
  let blockIdx = 0;
  if (block) {
    const romanToDecimal = (roman) => {
      const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
      let dec = 0;
      const str = roman.toLowerCase();
      for (let i = 0; i < str.length; i++) {
        const current = map[str[i]];
        const next = map[str[i + 1]];
        if (next && current < next) {
          dec += next - current;
          i++;
        } else {
          dec += current;
        }
      }
      return dec || 0;
    };
    const kodeStr = String(block.kode || block.id || "");
    const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
    if (match) {
      blockIdx = romanToDecimal(match[1]);
    }
  }

  if (!blockIdx) {
    const standardBlocks = allBlocks.filter(b => {
      const idStr = String(b.kode || b.id || "");
      return idStr.startsWith("Blok ");
    });
    blockIdx = standardBlocks.findIndex(b => (b.id === q.blokId || b.kode === q.blokId)) + 1;
  }
  if (blockIdx === 0) return "";

  if (q.parentId) {
    const parent = allQuestions.find(p => p.id === q.parentId);
    if (!parent) return "";
    const parentCode = getQuestionCode(parent, allQuestions, allBlocks);
    if (!parentCode) return "";

    // Sibling sub-questions of same parent
    const siblings = allQuestions.filter(s => s.blokId === q.blokId && s.parentId === q.parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const sibIdx = siblings.findIndex(s => s.id === q.id);

    // Check if the parent itself has a parent (making q a grandchild / level 2 sub-question)
    if (parent.parentId) {
      const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
      const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
      return `${parentCode}.${suffix}`;
    } else {
      const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0)); // a, b, c...
      return `${parentCode}${letter}`;
    }
  } else {
    // Index among main non-note questions of the block
    const mainQs = allQuestions.filter(s => s.blokId === q.blokId && !s.parentId && s.type !== 'note').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    let startIndex = 1;
    const firstQ = mainQs[0];
    if (firstQ) {
      const firstValStr = firstQ.validation || firstQ.val;
      if (firstValStr && firstValStr.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(firstValStr);
          const custom = parsed.custom_code || parsed.customCode || "";
          if (parsed.start_zero || parsed.start_from_zero || custom.endsWith("00") || custom === "400" || custom === "R400") {
            startIndex = 0;
          }
        } catch (e) { }
      }
    }

    const qIdx = mainQs.findIndex(s => s.id === q.id) + startIndex;
    const padded = qIdx.toString().padStart(2, '0');
    return `${blockIdx}${padded}`;
  }
}

/**
 * Renders note text supporting **bold** and *italic* markdown.
 * @param {string} text
 * @returns React nodes
 */
function renderNoteText(text) {
  if (!text) return null;
  let resolvedText = text;
  if (resolvedText.includes("{{no_bangunan_terakhir}}")) {
    resolvedText = resolvedText.replace(/\{\{no_bangunan_terakhir\}\}/g, "[No. Bangunan Terakhir]");
  }

  // Handle generic dynamic tags like {{MAXPCLR101}}, {{MAXALLR101}}, {{MAX_PCL_R101}}
  const tagRegex = /\{\{(MAX|MIN|AVG|SUM|LAST)_?(PCL|ALL)?_?([a-zA-Z0-9.]+)\}\}/gi;
  resolvedText = resolvedText.replace(tagRegex, (match, op, scope, code) => {
    const finalScope = scope ? scope.toUpperCase() : "PCL";
    return `[${op.toUpperCase()} ${finalScope} ${code}]`;
  });

  // Process **bold** first, then *italic*
  const parts = resolvedText.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
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
 * Sanitizes input to prevent XSS attacks.
 */
function renderLabelWithVars(label) {
  if (!label || typeof label !== 'string') return null;

  // Escape HTML entities first to prevent XSS
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Escape the label first
  const escapedLabel = escapeHtml(label);

  // Now process $R tokens (only in escaped content, safe to manipulate)
  if (!escapedLabel.includes('$R')) return escapedLabel;

  const parts = escapedLabel.split(/(\$R[A-Za-z0-9]+)/g);
  return parts.map((part, i) => {
    if (/^\$R[A-Za-z0-9]+$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded mx-0.5 align-middle"
          title={`Variabel: merujuk ke jawaban ${part.slice(1)}`}
        >
          <Variable size={8} /> {part.slice(1)}
        </span>
      );
    }
    return part;
  });
}

function RuleBuilder({ ruleVal, onChange, label, questions, blocks, currentQuestionId, allowCurrent }) {
  const parsed = (() => {
    if (ruleVal && ruleVal.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(ruleVal);
        if (obj && Array.isArray(obj.conditions)) return obj;
      } catch (e) { }
    }
    // Convert old string format if relevant
    return {
      operator: "AND",
      conditions: []
    };
  })();

  const updateRule = (updates) => {
    const nextRule = { ...parsed, ...updates };
    if (nextRule.conditions.length === 0) {
      onChange(null);
    } else {
      onChange(JSON.stringify(nextRule));
    }
  };

  // Find all questions across all blocks
  const allOrderedQs = [];
  blocks.forEach(b => {
    allOrderedQs.push(...getOrderedQuestionsInBlock(b.id, questions));
  });

  // Filter possible trigger questions: they must be BEFORE the current question (or block), or include the current question if allowed
  const currentIdx = currentQuestionId !== null && currentQuestionId !== undefined ? allOrderedQs.findIndex(q => q.id === currentQuestionId) : allOrderedQs.length;
  const possibleTriggerQs = allOrderedQs.filter((q, idx) => {
    if (currentQuestionId === null || currentQuestionId === undefined) return q.type !== 'note';
    const limit = allowCurrent ? currentIdx : currentIdx - 1;
    return idx <= limit && q.type !== 'note';
  });

  return (
    <div className="space-y-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 uppercase">{label} ({parsed.conditions.length} Kondisi)</label>
        {parsed.conditions.length > 1 && (
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => updateRule({ operator: "AND" })}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border-0 cursor-pointer transition-all ${parsed.operator === 'AND' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-400'}`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => updateRule({ operator: "OR" })}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border-0 cursor-pointer transition-all ${parsed.operator === 'OR' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-400'}`}
            >
              OR
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {parsed.conditions.map((cond, cIdx) => {
          const targetQ = questions.find(q => q.id === cond.question_id);
          const qOptions = targetQ && Array.isArray(targetQ.options) ? targetQ.options : [];
          return (
            <div key={cIdx} className="space-y-2 p-2.5 bg-white border border-slate-200 rounded-lg relative group">
              <div className="flex items-center justify-between gap-1">
                <SelectDropdown variant="form"
                  value={cond.question_id || ""}
                  onChange={e => {
                    const newConds = [...parsed.conditions];
                    newConds[cIdx] = { ...newConds[cIdx], question_id: parseInt(e.target.value, 10), value: "" };
                    updateRule({ conditions: newConds });
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded outline-none font-semibold text-slate-700 w-full cursor-pointer"
                >
                  <option value="">-- Pilih Rincian --</option>
                  {possibleTriggerQs.map(q => (
                    <option key={q.id} value={q.id}>R.{getQuestionCode(q, questions, blocks)}: {q.label.substring(0, 30)}...</option>
                  ))}
                </SelectDropdown>
                <button
                  type="button"
                  onClick={() => {
                    const newConds = parsed.conditions.filter((_, idx) => idx !== cIdx);
                    updateRule({ conditions: newConds });
                  }}
                  className="p-1 text-red-550 hover:text-red-655 hover:bg-red-50 rounded border-0 bg-transparent cursor-pointer flex-shrink-0"
                >
                  <Trash size={12} />
                </button>
              </div>

              {cond.question_id && (
                <div>
                  {targetQ?.type === 'number' ? (
                    <div className="flex gap-2">
                      <SelectDropdown variant="form"
                        value={cond.operator || "="}
                        onChange={e => {
                          const newConds = [...parsed.conditions];
                          newConds[cIdx] = { ...newConds[cIdx], operator: e.target.value };
                          updateRule({ conditions: newConds });
                        }}
                        className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded outline-none font-semibold text-slate-700 w-1/3 cursor-pointer"
                      >
                        <option value="=">Sama dengan (=)</option>
                        <option value=">">Lebih dari (&gt;)</option>
                        <option value=">=">Lebih dari sama dengan (&gt;=)</option>
                        <option value="<">Kurang dari (&lt;)</option>
                        <option value="<=">Kurang dari sama dengan (&lt;=)</option>
                      </SelectDropdown>
                      <input
                        type="number"
                        placeholder="Nilai angka"
                        value={cond.value || ""}
                        onChange={e => {
                          const newConds = [...parsed.conditions];
                          newConds[cIdx] = { ...newConds[cIdx], value: e.target.value };
                          updateRule({ conditions: newConds });
                        }}
                        className="w-2/3 px-2 py-1 text-[11px] bg-white border border-slate-200 rounded outline-none font-semibold text-slate-700"
                      />
                    </div>
                  ) : qOptions.length > 0 ? (
                    <div className="space-y-1 max-h-[100px] overflow-y-auto bg-slate-50 p-1.5 rounded border border-slate-200">
                      {qOptions.map(opt => {
                        const selectedOpts = (cond.value || "").split(",").filter(Boolean);
                        const isChecked = selectedOpts.includes(String(opt.value));
                        return (
                          <label key={opt.value} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                let nextVal;
                                if (e.target.checked) {
                                  nextVal = [...selectedOpts, String(opt.value)].join(",");
                                } else {
                                  nextVal = selectedOpts.filter(x => x !== String(opt.value)).join(",");
                                }
                                const newConds = [...parsed.conditions];
                                newConds[cIdx] = { ...newConds[cIdx], value: nextVal };
                                updateRule({ conditions: newConds });
                              }}
                              className="rounded accent-blue-600 scale-75 cursor-pointer"
                            />
                            <span>{opt.value}. {opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: 1 atau 1,2"
                      value={cond.value || ""}
                      onChange={e => {
                        const newConds = [...parsed.conditions];
                        newConds[cIdx] = { ...newConds[cIdx], value: e.target.value };
                        updateRule({ conditions: newConds });
                      }}
                      className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded outline-none font-semibold text-slate-700"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          updateRule({
            conditions: [...parsed.conditions, { question_id: possibleTriggerQs[0]?.id || "", value: "" }]
          });
        }}
        disabled={possibleTriggerQs.length === 0}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-slate-250 border-dashed rounded-lg cursor-pointer transition-all disabled:opacity-50"
      >
        <Plus size={11} /> Tambah Kondisi
      </button>
    </div>
  );
}

function AdminFormBuilder({ onNavigate, selectedProject, onProjectChange, activities, loading }) {
  // Main Project Data Map
  const [projectData, setProjectData] = useState({});

  const [activeBlok, setActiveBlok] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [insertMode, setInsertMode] = useState("bottom");
  const [newQ, setNewQ] = useState({ label: "", type: "text", req: true });
  const [localLoading, setLocalLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewActiveBlok, setPreviewActiveBlok] = useState("");

  // Read active data
  const currentProjectData = projectData[selectedProject] || {
    blocks: [],
    questions: []
  };

  const blocks = currentProjectData.blocks;
  const questions = currentProjectData.questions;

  // ─── PETUGAS PREVIEW HELPERS & LOGIC ────────────────────────
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [freeformOptions, setFreeformOptions] = useState([]);

  useEffect(() => {
    if (selectedProject) {
      api.freeform.getAll(selectedProject, 'PILIHAN_DINAMIS')
        .then(res => {
          if (res?.success) {
            setFreeformOptions(res.data);
          }
        })
        .catch(err => console.error("Failed to fetch freeform options:", err));
    } else {
      setFreeformOptions([]);
    }
  }, [selectedProject]);

  const parseValidation = (str) => {
    if (!str) return { rangeText: "", hintText: "", description: "", isLoop: false, loopByQuestionId: null, subLabel: "" };
    const trimmed = str.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        let rangeText = "";
        if (parsed.type === 'range') {
          rangeText = `Rentang: ${parsed.min} - ${parsed.max}`;
        } else if (parsed.type === 'min') {
          rangeText = `Minimal: ${parsed.min}`;
        } else if (parsed.type === 'gt') {
          rangeText = `Lebih dari: ${parsed.min}`;
        }
        return {
          rangeText,
          hintText: parsed.hint || "",
          description: parsed.description || parsed.hint || "",
          isLoop: !!parsed.is_loop,
          loopType: parsed.loop_type || (parsed.loop_by_question_id ? "question" : "manual"),
          loopByQuestionId: parsed.loop_by_question_id || null,
          defaultVal: parsed.default_val || null,
          isLookupKey: !!parsed.is_lookup_key,
          readOnly: !!parsed.read_only,
          parentMode: parsed.parent_mode || "label",
          subLabel: parsed.sub_label || "",
          formula: parsed.formula || ""
        };
      } catch (e) { }
    }

    if (trimmed.startsWith('range:')) {
      return {
        rangeText: `Rentang: ${trimmed.replace('range:', '').trim()}`,
        hintText: "",
        description: "",
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    } else if (trimmed.startsWith('min:')) {
      return {
        rangeText: `Minimal: ${trimmed.replace('min:', '').trim()}`,
        hintText: "",
        description: "",
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    } else if (trimmed.startsWith('gt:')) {
      return {
        rangeText: `Lebih dari: ${trimmed.replace('gt:', '').trim()}`,
        hintText: "",
        description: "",
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    }

    return {
      rangeText: "",
      hintText: "",
      description: str,
      isLoop: false,
      loopType: "question",
      loopByQuestionId: null,
      defaultVal: null,
      isLookupKey: false,
      copyOnKeyMatch: false,
      subLabel: ""
    };
  };

  const checkOptionTrigger = (val, triggerOptions) => {
    if (val === undefined || val === null || val === '') return false;
    const trimmed = typeof val === 'string' ? val.trim() : '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsedVal = JSON.parse(trimmed);
        if (Array.isArray(parsedVal)) {
          return parsedVal.some(item => triggerOptions.includes(String(item)));
        }
        if (parsedVal && typeof parsedVal === 'object') {
          if ('value' in parsedVal) {
            return triggerOptions.includes(String(parsedVal.value));
          }
          return triggerOptions.some(opt => {
            const optVal = parsedVal[opt];
            return optVal !== undefined && optVal !== null && optVal !== '' && optVal !== 0 && optVal !== '0';
          });
        }
      } catch (e) { }
    }
    return triggerOptions.includes(String(val));
  };

  const isEvaluatingPreviewRef = useRef(false);

  const isQuestionInLoop = (q) => {
    if (!q) return false;
    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questions.find(p => p.id === parentId);
      if (parent && isQuestionInLoop(parent)) {
        return true;
      }
    }
    const qValStr = q.val || q.validation;
    if (qValStr) {
      try {
        const parsed = JSON.parse(qValStr);
        if (parsed) {
          if (parsed.is_loop || parsed.isLoop || parsed.loop_group || parsed.loop_by_question_id || parsed.loopByQuestionId) {
            return true;
          }
        }
      } catch (e) { }
    }
    return false;
  };

  function findQuestionByCode(codeStr) {
    if (!codeStr) return null;
    const normalizedCode = codeStr.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
    return questions.find(q => {
      const qCode = getQuestionCode(q, questions, blocks);
      const normalizedQCode = qCode.toLowerCase().replace(/\s/g, "");
      return normalizedQCode === normalizedCode;
    });
  }

  const evaluatePreviewFormula = (formulaStr, currentValues, idx = null) => {
    if (!formulaStr) return "";
    let evalStr = formulaStr;

    const extractNumbers = (raw) => {
      if (raw === undefined || raw === null || raw === "") return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(x => {
            if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
            if (typeof x === 'string' && x.startsWith('{')) {
              try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
            }
            return parseFloat(x);
          }).filter(x => !isNaN(x));
        } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          const n = parseFloat(parsed.value);
          return isNaN(n) ? [] : [n];
        } else {
          const n = parseFloat(parsed);
          return isNaN(n) ? [] : [n];
        }
      } catch (e) {
        const n = parseFloat(raw);
        return isNaN(n) ? [] : [n];
      }
    };

    const getLoopValueFromValues = (qId, idx) => {
      const raw = currentValues[qId];
      const targetQ = questions.find(x => x.id === qId);
      const isSerialNumber = targetQ && targetQ.type === 'number' && (
        targetQ.label.toLowerCase().includes('no. urut') ||
        targetQ.label.toLowerCase().includes('nomor urut') ||
        targetQ.label.toLowerCase().includes('no urut')
      ) && isQuestionInLoop(targetQ);

      if (!raw) {
        return isSerialNumber ? String(idx + 1) : "";
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const val = parsed[idx];
          if (isSerialNumber && (val === undefined || val === null || val === '')) {
            return String(idx + 1);
          }
          return val !== undefined && val !== null ? val : (isSerialNumber ? String(idx + 1) : "");
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.hasOwnProperty('value')) {
            return idx === 0 ? raw : "";
          }
          const val = parsed[idx];
          if (isSerialNumber && (val === undefined || val === null || val === '')) {
            return String(idx + 1);
          }
          return val !== undefined && val !== null ? val : "";
        }
      } catch (e) { }
      if (isSerialNumber && idx > 0) {
        return String(idx + 1);
      }
      return idx === 0 ? raw : "";
    };

    // 1. Handle AGE function (e.g. AGE(R410))
    const ageRegex = /AGE\((R[0-9a-zA-Z.]+)\)/gi;
    evalStr = evalStr.replace(ageRegex, (match, code) => {
      const targetQ = findQuestionByCode(code);
      if (!targetQ) return "0";

      let birthDateStr = "";
      if (idx !== null) {
        birthDateStr = getLoopValueFromValues(targetQ.id, idx);
      } else {
        birthDateStr = currentValues[targetQ.id] || "";
      }

      if (!birthDateStr) return "0";

      if (birthDateStr.trim().startsWith('{') || birthDateStr.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(birthDateStr);
          if (Array.isArray(parsed)) {
            birthDateStr = parsed[0] || "";
          } else if (parsed && parsed.value) {
            birthDateStr = parsed.value;
          }
        } catch (e) { }
      }

      const birthDate = new Date(birthDateStr);
      if (isNaN(birthDate.getTime())) return "0";
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return String(age >= 0 ? age : 0);
    });

    // 2. Handle aggregation functions on loop/array values: e.g. MAX(R401)
    const funcRegex = /(MAX|MIN|SUM|AVG|COUNT)\((R[0-9a-zA-Z.]+)\)/gi;
    evalStr = evalStr.replace(funcRegex, (match, op, code) => {
      const targetQ = findQuestionByCode(code);
      if (!targetQ) return "0";

      const targetQVal = parseValidation(targetQ.val || targetQ.validation);
      const isTargetLoop = targetQVal.isLoop || !!targetQ.parent_id || !!targetQ.parentId || !!targetQVal.loop_group;

      let numbers = [];
      if (isTargetLoop) {
        const loopCount = getQuestionLoopCount(targetQ);
        if (loopCount > 0) {
          for (let i = 0; i < loopCount; i++) {
            const val = getLoopValueFromValues(targetQ.id, i);
            const num = parseFloat(val);
            if (!isNaN(num)) {
              numbers.push(num);
            }
          }
        }
      } else {
        numbers = extractNumbers(currentValues[targetQ.id]);
      }

      if (numbers.length === 0 && (targetQ.val || targetQ.validation)) {
        try {
          const vParsed = JSON.parse(targetQ.val || targetQ.validation);
          if (vParsed && vParsed.loop_group) {
            const groupQs = questions.filter(x => {
              const valStr = x.val || x.validation;
              if (!valStr) return false;
              try { const p = JSON.parse(valStr); return p && p.loop_group === vParsed.loop_group; }
              catch (e) { return false; }
            });
            groupQs.forEach(gq => {
              numbers = numbers.concat(extractNumbers(currentValues[gq.id]));
            });
          }
        } catch (e) { }
      }

      if (numbers.length === 0) return "0";
      switch (op.toUpperCase()) {
        case "MAX": return String(Math.max(...numbers));
        case "MIN": return String(Math.min(...numbers));
        case "SUM": return String(numbers.reduce((a, b) => a + b, 0));
        case "AVG": return String(numbers.reduce((a, b) => a + b, 0) / numbers.length);
        case "COUNT": return String(numbers.length);
        default: return "0";
      }
    });

    const codeRegex = /R[0-9a-zA-Z.]+/g;
    const codes = evalStr.match(codeRegex) || [];

    for (const code of codes) {
      const targetQ = findQuestionByCode(code);
      if (targetQ) {
        let val = "";
        if (idx !== null) {
          val = getLoopValueFromValues(targetQ.id, idx);
        } else {
          val = currentValues[targetQ.id] || "0";
        }
        let valNum = parseFloat(val);
        if (isNaN(valNum)) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              const numbers = parsed.map(x => {
                if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
                if (typeof x === 'string' && x.startsWith('{')) {
                  try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
                }
                return parseFloat(x);
              }).filter(x => !isNaN(x));
              valNum = numbers.length > 0 ? Math.max(...numbers) : 0;
            } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
              valNum = parseFloat(parsed.value);
            }
          } catch (e) {
            valNum = 0;
          }
        }
        evalStr = evalStr.replace(new RegExp(code, 'g'), isNaN(valNum) ? "0" : String(valNum));
      } else {
        evalStr = evalStr.replace(new RegExp(code, 'g'), "0");
      }
    }

    try {
      const result = new Function(`return (${evalStr})`)();
      return isNaN(result) ? "0" : String(result);
    } catch (e) {
      return "0";
    }
  };

  useEffect(() => {
    if (!showPreview) return;
    const formulaQs = questions.filter(q => {
      const qVal = parseValidation(q.val || q.validation);
      return qVal && qVal.formula;
    });

    if (formulaQs.length === 0) return;
    if (isEvaluatingPreviewRef.current) return;

    isEvaluatingPreviewRef.current = true;

    let updated = false;
    const newValues = { ...previewAnswers };

    formulaQs.forEach(q => {
      const qVal = parseValidation(q.val || q.validation);
      if (qVal && qVal.formula) {
        const isLoop = qVal.isLoop || !!q.parent_id || !!q.parentId || !!qVal.loop_group;
        if (isLoop) {
          const loopCount = getQuestionLoopCount(q);
          const computedArray = [];
          for (let idx = 0; idx < loopCount; idx++) {
            computedArray.push(evaluatePreviewFormula(qVal.formula, newValues, idx));
          }
          const computedStr = JSON.stringify(computedArray);
          if (newValues[q.id] !== computedStr) {
            newValues[q.id] = computedStr;
            updated = true;
          }
        } else {
          const computedVal = evaluatePreviewFormula(qVal.formula, newValues);
          if (newValues[q.id] !== computedVal) {
            newValues[q.id] = computedVal;
            updated = true;
          }
        }
      }
    });

    if (updated) {
      setPreviewAnswers(newValues);
    }
    isEvaluatingPreviewRef.current = false;
  }, [previewAnswers, showPreview, questions, getQuestionLoopCount]);

  const evaluateCondition = (c, values) => {
    const val = values[c.question_id];
    if (c.operator && ['=', '>', '>=', '<', '<='].includes(c.operator)) {
      if (val === undefined || val === null || val === '') return false;
      let actualVal = val;
      if (typeof val === 'string' && val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && 'value' in parsed) {
            actualVal = parsed.value;
          }
        } catch (e) { }
      }
      const numericVal = parseFloat(actualVal);
      const targetVal = parseFloat(c.value);
      if (isNaN(numericVal) || isNaN(targetVal)) return false;
      switch (c.operator) {
        case '=': return numericVal === targetVal;
        case '>': return numericVal > targetVal;
        case '>=': return numericVal >= targetVal;
        case '<': return numericVal < targetVal;
        case '<=': return numericVal <= targetVal;
        default: return false;
      }
    }
    const triggerOptions = String(c.value).split(",").map(x => x.trim()).filter(Boolean);
    return checkOptionTrigger(val, triggerOptions);
  };

  function getManualLoopCount(q) {
    if (!q) return null;
    let loopGroupName = "";
    const qValStr = q.val || q.validation;
    if (qValStr) {
      try {
        const parsed = JSON.parse(qValStr);
        if (parsed && parsed.loop_group) {
          loopGroupName = parsed.loop_group;
        }
      } catch (e) { }
    }

    if (loopGroupName) {
      const groupQs = questions.filter(x => {
        if (x.blok_id !== q.blok_id) return false;
        const v = x.val || x.validation;
        if (!v) return false;
        try {
          const parsed = JSON.parse(v);
          return parsed && parsed.loop_group === loopGroupName;
        } catch (e) {
          return false;
        }
      });
      const masterQ = groupQs.find(x => {
        const v = x.val || x.validation;
        if (!v) return false;
        try {
          const parsed = JSON.parse(v);
          return parsed && parsed.is_loop && parsed.loop_type === "manual";
        } catch (e) {
          return false;
        }
      }) || groupQs[0];

      if (masterQ && masterQ.id !== q.id) {
        return getManualLoopCount(masterQ);
      }

      for (const gq of groupQs) {
        const savedCount = previewAnswers[`${gq.id}_loop_count`];
        if (savedCount) {
          const parsed = parseInt(savedCount, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            return parsed;
          }
        }
      }

      let maxArrayLength = 1;
      let maxFilledCount = 1;
      for (const gq of groupQs) {
        const raw = previewAnswers[gq.id];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              if (parsed.length > maxArrayLength) {
                maxArrayLength = parsed.length;
              }
              const filledCount = parsed.filter(v => v !== undefined && v !== null && v !== "" && v !== 0).length;
              if (filledCount > maxFilledCount) {
                maxFilledCount = filledCount;
              }
            }
          } catch (e) { }
        }
      }
      return Math.max(maxArrayLength, maxFilledCount, 1);
    }

    const { isLoop, loopType } = parseValidation(q.val || q.validation);
    if (isLoop && loopType === "manual") {
      const savedCount = previewAnswers[`${q.id}_loop_count`];
      if (savedCount) {
        const parsed = parseInt(savedCount, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed;
        }
      }
      const raw = previewAnswers[q.id];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filledCount = parsed.filter(v => v !== undefined && v !== null && v !== "" && v !== 0).length;
            if (filledCount > 1) {
              return filledCount;
            }
            if (parsed.length > 1) {
              return parsed.length;
            }
          }
        } catch (e) { }
      }
      return 1;
    }

    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questions.find(p => p.id === parentId);
      if (parent) {
        return getManualLoopCount(parent);
      }
    }
    return null;
  }

  function getQuestionLoopCount(q) {
    if (!q) return 1;

    let loopGroupName = "";
    const qValStr = q.val || q.validation;
    if (qValStr) {
      try {
        const parsed = JSON.parse(qValStr);
        if (parsed && parsed.loop_group) {
          loopGroupName = parsed.loop_group;
        }
      } catch (e) { }
    }

    const { isLoop, loopType, loopByQuestionId } = parseValidation(q.val || q.validation);
    const isLoopQ = isLoop || !!loopGroupName;

    if (!isLoopQ) {
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (parent) {
          return getQuestionLoopCount(parent);
        }
      }
    }

    if (loopGroupName) {
      const groupQs = questions.filter(x => {
        if (x.blok_id !== q.blok_id) return false;
        const v = x.val || x.validation;
        if (!v) return false;
        try {
          const parsed = JSON.parse(v);
          return parsed && parsed.loop_group === loopGroupName;
        } catch (e) {
          return false;
        }
      });
      const masterQ = groupQs.find(x => {
        const v = x.val || x.validation;
        if (!v) return false;
        try {
          const parsed = JSON.parse(v);
          return parsed && parsed.is_loop;
        } catch (e) {
          return false;
        }
      }) || groupQs[0];

      if (masterQ && masterQ.id !== q.id) {
        return getQuestionLoopCount(masterQ);
      }
    }

    if (isLoop) {
      if (loopByQuestionId) {
        let triggerValue = previewAnswers[loopByQuestionId];
        if (typeof triggerValue === 'string' && triggerValue.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(triggerValue);
            if (Array.isArray(arr)) triggerValue = arr[0];
          } catch (e) { }
        }
        const parsedTrigger = parseInt(triggerValue, 10);
        return isNaN(parsedTrigger) ? 0 : Math.max(0, parsedTrigger);
      }
      if (loopType === "manual") {
        const manualCount = getManualLoopCount(q);
        return manualCount !== null ? manualCount : 1;
      }
    }
    return 1;
  }

  const getLoopValue = (qId, idx) => {
    const raw = previewAnswers[qId];
    const q = questions.find(x => x.id === qId);
    const isSerialNumber = q && q.type === 'number' && (
      q.label.toLowerCase().includes('no. urut') ||
      q.label.toLowerCase().includes('nomor urut') ||
      q.label.toLowerCase().includes('no urut')
    ) && isQuestionInLoop(q);

    if (!raw) {
      return isSerialNumber ? String(idx + 1) : "";
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const val = parsed[idx];
        if (isSerialNumber && (val === undefined || val === null || val === '')) {
          return String(idx + 1);
        }
        return val !== undefined && val !== null ? val : (isSerialNumber ? String(idx + 1) : "");
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.hasOwnProperty('value')) {
          return idx === 0 ? raw : "";
        }
        const val = parsed[idx];
        if (isSerialNumber && (val === undefined || val === null || val === '')) {
          return String(idx + 1);
        }
        return val !== undefined && val !== null ? val : "";
      }
    } catch (e) { }
    if (isSerialNumber && idx > 0) {
      return String(idx + 1);
    }
    return idx === 0 ? raw : "";
  };

  const handleUpdateLoopValue = (qId, idx, val) => {
    const raw = previewAnswers[qId];
    let parsed = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          parsed = [raw];
        }
      } catch (e) {
        parsed = [raw];
      }
    }
    parsed[idx] = val;
    setPreviewAnswers(p => ({
      ...p,
      [qId]: JSON.stringify(parsed)
    }));
  };

  const handleAddManualLoop = (qId) => {
    const currentCount = previewAnswers[`${qId}_loop_count`] ? parseInt(previewAnswers[`${qId}_loop_count`], 10) : 1;
    const newCount = currentCount + 1;
    const newValues = { ...previewAnswers, [`${qId}_loop_count`]: newCount };

    const q = questions.find(x => x.id === qId);
    if (q) {
      let loopGroupName = "";
      const qValStr = q.val || q.validation;
      if (qValStr) {
        try {
          const parsed = JSON.parse(qValStr);
          if (parsed && parsed.loop_group) {
            loopGroupName = parsed.loop_group;
          }
        } catch (e) { }
      }

      if (loopGroupName) {
        const groupQs = questions.filter(x => {
          const v = x.val || x.validation;
          if (!v) return false;
          try {
            const parsed = JSON.parse(v);
            return parsed && parsed.loop_group === loopGroupName;
          } catch (e) {
            return false;
          }
        });
        for (const gq of groupQs) {
          newValues[`${gq.id}_loop_count`] = newCount;
          const raw = previewAnswers[gq.id];
          const isSerialNumber = gq.type === 'number' && (
            gq.label.toLowerCase().includes('no. urut') ||
            gq.label.toLowerCase().includes('nomor urut') ||
            gq.label.toLowerCase().includes('no urut')
          );
          if (isSerialNumber) {
            let parsed = [];
            if (raw) {
              try {
                parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                  parsed = [raw];
                }
              } catch (e) {
                parsed = [raw];
              }
            }
            while (parsed.length < newCount) {
              parsed.push(String(parsed.length + 1));
            }
            newValues[gq.id] = JSON.stringify(parsed);
          }
        }
      }
    }
    setPreviewAnswers(newValues);
  };

  const handleRemoveManualLoop = (qId, currentCount) => {
    const newCount = Math.max(1, currentCount - 1);
    const updatedValues = { ...previewAnswers };
    updatedValues[`${qId}_loop_count`] = newCount;

    const q = questions.find(x => x.id === qId);
    if (q) {
      let loopGroupName = "";
      const qValStr = q.val || q.validation;
      if (qValStr) {
        try {
          const parsed = JSON.parse(qValStr);
          if (parsed && parsed.loop_group) {
            loopGroupName = parsed.loop_group;
          }
        } catch (e) { }
      }

      if (loopGroupName) {
        const groupQs = questions.filter(x => {
          const v = x.val || x.validation;
          if (!v) return false;
          try {
            const parsed = JSON.parse(v);
            return parsed && parsed.loop_group === loopGroupName;
          } catch (e) {
            return false;
          }
        });
        for (const gq of groupQs) {
          updatedValues[`${gq.id}_loop_count`] = newCount;
        }
      }
    }

    const childQs = questions.filter(c => c.parent_id === qId || c.parentId === qId);
    const targetQIds = [qId, ...childQs.map(c => c.id)];

    for (const id of targetQIds) {
      const raw = previewAnswers[id];
      if (raw) {
        try {
          let parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length > newCount) {
              parsed = parsed.slice(0, newCount);
            }
            updatedValues[id] = JSON.stringify(parsed);
          }
        } catch (e) { }
      }
    }
    setPreviewAnswers(updatedValues);
  };

  const handleValueChange = (q, val, idx = 0, instancesLength = 1) => {
    setPreviewAnswers(prev => {
      const newValues = { ...prev };

      const qValStr = q.val || q.validation;
      let isTargetLoop = false;
      if (qValStr && qValStr.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(qValStr);
          isTargetLoop = !!parsed.is_loop || !!parsed.loop_group;
        } catch (e) { }
      }
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const checkParentLoop = (pId) => {
          const parent = questions.find(p => p.id === pId);
          if (!parent) return false;
          const pValStr = parent.val || parent.validation;
          if (pValStr && pValStr.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(pValStr);
              if (parsed.is_loop || parsed.loop_group) return true;
            } catch (e) { }
          }
          const nextParentId = parent.parent_id || parent.parentId;
          return nextParentId ? checkParentLoop(nextParentId) : false;
        };
        if (checkParentLoop(parentId)) {
          isTargetLoop = true;
        }
      }

      if (instancesLength > 1 || isTargetLoop) {
        const raw = prev[q.id];
        let parsed = [];
        if (raw) {
          try {
            parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
              parsed = [raw];
            }
          } catch (e) {
            parsed = [raw];
          }
        }
        parsed[idx] = val;
        newValues[q.id] = JSON.stringify(parsed);
      } else {
        newValues[q.id] = val;
      }
      return newValues;
    });
  };

  const resolveDynamicOptions = (q) => {
    let qVal = null;
    const qValStr = q.val || q.validation;
    try {
      qVal = JSON.parse(qValStr || "{}");
    } catch (e) { }

    if (qVal && qVal.options_source_question_id) {
      const sourceQId = qVal.options_source_question_id;
      const val = previewAnswers[sourceQId];
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            return parsed.map((name, idx) => ({
              value: String(idx + 1),
              label: `${idx + 1}. ${name}`
            })).filter(o => o.label && o.label.trim() !== "");
          }
        } catch (e) { }
        return [{ value: "1", label: `1. ${val}` }];
      }
      return [];
    }

    let rawOpts = [];
    if (q.options) {
      if (Array.isArray(q.options)) {
        rawOpts = q.options;
      } else if (typeof q.options === 'string') {
        try {
          rawOpts = JSON.parse(q.options);
        } catch (e) {
          rawOpts = q.options.split(',').map(o => o.trim());
        }
      }
    }

    return rawOpts.map(opt => {
      if (opt && typeof opt === 'object') {
        return {
          value: opt.value || "",
          label: opt.label || opt.value || "",
          is_other: !!opt.is_other
        };
      }
      const optStr = String(opt);
      const dotIndex = optStr.indexOf('.');
      if (dotIndex > 0) {
        const valPart = optStr.substring(0, dotIndex).trim();
        const lblPart = optStr.substring(dotIndex + 1).trim();
        if (!isNaN(valPart)) {
          return { value: valPart, label: lblPart, is_other: lblPart.toLowerCase().includes('lainnya') };
        }
      }
      return { value: optStr, label: optStr, is_other: optStr.toLowerCase().includes('lainnya') };
    });
  };

  const getResolvedValuesForIndex = (values, idx) => {
    if (idx === null) return values;
    const resolved = {};
    for (const qId in values) {
      const raw = values[qId];
      if (raw && typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
          } else if (typeof parsed === 'object' && parsed !== null) {
            if ('value' in parsed) {
              resolved[qId] = parsed.value !== undefined && parsed.value !== null ? parsed.value : "";
            } else {
              resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
            }
          } else {
            resolved[qId] = raw;
          }
        } catch (e) {
          resolved[qId] = raw;
        }
      } else {
        resolved[qId] = raw;
      }
    }
    return resolved;
  };

  const resolveLabelText = (labelText, activeInstanceIdx) => {
    if (!labelText) return "";
    const placeholderRegex = /\{([a-zA-Z0-9.]+)\}|\$([a-zA-Z0-9.]+)/g;
    return labelText.replace(placeholderRegex, (match, p1, p2) => {
      const code = p1 || p2;
      if (!code) return match;
      const cleanCode = code.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
      const targetQ = questions.find(x => {
        const qCode = getQuestionCode(x, questions, blocks);
        return qCode && qCode.toLowerCase().replace(/\s/g, "") === cleanCode;
      });
      if (!targetQ) return match;
      const resolvedValues = getResolvedValuesForIndex(previewAnswers, activeInstanceIdx);
      const val = resolvedValues[targetQ.id];
      return val !== undefined && val !== null && val !== "" ? val : match;
    });
  };

  const isQuestionVisibleIgnoreBlock = (q, activeInstanceIdx = null) => {
    const resolvedValues = getResolvedValuesForIndex(previewAnswers, activeInstanceIdx);
    const showIfValue = q.show_if_value || q.showIfValue;
    if (showIfValue) {
      let matchesShowIf = true;
      let isJson = false;
      try {
        const parsed = JSON.parse(showIfValue);
        if (parsed && parsed.conditions) {
          isJson = true;
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
          matchesShowIf = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) { }

      if (isJson) {
        if (!matchesShowIf) {
          return false;
        }
      } else {
        const showIfParentId = q.show_if_parent_id || q.showIfParentId;
        if (showIfParentId) {
          const parentVal = resolvedValues[showIfParentId];
          const triggerOptions = String(showIfValue).split(",").map(x => x.trim()).filter(Boolean);
          if (!checkOptionTrigger(parentVal, triggerOptions)) {
            return false;
          }
        }
      }
    }

    const allOrdered = [];
    blocks.forEach(b => {
      const blockQs = questions.filter(x => x.blokId === b.id || x.blok_id === b.dbId);
      const mainQs = blockQs.filter(x => !x.parentId && !x.parent_id);
      const addChildrenRecursive = (parentId) => {
        const children = blockQs.filter(x => (x.parentId === parentId || x.parent_id === parentId))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        children.forEach(child => {
          allOrdered.push(child);
          addChildrenRecursive(child.id);
        });
      };
      mainQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      mainQs.forEach(parent => {
        allOrdered.push(parent);
        addChildrenRecursive(parent.id);
      });
    });

    const skippers = questions.filter(quest => quest.skipTarget && quest.skip !== undefined && quest.skip !== null);

    for (const skipper of skippers) {
      let matchesTrigger = false;
      try {
        const parsed = JSON.parse(skipper.skip);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
          matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {
        const skipperVal = resolvedValues[skipper.id];
        const triggerOptions = String(skipper.skip).split(",").map(x => x.trim()).filter(Boolean);
        matchesTrigger = checkOptionTrigger(skipperVal, triggerOptions);
      }

      const skipperIdx = allOrdered.findIndex(x => x.id === skipper.id);
      let targetQ = questions.find(x => String(x.id) === String(skipper.skipTarget));
      if (!targetQ) {
        const normalizedTarget = String(skipper.skipTarget).toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
        targetQ = questions.find(x => {
          const qCode = getQuestionCode(x, questions, blocks);
          return qCode && qCode.toLowerCase().replace(/\s/g, "") === normalizedTarget;
        });
      }

      const targetIdx = targetQ ? allOrdered.findIndex(x => x.id === targetQ.id) : -1;
      const currentIdx = allOrdered.findIndex(x => x.id === q.id);

      if (q.id === skipper.id) {
        // Skipper is visible
      } else if (targetQ && q.id === targetQ.id) {
        // Target is visible
      } else if (matchesTrigger && skipperIdx !== -1 && targetIdx !== -1 && currentIdx !== -1) {
        if (currentIdx > skipperIdx && currentIdx < targetIdx) {
          return false;
        }
      }
    }

    return true;
  };

  const isQuestionVisible = (q, activeInstanceIdx = null) => {
    return isQuestionVisibleIgnoreBlock(q, activeInstanceIdx);
  };

  const handleOpenPreview = () => {
    setPreviewActiveBlok(activeBlok || (blocks[0]?.id || ""));
    setPreviewAnswers({});
    setShowPreview(true);
  };

  const renderPreviewInputs = (q, rawInstances, activeInstanceIdx = null) => {
    const instances = activeInstanceIdx !== null ? [activeInstanceIdx] : rawInstances;
    const isTextType = q.type === 'text';
    const isNumberType = q.type === 'number';
    const isTextAreaType = q.type === 'textarea';
    const isChoiceType = q.type === 'select' || q.type === 'radio';
    const isLocationType = q.type === 'location';
    const isDateType = q.type === 'date';
    const isPclType = q.type === 'pcl';
    const isPmlType = q.type === 'pml';
    const isSearchType = q.type === 'search';

    return (
      <>
        {isSearchType && (
          <div className="space-y-3">
            {instances.map((idx) => {
              const val = getLoopValue(q.id, idx);
              let isOtherSelected = false;
              let otherText = "";
              let otherOpt = null;
              let selectedVal = "";
              if (val !== undefined && val !== null && val !== '') {
                if (typeof val === 'string' && val.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(val);
                    selectedVal = String(parsed.value);
                    otherText = parsed.text || "";
                  } catch (e) { }
                } else {
                  selectedVal = String(val);
                }
              }
              if (selectedVal) {
                otherOpt = resolveDynamicOptions(q).find(o => String(o.value) === selectedVal && o.is_other);
                if (otherOpt) {
                  isOtherSelected = true;
                }
              }

              return (
                <div key={idx} className="space-y-1">
                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                  <SearchableSelect
                    value={val}
                    options={resolveDynamicOptions(q)}
                    placeholder="Cari dan pilih opsi..."
                    onChange={(selectedVal) => {
                      const opt = resolveDynamicOptions(q).find(o => String(o.value) === String(selectedVal));
                      const finalVal = opt && opt.is_other
                        ? JSON.stringify({ value: selectedVal, text: "" })
                        : selectedVal;
                      handleValueChange(q, finalVal, idx, instances.length);
                    }}
                  />
                  {isOtherSelected && otherOpt && (
                    <div className="space-y-1 mt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {otherOpt.label}</label>
                      <input
                        type="text"
                        value={otherText}
                        placeholder="Sebutkan..."
                        onChange={(e) => {
                          const newVal = JSON.stringify({ value: otherOpt.value, text: e.target.value });
                          handleValueChange(q, newVal, idx, instances.length);
                        }}
                        className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isPclType && (
          <div className="space-y-3">
            {instances.map((idx) => {
              const val = getLoopValue(q.id, idx) || "Nama Petugas (Simulator)";
              return (
                <div key={idx} className="space-y-1">
                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                  <input
                    type="text"
                    value={val}
                    disabled={true}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
              );
            })}
          </div>
        )}

        {isPmlType && (
          <div className="space-y-3">
            {instances.map((idx) => {
              const val = getLoopValue(q.id, idx) || "Pengawas Lapangan (Simulator)";
              return (
                <div key={idx} className="space-y-1">
                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                  <input
                    type="text"
                    value={val}
                    disabled={true}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
              );
            })}
          </div>
        )}

        {isTextType && (
          <div className="space-y-3">
            {instances.map((idx) => {
              const val = getLoopValue(q.id, idx);
              return (
                <div key={idx} className="space-y-1">
                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                  <input
                    type="text"
                    value={val}
                    placeholder={`Isi ${q.label}${instances.length > 1 ? ` ke-${idx + 1}` : ""}`}
                    onChange={(e) => {
                      handleValueChange(q, e.target.value.toUpperCase(), idx, instances.length);
                    }}
                    className="w-full px-4 py-3 text-sm bg-white border border-solid border-slate-205 rounded-xl outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              );
            })}
          </div>
        )}

        {isNumberType && (() => {
          const qVal = parseValidation(q.val || q.validation);
          const isFormula = !!qVal.formula;
          return (
            <div className="space-y-3">
              {instances.map((idx) => {
                const val = getLoopValue(q.id, idx);
                return (
                  <div key={idx} className="space-y-1">
                    {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400 block mb-1">Isian Ke-{idx + 1}</label>}
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-3 w-full">
                        {!isFormula && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = parseFloat(val) || 0;
                              const newVal = Math.max(0, currentVal - 1);
                              handleValueChange(q, String(newVal), idx, instances.length);
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-90 text-slate-600 flex items-center justify-center border border-solid border-slate-200 cursor-pointer font-bold transition-all text-lg flex-shrink-0"
                          >
                            -
                          </button>
                        )}
                        <div className="flex-1 flex items-center justify-between bg-white border border-solid border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="text"
                            value={val}
                            placeholder={isFormula ? "Kalkulasi otomatis..." : "Masukkan angka..."}
                            disabled={isFormula}
                            onChange={(e) => {
                              const inputVal = e.target.value;
                              if (inputVal === "" || inputVal === "-" || /^-?\d*\.?\d*$/.test(inputVal)) {
                                handleValueChange(q, inputVal, idx, instances.length);
                              }
                            }}
                            className="w-full border-0 bg-transparent py-1 outline-none text-sm font-semibold text-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-center"
                          />
                        </div>
                        {!isFormula && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = parseFloat(val) || 0;
                              const newVal = currentVal + 1;
                              handleValueChange(q, String(newVal), idx, instances.length);
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-90 text-slate-600 flex items-center justify-center border border-solid border-slate-200 cursor-pointer font-bold transition-all text-lg flex-shrink-0"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {isTextAreaType && (
          <div className="space-y-3">
            {instances.map((idx) => (
              <div key={idx} className="space-y-1">
                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                <textarea
                  value={getLoopValue(q.id, idx)}
                  placeholder={`Masukkan detail ${q.label}`}
                  onChange={(e) => {
                    handleValueChange(q, e.target.value, idx, instances.length);
                  }}
                  className="w-full h-20 p-3 border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {isChoiceType && (
          <div className="space-y-4">
            {instances.map((idx) => (
              <div key={idx} className="space-y-2">
                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400 block mb-1">Isian Ke-{idx + 1}</label>}
                <div className="grid grid-cols-2 gap-2">
                  {resolveDynamicOptions(q).map((opt) => {
                    let isSelected = false;
                    if (q.type === 'select') {
                      let selectedMap = {};
                      try {
                        const val = getLoopValue(q.id, idx);
                        selectedMap = JSON.parse(val || "{}");
                      } catch (e) { }
                      isSelected = !!selectedMap[opt.value];
                    } else {
                      const val = getLoopValue(q.id, idx);
                      if (val && typeof val === 'string' && val.trim().startsWith('{')) {
                        try {
                          const parsed = JSON.parse(val);
                          isSelected = String(parsed.value) === String(opt.value);
                        } catch (e) { }
                      } else {
                        isSelected = String(val) === String(opt.value);
                      }
                    }

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          if (q.type === 'select') {
                            let selectedMap = {};
                            try {
                              const val = getLoopValue(q.id, idx);
                              selectedMap = JSON.parse(val || "{}");
                            } catch (e) { }
                            if (selectedMap[opt.value]) {
                              delete selectedMap[opt.value];
                            } else {
                              selectedMap[opt.value] = opt.is_other ? "" : 1;
                            }
                            const valStr = JSON.stringify(selectedMap);
                            handleValueChange(q, valStr, idx, instances.length);
                          } else {
                            const val = opt.is_other
                              ? JSON.stringify({ value: opt.value, text: "" })
                              : opt.value;
                            handleValueChange(q, val, idx, instances.length);
                          }
                        }}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-solid text-xs font-medium transition-all text-left cursor-pointer ${isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                          : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50/50"
                          }`}
                      >
                        <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center transition-all ${q.type === 'select'
                          ? `rounded border-2 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200'}`
                          : `rounded-full border-2 ${isSelected ? 'border-blue-600' : 'border-slate-200'}`
                          }`}>
                          {isSelected && (
                            q.type === 'select'
                              ? <Check size={10} className="text-white stroke-[3px]" />
                              : <div className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        {opt.value}. {opt.label}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const val = getLoopValue(q.id, idx);
                  if (q.type === 'select') {
                    let selectedMap = {};
                    try {
                      selectedMap = JSON.parse(val || "{}");
                    } catch (e) { }
                    const otherOpts = resolveDynamicOptions(q).filter(o => o.is_other && selectedMap[o.value] !== undefined);
                    if (otherOpts.length === 0) return null;
                    return (
                      <div className="space-y-2 mt-2">
                        {otherOpts.map(opt => (
                          <div key={opt.value} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {opt.label}</label>
                            <input
                              type="text"
                              value={selectedMap[opt.value] === 1 || selectedMap[opt.value] === '1' ? "" : (selectedMap[opt.value] || "")}
                              placeholder="Sebutkan..."
                              onChange={(e) => {
                                selectedMap[opt.value] = e.target.value;
                                handleValueChange(q, JSON.stringify(selectedMap), idx, instances.length);
                              }}
                              className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    let isOtherSelected = false;
                    let otherText = "";
                    let otherOpt = null;
                    let selectedVal = "";
                    if (val !== undefined && val !== null && val !== '') {
                      if (typeof val === 'string' && val.trim().startsWith('{')) {
                        try {
                          const parsed = JSON.parse(val);
                          selectedVal = String(parsed.value);
                          otherText = parsed.text || "";
                        } catch (e) { }
                      } else {
                        selectedVal = String(val);
                      }
                    }
                    if (selectedVal) {
                      otherOpt = resolveDynamicOptions(q).find(o => String(o.value) === selectedVal && o.is_other);
                      if (otherOpt) {
                        isOtherSelected = true;
                      }
                    }
                    if (!isOtherSelected) return null;
                    return (
                      <div className="space-y-1 mt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {otherOpt.label}</label>
                        <input
                          type="text"
                          value={otherText}
                          placeholder="Sebutkan..."
                          onChange={(e) => {
                            const newVal = JSON.stringify({ value: otherOpt.value, text: e.target.value });
                            handleValueChange(q, newVal, idx, instances.length);
                          }}
                          className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                        />
                      </div>
                    );
                  }
                })()}
              </div>
            ))}
          </div>
        )}

        {isLocationType && (
          <div className="space-y-4">
            {instances.map((idx) => (
              <div key={idx} className="space-y-1">
                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getLoopValue(q.id, idx)}
                      placeholder="Latitude, Longitude (Klik 'Ambil Lokasi')"
                      readOnly
                      className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleValueChange(q, "-3.456789, 117.123456", idx, instances.length);
                      }}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold border-0 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <MapPin size={14} />
                      <span>Ambil Lokasi</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isDateType && (
          <div className="space-y-4">
            {instances.map((idx) => {
              let dateType = "date";
              let isAutoNow = false;
              const valStr = q.val || q.validation;
              if (valStr && valStr.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(valStr);
                  dateType = parsed.date_type || "date";
                  isAutoNow = !!parsed.auto_now;
                } catch (e) { }
              }

              const handleAutoNowClick = () => {
                const now = new Date();
                let valueToSet = "";
                if (dateType === "date") {
                  valueToSet = now.toISOString().split("T")[0];
                } else if (dateType === "datetime-local") {
                  const tzOffset = now.getTimezoneOffset() * 60000;
                  const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                  valueToSet = localISOTime;
                } else if (dateType === "time") {
                  const hours = String(now.getHours()).padStart(2, "0");
                  const minutes = String(now.getMinutes()).padStart(2, "0");
                  valueToSet = `${hours}:${minutes}`;
                }
                handleValueChange(q, valueToSet, idx, instances.length);
              };

              return (
                <div key={idx} className="space-y-1">
                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type={dateType}
                      value={getLoopValue(q.id, idx)}
                      onChange={(e) => {
                        handleValueChange(q, e.target.value, idx, instances.length);
                      }}
                      className="flex-1 px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                    />
                    {isAutoNow && (
                      <button
                        type="button"
                        onClick={handleAutoNowClick}
                        className="px-4 py-3 bg-blue-55 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-semibold border border-solid border-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Clock size={14} />
                        <span>Waktu Sekarang</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderPreviewQuestionRow = (q, depth = 0, forceCard = false, activeInstanceIdx = null) => {
    if (!isQuestionVisible(q, activeInstanceIdx)) return null;

    if (q.type === 'note') {
      let labelText = q.label || "";
      return (
        <div key={q.id} className="bg-amber-50/60 border border-solid border-amber-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-950 leading-relaxed break-words">
            {renderNoteText(labelText)}
          </p>
        </div>
      );
    }

    const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
    const hasChildren = childQs.length > 0;
    const { description, isLoop, loopType, subLabel } = parseValidation(q.val || q.validation);

    const loopCount = getQuestionLoopCount(q);
    if (loopCount <= 0) return null;
    const instances = Array.from({ length: loopCount }, (_, idx) => idx);

    const qCode = getQuestionCode(q, questions, blocks);
    const qVal = parseValidation(q.val || q.validation);
    const parentMode = qVal.parentMode || "label";

    if (hasChildren && parentMode === "empty") {
      return (
        <div key={q.id} className="space-y-4 w-full animate-fade-in">
          {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderPreviewQuestionRow(child, depth, forceCard, activeInstanceIdx))}
        </div>
      );
    }

    if (depth === 0 || forceCard) {
      return (
        <QCard
          key={q.id}
          r={qCode}
          label={resolveLabelText(q.label, activeInstanceIdx)}
          subLabel={q.type === 'number' && subLabel === 'Satuan Angka' ? null : subLabel}
          required={!!q.req}
          description={description}
        >
          {hasChildren ? (
            <div className="space-y-4">
              {parentMode === "original" && (
                <div className="mb-4">
                  {renderPreviewInputs(q, instances, activeInstanceIdx)}
                </div>
              )}
              {isLoop && activeInstanceIdx === null && (
                <div className="space-y-6 mt-4">
                  {instances.map((idx) => (
                    <div key={idx} className="p-4 bg-slate-50/50 rounded-xl border border-solid border-slate-200/50 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-solid border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Anggota / Data Ke-{idx + 1}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderPreviewQuestionRow(child, depth + 1, false, idx))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isLoop && activeInstanceIdx !== null && (
                <div className="space-y-4 mt-4">
                  {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderPreviewQuestionRow(child, depth + 1, false, activeInstanceIdx))}
                </div>
              )}
            </div>
          ) : (
            renderPreviewInputs(q, instances, activeInstanceIdx)
          )}

          {isLoop && loopType === "manual" && activeInstanceIdx === null && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-slate-100">
              <button
                type="button"
                onClick={() => handleAddManualLoop(q.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
              >
                <Plus size={14} />
                Tambah Isian
              </button>
              {loopCount > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveManualLoop(q.id, loopCount)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                >
                  <X size={14} />
                  Hapus Terakhir
                </button>
              )}
              <span className="text-xs text-slate-500 font-semibold ml-auto">
                Total: {loopCount} isian
              </span>
            </div>
          )}
        </QCard>
      );
    } else {
      return (
        <div key={q.id} className="space-y-2 py-2 border-b border-solid border-slate-50 last:border-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">R.{qCode}</span>
                {q.req && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Wajib</span>}
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1">{resolveLabelText(q.label, activeInstanceIdx)}</p>
              {subLabel && !(q.type === 'number' && subLabel === 'Satuan Angka') && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subLabel}</p>}
            </div>
          </div>
          <div className="pl-4 mt-2">
            {hasChildren ? (
              <div className="space-y-3">
                {parentMode === "original" && (
                  <div className="mb-3">
                    {renderPreviewInputs(q, instances, activeInstanceIdx)}
                  </div>
                )}
                <div className="border-l border-solid border-slate-200 pl-3 space-y-3">
                  {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderPreviewQuestionRow(child, depth + 1, false, activeInstanceIdx))}
                </div>
              </div>
            ) : (
              renderPreviewInputs(q, instances, activeInstanceIdx)
            )}

            {isLoop && loopType === "manual" && activeInstanceIdx === null && (
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dashed border-slate-100">
                <button
                  type="button"
                  onClick={() => handleAddManualLoop(q.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                >
                  <Plus size={12} />
                  Tambah Isian
                </button>
                {loopCount > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveManualLoop(q.id, loopCount)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                  >
                    <X size={12} />
                    Hapus Terakhir
                  </button>
                )}
                <span className="text-[11px] text-slate-500 font-semibold ml-auto">
                  Total: {loopCount} isian
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const renderPreviewQuestionWithChildren = (q, activeInstanceIdx = null) => {
    const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
    const hasChildren = childQs.length > 0;
    const qVal = parseValidation(q.val || q.validation);
    const { isLoop } = qVal;
    const parentMode = qVal.parentMode || "label";

    const shouldRenderParent = q.label && q.label.trim() !== "" && parentMode !== "empty";
    const parentEl = shouldRenderParent ? renderPreviewQuestionRow(q, 0, true, activeInstanceIdx) : null;

    if (hasChildren && (!isLoop || activeInstanceIdx !== null)) {
      const sortedChildren = childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const childrenEls = sortedChildren.flatMap(child => renderPreviewQuestionWithChildren(child, activeInstanceIdx));
      return parentEl ? [parentEl, ...childrenEls] : childrenEls;
    }

    return parentEl ? [parentEl] : [];
  };

  const isLoading = loading || localLoading;

  // Dynamic Block Creator States
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockType, setNewBlockType] = useState("standard"); // "standard" | "text"
  const [newBlockPosition, setNewBlockPosition] = useState("after"); // "after" | "start" | "end"
  const [isConfirmAddBlockOpen, setIsConfirmAddBlockOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);
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

  // States for Copy Questionnaire Modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceActivityId, setSourceActivityId] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState("");

  // State for dropdown menu
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // States for Block Copy-Paste feature
  const [copiedBlockId, setCopiedBlockId] = useState(null); // ID blok yang sedang di-copy
  const [pasteTarget, setPasteTarget] = useState(null);     // Blok tujuan paste (untuk confirm dialog)
  const [isPasting, setIsPasting] = useState(false);        // Loading state
  const [pasteToast, setPasteToast] = useState(null);       // Toast pesan

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
  const isPublished = activeActivity ? activeActivity.status === "published" : false;
  const canEdit = selectedProject && (isDraft || isPublished);
  // Allow drag-drop reordering for all activities (only affects sort_order, no data loss)
  const canDrag = selectedProject;

  // Fetch structure from backend API
  const fetchFormStructure = async () => {
    if (!selectedProject || !activeActivity) return;
    setLocalLoading(true);
    try {
      const res = await api.form.getStructure(activeActivity.id);
      if (res && res.success) {
        const mappedBlocks = sortBlocksNaturally(res.blocks.map(b => ({
          id: b.kode,
          dbId: b.id,
          title: b.title,
          sort_order: b.sort_order,
          hide_logic: b.hide_logic
        })));

        const mappedQuestions = res.questions.map(q => {
          const correspondingBlock = res.blocks.find(b => b.id === q.blok_id);
          let typeVal = q.type;
          if (q.type === 'select' && q.validation) {
            try {
              const parsed = JSON.parse(q.validation);
              if (parsed.is_search) {
                typeVal = 'search';
              }
            } catch (e) { }
          }
          // Debug: Log validation for loop/group questions
          if (q.validation && q.validation.includes('is_loop')) {
            console.log('[fetchFormStructure] Loop question found:', { id: q.id, validation: q.validation.substring(0, 150) });
          }
          return {
            id: q.id,
            label: q.label,
            type: typeVal,
            req: !!q.required,
            val: q.validation,
            skip: q.skip_logic,
            blokId: correspondingBlock ? correspondingBlock.kode : "",
            blok_id: q.blok_id, // Preserve original blok_id for PetugasQuestionnaire compatibility
            parentId: q.parent_id,
            skipTarget: q.skip_target,
            showIfParentId: q.show_if_parent_id,
            showIfValue: q.show_if_value,
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
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    fetchFormStructure();
  }, [selectedProject, activeActivity]);



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

          newArrows.push({
            id: q.id,
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            sourceCode: getQuestionCode(q, questions, blocks),
            targetCode: getQuestionCode(questions.find(t => t.id === q.skipTarget), questions, blocks)
          });
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

  const typeIcon = { text: Type, number: Hash, radio: List, select: ChevronDown, location: MapPin, note: StickyNote, date: Calendar, pcl: User, pml: Users };

  // Add block logic
  const handleConfirmAddBlock = async () => {
    if (!newBlockTitle.trim() || !activeActivity) return;
    try {
      const activeIdx = blocks.findIndex(b => b.id === activeBlok);

      let nextSortOrder = blocks.length;
      if (newBlockPosition === "start") {
        nextSortOrder = blocks.length > 0 ? (blocks[0].sort_order || 0) - 1 : 0;
      } else if (newBlockPosition === "end") {
        nextSortOrder = blocks.length > 0 ? (blocks[blocks.length - 1].sort_order || 0) + 1 : 0;
      } else {
        nextSortOrder = activeIdx !== -1 ? (blocks[activeIdx].sort_order || 0) + 0.5 : blocks.length;
      }

      let kode, title;
      if (newBlockType === "text") {
        kode = newBlockTitle.trim().substring(0, 20);
        title = "(Blok Teks)";
      } else {
        const standardBlocks = blocks.filter(b => b.id.startsWith("Blok "));
        const nextRoman = getRoman(standardBlocks.length + 1);
        kode = `Blok ${nextRoman}`;
        title = newBlockTitle.trim();
      }

      await api.form.createBlock({
        kegiatan_id: activeActivity.id,
        kode: kode,
        title: title,
        sort_order: nextSortOrder
      });

      await fetchFormStructure();
      setActiveBlok(kode);
      setNewBlockTitle("");
      setNewBlockType("standard");
      setNewBlockPosition("after");
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
        sort_order: block.sort_order,
        hide_logic: block.hide_logic
      });
      await fetchFormStructure();
      setEditingBlockId(null);
    } catch (err) {
      alert("Gagal mengupdate blok: " + err.message);
    }
  };

  const handleUpdateBlockHideLogic = async (hideLogic) => {
    const block = blocks.find(b => b.id === activeBlok);
    if (!block) return;

    // Update local state first
    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const updatedBlocks = current.blocks.map(b => b.id === activeBlok ? { ...b, hide_logic: hideLogic } : b);
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          blocks: updatedBlocks
        }
      };
    });

    try {
      await api.form.updateBlock(block.dbId, {
        kode: block.id,
        title: block.title,
        sort_order: block.sort_order,
        hide_logic: hideLogic
      });
    } catch (err) {
      console.error("Gagal mengupdate hide logic blok:", err);
    }
  };

  const handleUpdateBlockTitle = async (title) => {
    const block = blocks.find(b => b.id === activeBlok);
    if (!block) return;

    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const updatedBlocks = current.blocks.map(b => b.id === activeBlok ? { ...b, title } : b);
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          blocks: updatedBlocks
        }
      };
    });

    try {
      await api.form.updateBlock(block.dbId, {
        kode: block.id,
        title: title,
        sort_order: block.sort_order,
        hide_logic: block.hide_logic
      });
    } catch (err) {
      console.error("Gagal mengupdate judul blok:", err);
    }
  };

  // Add question
  const addQ = async () => {
    if (!newQ.label || !activeActivity) return;
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      const blockQs = questions.filter(q => q.blokId === activeBlok);
      let sortOrder = blockQs.length;
      if (insertMode === 'after_selected' && selectedId) {
        const selectedIdx = blockQs.findIndex(q => q.id === selectedId);
        if (selectedIdx >= 0) {
          sortOrder = blockQs[selectedIdx].sort_order + 0.5;
        }
      }

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
  const handleDeleteQuestion = (id) => {
    setQuestionToDelete(id);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await api.form.deleteQuestion(questionToDelete);
      await fetchFormStructure();
      setSelectedId(null);
      setQuestionToDelete(null);
    } catch (err) {
      alert("Gagal menghapus pertanyaan: " + err.message);
    }
  };

  const handleUpdateQuestion = async (keyOrUpdates, value) => {
    const isObject = typeof keyOrUpdates === 'object' && keyOrUpdates !== null;
    const updates = isObject ? keyOrUpdates : { [keyOrUpdates]: value };

    const questionObj = questions.find(q => q.id === selectedId);
    if (!questionObj) return;

    const blockObj = blocks.find(b => b.id === questionObj.blokId);
    if (!blockObj) return;

    // Ensure blok_id is included in updates for consistency
    const updatesWithBlokId = {
      ...updates,
      blok_id: blockObj.dbId
    };

    // Update locally first for smooth inputs
    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const updated = current.questions.map(q => q.id === selectedId ? { ...q, ...updatesWithBlokId } : q);
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          questions: updated
        }
      };
    });

    const freshQuestion = { ...questionObj, ...updatesWithBlokId };

    let finalType = freshQuestion.type;
    let finalVal = freshQuestion.val;

    // Preserve ALL validation properties when updating
    // This ensures loop_group, loop_type, is_loop, etc. are not lost
    if (freshQuestion.type === 'search') {
      finalType = 'select';
      let parsed = {};
      try {
        if (freshQuestion.val && freshQuestion.val.trim().startsWith('{')) {
          parsed = JSON.parse(freshQuestion.val);
        }
      } catch (e) { }
      parsed.is_search = true;
      finalVal = JSON.stringify(parsed);
    } else {
      let parsed = {};
      try {
        if (freshQuestion.val && freshQuestion.val.trim().startsWith('{')) {
          parsed = JSON.parse(freshQuestion.val);
          if (parsed.is_search) {
            delete parsed.is_search;
            finalVal = JSON.stringify(parsed);
          } else {
            // No changes needed, preserve original
            finalVal = freshQuestion.val;
          }
        } else {
          // Non-JSON validation (like "range: 0-99"), preserve as-is
          finalVal = freshQuestion.val;
        }
      } catch (e) {
        // If JSON parsing fails, preserve original value
        console.warn('[handleUpdateQuestion] Failed to parse validation JSON, preserving original:', freshQuestion.val);
        finalVal = freshQuestion.val;
      }
    }

    const dbPayload = {
      blok_id: blockObj.dbId,
      parent_id: freshQuestion.parentId,
      label: freshQuestion.label,
      type: finalType,
      required: freshQuestion.req,
      options: freshQuestion.options,
      validation: finalVal,
      skip_logic: freshQuestion.skip,
      skip_target: freshQuestion.skipTarget,
      show_if_parent_id: freshQuestion.showIfParentId,
      show_if_value: freshQuestion.showIfValue,
      sort_order: freshQuestion.sort_order
    };

    // Debug: Log validation content to ensure loop/group data is preserved
    console.log('[handleUpdateQuestion] questionId:', selectedId, '| validation length:', finalVal ? finalVal.length : 0, '| preview:', finalVal ? finalVal.substring(0, 150) : 'null');

    try {
      await api.form.updateQuestion(selectedId, dbPayload);
    } catch (err) {
      console.error("Gagal mengupdate pertanyaan:", err);
    }
  };

  const handleAddOption = (q, options) => {
    const nextIndex = options.length;
    const nextValue = (q.type === 'select' || q.type === 'search')
      ? String.fromCharCode(97 + nextIndex) // a, b, c...
      : String(nextIndex + 1); // 1, 2, 3...
    const newOptions = [...options, { value: nextValue, label: `Pilihan ${nextIndex + 1}` }];
    handleUpdateQuestion("options", newOptions);
  };

  const handleUpdateOptionLabel = (options, idx, label) => {
    const newOptions = options.map((opt, i) => i === idx ? { ...opt, label } : opt);
    handleUpdateQuestion("options", newOptions);
  };

  const handleToggleOptionOther = (options, idx) => {
    const newOptions = options.map((opt, i) => i === idx ? { ...opt, is_other: !opt.is_other } : opt);
    handleUpdateQuestion("options", newOptions);
  };

  const handleUpdateOptionValue = (options, idx, value) => {
    const newOptions = options.map((opt, i) => i === idx ? { ...opt, value } : opt);
    handleUpdateQuestion("options", newOptions);
  };

  const handleDeleteOption = (q, options, idx) => {
    const newOptions = options.filter((_, i) => i !== idx);
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

    // Gunakan getOrderedQuestionsInBlock agar konsisten dengan rendering
    const orderedBlockQs = getOrderedQuestionsInBlock(activeBlok, questions);
    const mainQs = orderedBlockQs.filter(q => !q.parentId);

    // Clone dan swap
    const updatedMainQs = [...mainQs];
    const [dragged] = updatedMainQs.splice(sourceIdx, 1);
    updatedMainQs.splice(targetIdx, 0, dragged);

    // Rekonstruksi block dengan children yang berada tepat setelah parent-nya
    const reconstructedBlockQs = [];
    updatedMainQs.forEach(parent => {
      reconstructedBlockQs.push(parent);
      const addChildren = (parentId) => {
        const children = orderedBlockQs.filter(q => q.parentId === parentId);
        children.forEach(child => {
          reconstructedBlockQs.push(child);
          addChildren(child.id);
        });
      };
      addChildren(parent.id);
    });

    // Update state secara optimistik agar UI tidak freeze
    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const newQuestions = current.questions.map(q => {
        const idx = reconstructedBlockQs.findIndex(rq => rq.id === q.id);
        if (idx !== -1) {
          return { ...q, sort_order: idx };
        }
        return q;
      });
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          questions: newQuestions
        }
      };
    });

    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      console.log('[handleDrop] Starting update for', reconstructedBlockQs.length, 'questions');
      const updatePromises = reconstructedBlockQs.map((q, i) => {
        if (!q.id) return Promise.resolve();
        return api.form.updateQuestion(q.id, {
          blok_id: activeBlockObj.dbId,
          parent_id: q.parentId,
          label: q.label,
          type: q.type,
          required: q.req,
          options: q.options,
          validation: q.val,
          skip_logic: q.skip,
          skip_target: q.skipTarget,
          show_if_parent_id: q.showIfParentId,
          show_if_value: q.showIfValue,
          sort_order: i
        });
      });
      await Promise.all(updatePromises);
      console.log('[handleDrop] All updates complete, fetching fresh data...');
      await fetchFormStructure();
      console.log('[handleDrop] Done!');
    } catch (err) {
      console.error("Gagal menyimpan urutan drag & drop:", err);
    }
  };

  /**
   * Sub-question drag: encoded as "parentId:siblingIndex" so that
   * drops are only allowed within the same parent group.
   */
  const handleSubDragStart = (e, parentId, siblingIdx) => {
    e.stopPropagation();
    e.dataTransfer.setData("sub-drag", `${parentId}:${siblingIdx}`);
  };

  const handleSubDrop = async (e, parentId, targetSiblingIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("sub-drag");
    if (!raw) return; // not a sub-drag event
    const [srcParentIdStr, srcIdxStr] = raw.split(":");
    const srcParentId = parseInt(srcParentIdStr, 10);
    const srcIdx = parseInt(srcIdxStr, 10);

    // Only allow drops within the same parent group
    if (srcParentId !== parentId) return;
    if (srcIdx === targetSiblingIdx) return;

    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    // Get siblings in sorted order
    const siblings = questions
      .filter(q => q.parentId === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const updated = [...siblings];
    const [moved] = updated.splice(srcIdx, 1);
    updated.splice(targetSiblingIdx, 0, moved);

    // Update state secara optimistik
    setProjectData(prev => {
      const current = prev[selectedProject] || { blocks: [], questions: [] };
      const newQuestions = current.questions.map(q => {
        const idx = updated.findIndex(rq => rq.id === q.id);
        if (idx !== -1) {
          return { ...q, sort_order: idx };
        }
        return q;
      });
      return {
        ...prev,
        [selectedProject]: {
          ...current,
          questions: newQuestions
        }
      };
    });

    try {
      const updatePromises = updated.map((q, i) => {
        return api.form.updateQuestion(q.id, {
          blok_id: activeBlockObj.dbId,
          parent_id: q.parentId,
          label: q.label,
          type: q.type,
          required: q.req,
          options: q.options,
          validation: q.val,
          skip_logic: q.skip,
          skip_target: q.skipTarget,
          show_if_parent_id: q.showIfParentId,
          show_if_value: q.showIfValue,
          sort_order: i
        });
      });
      await Promise.all(updatePromises);
      await fetchFormStructure();
    } catch (err) {
      console.error("Gagal menyimpan urutan sub drag & drop:", err);
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

  const handleImportQuestions = async () => {
    if (!uploadedFile || previewRows.length === 0 || !activeActivity) return;
    const activeBlockObj = blocks.find(b => b.id === activeBlok);
    if (!activeBlockObj) return;

    try {
      setIsUploading(true);
      const blockQs = questions.filter(q => q.blokId === activeBlok);
      let currentSortOrder = blockQs.length;

      for (const row of previewRows) {
        await api.form.createQuestion({
          blok_id: activeBlockObj.dbId,
          label: row.label,
          type: row.type,
          required: row.req === "Ya" || row.req === true,
          validation: row.val || null,
          skip_logic: row.skip || null,
          sort_order: currentSortOrder++
        });
      }

      await fetchFormStructure();
      setIsSuccess(true);

      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadedFile(null);
        setDetectedColumns([]);
        setPreviewRows([]);
        setIsSuccess(false);
      }, 1500);
    } catch (err) {
      alert("Gagal mengimpor pertanyaan: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Block Copy / Paste ─────────────────────────────────────────────────

  /** Mark the active block as "copied" into clipboard state */
  const handleCopyBlock = () => {
    setCopiedBlockId(activeBlok);
    setShowBlockMenu(false);
    setPasteToast({ type: 'copied', msg: `Pertanyaan ${activeBlok} berhasil disalin ke clipboard` });
    setTimeout(() => setPasteToast(null), 3000);
  };

  /**
   * Paste all questions from `copiedBlockId` into `targetBlock`.
   * Uses a two-pass approach:
   *   Pass 1 – create all questions (remapping parentId using oldId→newId map)
   *   Pass 2 – update skip_target & show_if_parent_id that reference old question IDs
   */
  const handlePasteBlock = async (targetBlock) => {
    console.log('[handlePasteBlock] START - targetBlock:', targetBlock);
    console.log('[handlePasteBlock] copiedBlockId:', copiedBlockId);
    console.log('[handlePasteBlock] blocks:', blocks.map(b => b.id));
    console.log('[handlePasteBlock] questions count:', questions.length);

    if (!copiedBlockId || !targetBlock) {
      console.log('[handlePasteBlock] EARLY RETURN - missing copiedBlockId or targetBlock');
      return;
    }
    const targetBlockObj = blocks.find(b => b.id === targetBlock);
    console.log('[handlePasteBlock] targetBlockObj:', targetBlockObj);
    if (!targetBlockObj) {
      console.log('[handlePasteBlock] EARLY RETURN - no targetBlockObj');
      return;
    }

    // Collect source questions in correct order (parents before children)
    const sourceQs = getOrderedQuestionsInBlock(copiedBlockId, questions);
    console.log('[handlePasteBlock] sourceQs:', sourceQs.length);
    if (sourceQs.length === 0) {
      alert('Blok sumber tidak memiliki pertanyaan.');
      return;
    }

    setIsPasting(true);
    setPasteTarget(null);

    try {
      // Guard: ensure targetBlockObj.dbId is a valid number
      const targetDbId = parseInt(targetBlockObj.dbId, 10);
      if (!targetDbId || isNaN(targetDbId)) {
        throw new Error(`DB ID blok tujuan tidak ditemukan (id=${targetBlockObj.dbId}). Coba refresh halaman.`);
      }

      // Get existing questions in target block to potentially delete them
      const targetExistingQs = questions.filter(q => q.blokId === targetBlock);

      // ── STEP 0: Delete existing questions in target block ─────────────────
      // This implements the "replace" behavior (delete then paste new)
      if (targetExistingQs.length > 0) {
        console.log('[paste] Deleting', targetExistingQs.length, 'existing questions in target block');
        for (const q of targetExistingQs) {
          try {
            await api.form.deleteQuestion(q.id);
          } catch (err) {
            console.error('[paste] Failed to delete question', q.id, ':', err);
          }
        }
        // Refresh to get updated list
        await fetchFormStructure();
      }

      // Re-fetch questions after deletion
      const updatedQuestions = projectData[selectedProject]?.questions || questions;

      // Starting sort order from 0
      let sortCursor = 0;

      // old question ID → new question ID map (for remapping relations)
      const idMap = {};

      // ── Pass 1: Create questions ────────────────────────────────────────
      // Process questions in order: parents before children
      // This ensures parent exists before child is created
      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let orphanedSubs = 0; // Questions with invalid parentId that became root

      // Log source questions for debugging
      console.log('[paste] ===== DEBUG START =====');
      console.log('[paste] copiedBlockId:', copiedBlockId);
      console.log('[paste] targetBlock:', targetBlock);
      console.log('[paste] questions.length:', questions.length);
      console.log('[paste] sourceQs.length:', sourceQs.length);
      if (sourceQs.length > 0) {
        console.log('[paste] First sourceQ:', JSON.stringify({
          id: sourceQs[0].id,
          label: sourceQs[0].label,
          labelType: typeof sourceQs[0].label,
          parentId: sourceQs[0].parentId,
          blokId: sourceQs[0].blokId
        }));
      }

      for (const srcQ of sourceQs) {
        // IMPORTANT: Do NOT skip questions with empty labels!
        // A parent question may have an empty label (e.g. R706 is a container for sub-questions).
        // If we skip it, its children can't find their parent in idMap and become root questions.
        // Instead, use a non-empty placeholder label so backend accepts it.
        const safeLabel = (srcQ.label && srcQ.label.trim()) ? srcQ.label.trim() : '(tanpa label)';

        // Remap parentId: look up in idMap (built from sourceQs processed so far)
        // Since getOrderedQuestionsInBlock puts parents before children, parent should always
        // be in idMap by the time we process the child.
        let newParentId = null;
        if (srcQ.parentId) {
          if (idMap[srcQ.parentId] !== undefined) {
            // Parent was created successfully → use its new ID
            newParentId = idMap[srcQ.parentId];
          } else {
            // Parent either: failed to create, has empty label and was skipped (old bug),
            // or belongs to a different block. Fall back to root.
            console.warn('[paste] parentId', srcQ.parentId, 'not in idMap for:', safeLabel, '→ making root question');
          }
        }

        // Normalize options — backend expects JSON string or null
        let normalizedOptions = null;
        if (srcQ.options) {
          normalizedOptions = typeof srcQ.options === 'string'
            ? srcQ.options
            : JSON.stringify(srcQ.options);
        }

        // Normalize validation JSON
        let normalizedVal = null;
        if (srcQ.val) {
          try {
            const parsed = JSON.parse(srcQ.val);
            if (srcQ.type === 'search') { parsed.is_search = true; }
            normalizedVal = JSON.stringify(parsed);
          } catch {
            normalizedVal = srcQ.val;
          }
        }

        const payload = {
          blok_id: targetDbId,
          parent_id: newParentId,
          label: safeLabel,
          type: srcQ.type === 'search' ? 'select' : srcQ.type,
          required: srcQ.req,
          options: normalizedOptions,
          validation: normalizedVal,
          skip_logic: srcQ.skip || null,
          // skip_target and show_if_parent_id reference old IDs — fixed in pass 2
          skip_target: null,
          show_if_parent_id: null,
          show_if_value: srcQ.showIfValue || null,
          sort_order: sortCursor++
        };

        const res = await api.form.createQuestion(payload);
        if (res?.success && res?.question?.id) {
          idMap[srcQ.id] = res.question.id;
          createdCount++;
        } else {
          failedCount++;
          console.error('[paste] Failed to create:', safeLabel, '| res:', res);
        }
      }

      console.log(`[paste] Pass 1 complete. Created: ${createdCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
      console.log('[paste] idMap entries:', Object.keys(idMap).length);

      // ── Pass 2: Fix cross-references (skip_target, show_if_parent_id, skip_logic conditions) ───
      // Helper: remap question_id inside a JSON conditions string
      const remapJsonConditions = (jsonStr) => {
        if (!jsonStr) return null;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.conditions)) {
            parsed.conditions = parsed.conditions.map(cond => {
              if (cond.question_id && idMap[cond.question_id]) {
                return { ...cond, question_id: idMap[cond.question_id] };
              }
              return cond;
            });
            return JSON.stringify(parsed);
          }
        } catch (e) { }
        return jsonStr;
      };

      const needsUpdate = sourceQs.filter(srcQ =>
        (srcQ.skipTarget && idMap[srcQ.skipTarget]) ||
        (srcQ.showIfParentId && idMap[srcQ.showIfParentId]) ||
        srcQ.skip  // has skip_logic that may reference copied question IDs
      );

      for (const srcQ of needsUpdate) {
        const newId = idMap[srcQ.id];
        if (!newId) continue;
        const newSkipTarget = srcQ.skipTarget ? (idMap[srcQ.skipTarget] ?? srcQ.skipTarget) : null;
        const newShowIfParentId = srcQ.showIfParentId ? (idMap[srcQ.showIfParentId] ?? srcQ.showIfParentId) : null;
        const newSkipLogic = remapJsonConditions(srcQ.skip);

        // Verify parent_id is correct - if source had a parent, new question should have the remapped parent
        const expectedParentId = srcQ.parentId ? (idMap[srcQ.parentId] ?? null) : null;

        // Normalize options for update
        const opts2 = srcQ.options
          ? (typeof srcQ.options === 'string' ? srcQ.options : JSON.stringify(srcQ.options))
          : null;

        // Check if anything actually needs to be updated
        const needsUpdateFlags = newSkipTarget || newShowIfParentId || newSkipLogic !== srcQ.skip;
        const needsParentFix = srcQ.parentId && !idMap[srcQ.parentId];

        // Only call API if something actually changed
        if (needsUpdateFlags || needsParentFix) {
          console.log(`[paste] Pass 2 updating "${srcQ.label.substring(0, 30)}..." (ID ${newId}): parent_id=${expectedParentId}, skip_target=${newSkipTarget}, show_if_parent_id=${newShowIfParentId}`);
          await api.form.updateQuestion(newId, {
            blok_id: targetDbId,
            parent_id: expectedParentId,
            label: srcQ.label,
            type: srcQ.type === 'search' ? 'select' : srcQ.type,
            required: srcQ.req,
            options: opts2,
            validation: srcQ.val || null,
            skip_logic: newSkipLogic,
            skip_target: newSkipTarget,
            show_if_parent_id: newShowIfParentId,
            show_if_value: srcQ.showIfValue || null,
            sort_order: srcQ.sort_order
          });
        }
      }

      // ── Pass 3: Fix parent_id for questions that didn't need Pass 2 update ───
      // This ensures ALL copied questions have correct parent_id
      const needsPass3 = sourceQs.filter(srcQ => {
        // Skip if already handled in Pass 2
        if ((srcQ.skipTarget && idMap[srcQ.skipTarget]) ||
          (srcQ.showIfParentId && idMap[srcQ.showIfParentId]) ||
          srcQ.skip) {
          return false;
        }
        // Need Pass 3 if source had a parent that exists in idMap
        return srcQ.parentId && idMap[srcQ.parentId];
      });

      if (needsPass3.length > 0) {
        console.log('[paste] Pass 3: Fixing parent_id for', needsPass3.length, 'questions');
        for (const srcQ of needsPass3) {
          const newId = idMap[srcQ.id];
          const expectedParentId = idMap[srcQ.parentId];
          console.log(`[paste] Pass 3: "${srcQ.label.substring(0, 30)}..." (ID ${newId}) -> parent_id=${expectedParentId}`);
          await api.form.updateQuestion(newId, {
            blok_id: targetDbId,
            parent_id: expectedParentId,
            label: srcQ.label,
            type: srcQ.type === 'search' ? 'select' : srcQ.type,
            required: srcQ.req,
            options: srcQ.options ? (typeof srcQ.options === 'string' ? srcQ.options : JSON.stringify(srcQ.options)) : null,
            validation: srcQ.val || null,
            skip_logic: srcQ.skip || null,
            skip_target: srcQ.skipTarget ? (idMap[srcQ.skipTarget] ?? srcQ.skipTarget) : null,
            show_if_parent_id: srcQ.showIfParentId ? (idMap[srcQ.showIfParentId] ?? srcQ.showIfParentId) : null,
            show_if_value: srcQ.showIfValue || null,
            sort_order: srcQ.sort_order
          });
        }
      }

      await fetchFormStructure();
      setActiveBlok(targetBlock);
      setCopiedBlockId(null);
      let toastMsg = `${createdCount} pertanyaan berhasil dipaste ke ${targetBlock}`;
      if (skippedCount > 0) toastMsg += ` (${skippedCount} dilewati)`;
      if (failedCount > 0) toastMsg += ` (${failedCount} gagal)`;
      if (orphanedSubs > 0) toastMsg += ` (${orphanedSubs} sub-jawab dijadikan utama)`;
      setPasteToast({ type: 'success', msg: toastMsg });
      setTimeout(() => setPasteToast(null), 4000);
    } catch (err) {
      alert('Gagal paste pertanyaan: ' + err.message);
    } finally {
      setIsPasting(false);
    }
  };

  const handleCopyQuestionnaire = async () => {
    if (!sourceActivityId) {
      setCopyError("Pilih kegiatan asal terlebih dahulu.");
      return;
    }
    setIsCopying(true);
    setCopyError("");
    try {
      const data = await api.form.copy(parseInt(sourceActivityId, 10), activeActivity.id);
      if (data.success) {
        setIsCopyModalOpen(false);
        setSourceActivityId("");
        alert("Sukses: Kuesioner berhasil disalin!");
        await fetchFormStructure();
      } else {
        setCopyError(data.message || "Gagal menyalin kuesioner");
      }
    } catch (err) {
      console.error(err);
      setCopyError("Koneksi gagal: " + err.message);
    } finally {
      setIsCopying(false);
    }
  };

  const orderedBlockQs = getOrderedQuestionsInBlock(activeBlok, questions);
  const activeBlockCount = questions.filter(q => q.blokId === activeBlok).length;
  const showRightPanel = !!activeBlok || !!selected || !!addingSubParent;

  if (isLoading) {
    return (
      <AdminLayout tab="admin-builder" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
        <div className="p-6 lg:p-8 w-full animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-64 bg-slate-100 rounded-md"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
              <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Blok list skeleton */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <div className="h-4 w-28 bg-slate-200 rounded mb-2"></div>
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="flex gap-2 items-center py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-12 bg-slate-200 rounded"></div>
                    <div className="h-2 w-20 bg-slate-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Middle: Questions list skeleton */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-100 p-5 space-y-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="h-4.5 w-32 bg-slate-200 rounded"></div>
                <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-slate-100 rounded"></div>
                      <div className="h-3 w-4 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-8 bg-slate-50 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Details panel skeleton */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 p-5 space-y-4 shadow-sm">
              <div className="h-4.5 w-24 bg-slate-200 rounded"></div>
              <div className="h-px bg-slate-50"></div>
              <div className="space-y-3">
                <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
                <div className="h-10 bg-slate-50 rounded-xl"></div>
                <div className="h-3.5 w-12 bg-slate-100 rounded"></div>
                <div className="h-10 bg-slate-50 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout tab="admin-builder" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full slide-up lg:h-[calc(100vh-72px)] lg:flex lg:flex-col lg:overflow-hidden">

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
            <button
              onClick={handleOpenPreview}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-500 cursor-pointer hover:bg-slate-50 transition-all"
            >
              <Eye size={14} /> Preview
            </button>
            <button
              onClick={() => alert("Perubahan kuesioner berhasil disinkronkan. Sistem selalu menyimpan perubahan Anda secara otomatis ke database!")}
              disabled={!canEdit}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border-0 transition-all ${canEdit
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              title={!canEdit ? "Kuesioner hanya dapat diedit ketika berstatus Draft atau Published" : "Simpan kuesioner"}
            >
              <Save size={14} /> Simpan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:flex-1 lg:min-h-0">
          {/* Left: Blok list */}
          <div className="lg:col-span-3 lg:h-full lg:flex lg:flex-col lg:min-h-0">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
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
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Inline Add Block Form */}
              {showAddBlock && (
                <div className="p-3 bg-blue-50/30 border-b border-blue-50 space-y-2.5" style={{ animation: "slideDown 0.15s ease" }}>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tipe Blok</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="newBlockType"
                          checked={newBlockType === "standard"}
                          onChange={() => setNewBlockType("standard")}
                          className="accent-blue-600"
                        />
                        Berpenomoran
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="newBlockType"
                          checked={newBlockType === "text"}
                          onChange={() => setNewBlockType("text")}
                          className="accent-blue-600"
                        />
                        Teks Saja
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Posisi Blok</label>
                    <SelectDropdown variant="form"
                      value={newBlockPosition}
                      onChange={e => setNewBlockPosition(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
                    >
                      <option value="after">Setelah {activeBlok || "Blok Aktif"}</option>
                      <option value="start">Di Paling Awal</option>
                      <option value="end">Di Paling Akhir</option>
                    </SelectDropdown>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                      {newBlockType === "text" ? "Judul Teks (maks 20 karakter)" : "Keterangan/Judul Blok"}
                    </label>
                    <input
                      type="text"
                      placeholder={newBlockType === "text" ? "misal: Kalimat Pembuka..." : "misal: Keterangan Tempat..."}
                      value={newBlockTitle}
                      maxLength={newBlockType === "text" ? 20 : 150}
                      onChange={e => setNewBlockTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>

                  <div className="flex gap-1.5 justify-end">
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
              <div className="divide-y divide-slate-50 lg:flex-1 lg:overflow-y-auto">
                {blocks.map(b => {
                  const isEditing = editingBlockId === b.id;
                  const isCurrent = activeBlok === b.id;
                  const blockQuestionCount = questions.filter(q => q.blokId === b.id).length;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveBlok(b.id);
                          setSelectedId(null);
                        }
                      }}
                      className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${isCurrent ? "bg-blue-50/40 border-r-2 border-blue-600" : "bg-transparent hover:bg-slate-50/50"
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
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditingBlockId(null)} className="p-1 hover:bg-red-50 text-red-500 border-0 bg-transparent cursor-pointer rounded">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          b.title !== "(Blok Teks)" && (
                            <p className={`text-[10px] mt-0.5 truncate ${isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>{b.title}</p>
                          )
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
                              <Edit3 size={11} />
                            </button>
                            {blocks.length > 1 && (
                              <button
                                onClick={() => setBlockToDelete(b)}
                                className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer rounded"
                                title="Hapus Blok"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Paste button — shown on all blocks EXCEPT the copied source */}
                        {canEdit && !isEditing && copiedBlockId && copiedBlockId !== b.id && (
                          <button
                            onClick={() => setPasteTarget(b)}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded cursor-pointer transition-all"
                            title={`Paste pertanyaan ${copiedBlockId} ke ${b.id}`}
                          >
                            <Copy size={9} /> Paste
                          </button>
                        )}

                        {!isEditing && (
                          <span className={`mono text-[10px] px-2 py-0.5 rounded-md font-medium ${isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'
                            }`}>{blockQuestionCount}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Clipboard Banner ─────────────────────────────────── */}
              {copiedBlockId && (
                <div
                  className="px-3 py-2.5 bg-violet-50 border-t border-violet-100 flex items-center gap-2"
                  style={{ animation: 'slideDown 0.15s ease' }}
                >
                  <Copy size={11} className="text-violet-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-violet-700 leading-tight">Mode Paste Aktif</p>
                    <p className="text-[9px] text-violet-400 truncate">{copiedBlockId} disalin</p>
                  </div>
                  <button
                    onClick={() => { setCopiedBlockId(null); }}
                    className="flex items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-violet-600 hover:text-red-600 hover:bg-red-50 border border-violet-200 hover:border-red-200 rounded transition-all border-solid bg-white cursor-pointer flex-shrink-0"
                    title="Batalkan mode paste"
                  >
                    <X size={9} /> Batalkan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Questions */}
          <div className={`transition-all duration-300 lg:h-full lg:flex lg:flex-col lg:min-h-0 ${showRightPanel ? "lg:col-span-5" : "lg:col-span-9"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{activeBlok} — Daftar Rincian</h3>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBlockMenu(!showBlockMenu)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-all shadow-sm"
                  >
                    <Settings size={13} className="text-slate-400" />
                    <span>Menu Blok</span>
                    <ChevronDown size={11} className={`transition-transform duration-200 ${showBlockMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showBlockMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowBlockMenu(false)} />
                      <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-40 animate-sidebar-enter">
                        <button
                          type="button"
                          onClick={() => { setSelectedId(null); setShowBlockMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50 border-0 bg-transparent cursor-pointer ${selectedId === null ? 'text-blue-600 font-semibold bg-blue-50/30' : 'text-slate-700'}`}
                        >
                          <Settings size={13} className="text-slate-400" />
                          <span>Properti Blok</span>
                        </button>
                        {/* ── Copy Block Questions ─────────────────────────────── */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={copiedBlockId === activeBlok ? () => { setCopiedBlockId(null); setShowBlockMenu(false); } : handleCopyBlock}
                          className={`w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium border-0 bg-transparent cursor-pointer ${copiedBlockId === activeBlok
                            ? 'hover:bg-red-50 text-red-600 disabled:opacity-40'
                            : 'hover:bg-violet-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent'
                            }`}
                        >
                          {copiedBlockId === activeBlok ? (
                            <>
                              <X size={13} className="text-red-400" />
                              <span className="font-semibold">Batalkan Salinan</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} className="text-slate-400" />
                              <span>Salin Pertanyaan Blok Ini</span>
                            </>
                          )}
                        </button>
                        <div className="my-1 border-t border-slate-50" />
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => { setIsCopyModalOpen(true); setShowBlockMenu(false); }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent border-0 bg-transparent cursor-pointer"
                        >
                          <Copy size={13} className="text-slate-400" />
                          <span>Salin Kuesioner (Antar Kegiatan)</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => { setIsUploadModalOpen(true); setShowBlockMenu(false); }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent border-0 bg-transparent cursor-pointer"
                        >
                          <Upload size={13} className="text-slate-400" />
                          <span>Impor Excel</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {/* Tambah Catatan button */}
                <button
                  disabled={!canEdit}
                  onClick={handleAddNote}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${canEdit
                    ? "text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                    }`}
                  title={!canEdit ? "Catatan dinonaktifkan untuk kegiatan published" : "Tambah catatan/instruksi di antara pertanyaan"}
                >
                  <StickyNote size={13} />
                  <span>+ Catatan</span>
                </button>
                <button
                  disabled={!canEdit}
                  onClick={() => { setInsertMode('after_selected'); setShowAdd(!showAdd); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${canEdit
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                    }`}
                  title={!canEdit ? "Tambah dinonaktifkan untuk kegiatan published" : "Tambah rincian secara manual"}
                >
                  <Plus size={13} />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Questions Container with relation lines */}
            <div className="relative lg:flex-1 lg:overflow-y-auto lg:min-h-0" ref={listContainerRef}>

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

                  // Calculate nesting depth level
                  let depth = 0;
                  let curr = q;
                  while (curr.parentId) {
                    depth++;
                    const nextParent = questions.find(x => x.id === curr.parentId);
                    if (!nextParent || nextParent.id === curr.id) break;
                    curr = nextParent;
                  }

                  // ── Drag props ──────────────────────────────────────────────────
                  // depth 0 → main question drag (reorders within block)
                  // depth 1/2 → sub-question drag (reorders within sibling group)
                  let dragProps = {};
                  if (canDrag) {
                    if (depth === 0) {
                      dragProps = {
                        draggable: true,
                        onDragStart: (e) => handleDragStart(e, mainIdx),
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleDrop(e, mainIdx),
                      };
                    } else if (q.parentId) {
                      // Find index of this question among its siblings
                      const siblings = orderedBlockQs
                        .filter(x => x.parentId === q.parentId)
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                      const siblingIdx = siblings.findIndex(x => x.id === q.id);
                      dragProps = {
                        draggable: true,
                        onDragStart: (e) => handleSubDragStart(e, q.parentId, siblingIdx),
                        onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
                        onDrop: (e) => handleSubDrop(e, q.parentId, siblingIdx),
                      };
                    }
                  }

                  const isAddingSubHere = addingSubParent?.id === q.id;

                  return (
                    <React.Fragment key={q.id}>
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        {Array.from({ length: depth }).map((_, i) => (
                          <div key={i} className="w-6 flex items-center justify-end mr-1 text-slate-300 flex-shrink-0 animate-sidebar-enter" style={{ marginLeft: i > 0 ? '4px' : '0px' }}>
                            <CornerDownRight size={14} className={i < depth - 1 ? "opacity-35" : ""} />
                          </div>
                        ))}

                        {/* NOTE card — special amber dashed style */}
                        {q.type === 'note' ? (
                          <div
                            id={`q-card-${q.id}`}
                            onClick={() => setSelectedId(isSelected ? null : q.id)}
                            {...dragProps}
                            className={`group/card flex-1 min-w-0 flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isSelected
                              ? 'border-amber-300 bg-amber-50/80'
                              : 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70'
                              }`}
                          >
                            {canDrag && (
                              <div className={`cursor-grab flex-shrink-0 p-0.5 mt-0.5 ${depth === 0
                                ? 'text-amber-300 group-hover/card:text-amber-400'
                                : 'text-amber-200 group-hover/card:text-amber-300'
                                }`}>
                                <GripVertical size={depth === 0 ? 13 : 11} />
                              </div>
                            )}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600 mt-0.5">
                              <StickyNote size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                                <StickyNote size={8} /> CATATAN
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
                                <Trash size={11} />
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Regular question card */
                          <div
                            id={`q-card-${q.id}`}
                            onClick={() => setSelectedId(isSelected ? null : q.id)}
                            {...dragProps}
                            className={`group/card flex-1 min-w-0 flex items-center gap-3 p-4 rounded-xl text-left border cursor-pointer transition-all ${isSelected
                              ? "border-blue-200 bg-blue-50/50 shadow-sm"
                              : isAddingSubHere
                                ? "border-blue-200 bg-blue-50/30"
                                : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                              }`}
                          >
                            {canDrag && (
                              <div className={`cursor-grab flex-shrink-0 p-0.5 ${depth === 0
                                ? 'text-slate-300 group-hover/card:text-slate-400'
                                : 'text-slate-200 group-hover/card:text-slate-300'
                                }`}>
                                <GripVertical size={depth === 0 ? 13 : 11} />
                              </div>
                            )}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400"
                              }`}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="mono text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">R.{qCode}</span>
                                {q.req && <span className="w-1 h-1 rounded-full bg-red-400" />}
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(q.validation || '{}');
                                    const badges = [];
                                    if (parsed.loop_group) {
                                      badges.push(
                                        <span key="loop" className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                                          Group: {parsed.loop_group}
                                        </span>
                                      );
                                    }
                                    if (parsed.is_temporary) {
                                      badges.push(
                                        <span key="temp" className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                                          Sementara
                                        </span>
                                      );
                                    }
                                    return badges;
                                  } catch (e) { }
                                  return null;
                                })()}
                              </div>
                              <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">
                                {renderLabelWithVars(q.label)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              {/* Delete button — appears on hover */}
                              {canEdit && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                                  className="opacity-0 group-hover/card:opacity-100 text-[10px] font-semibold px-2 py-1 rounded transition-all border-0 cursor-pointer bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500"
                                  title="Hapus rincian pertanyaan ini"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                              {/* "+ Sub" button for main questions */}
                              {depth < 2 && canEdit && (
                                <button
                                  onClick={() => {
                                    if (isAddingSubHere) {
                                      setAddingSubParent(null);
                                    } else {
                                      setAddingSubParent(q);
                                      setNewSubLabel("");
                                    }
                                  }}
                                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-all border-0 cursor-pointer ${isAddingSubHere
                                    ? 'opacity-100 bg-blue-100 text-blue-700'
                                    : 'opacity-0 group-hover/card:opacity-100 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                                    }`}
                                  title={isAddingSubHere ? "Tutup" : "Tambah Sub-Pertanyaan"}
                                >
                                  {isAddingSubHere ? '✕ Sub' : '+ Sub'}
                                </button>
                              )}
                              {q.skipTarget && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex-shrink-0">Alur</span>
                              )}
                              {q.showIfParentId && (
                                <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded flex-shrink-0">Kondisi</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Inline Sub-Question Form — appears directly below the parent card */}
                      {isAddingSubHere && (
                        <div
                          className="ml-8 w-full"
                          style={{ animation: 'slideDown 0.2s ease' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-stretch gap-0">
                            {/* Connector line */}
                            <div className="flex flex-col items-center mr-3 flex-shrink-0">
                              <div className="w-px flex-1 bg-blue-200" style={{ minHeight: '8px' }} />
                              <CornerDownRight size={13} className="text-blue-400 flex-shrink-0 my-0.5" />
                              <div className="w-px flex-1 bg-transparent" />
                            </div>
                            {/* Form card */}
                            <div className="flex-1 bg-blue-50/70 border border-blue-200 rounded-xl p-4 shadow-sm mb-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Sub untuk R.{qCode}</span>
                                <span className="text-[9px] text-blue-400 font-medium truncate max-w-[160px]">{q.label}</span>
                              </div>
                              <div className="space-y-2.5">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Label Sub-Pertanyaan</label>
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Contoh: Nama/Hubungan..."
                                    value={newSubLabel}
                                    onChange={e => setNewSubLabel(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && newSubLabel.trim()) handleAddSubQuestion();
                                      if (e.key === 'Escape') setAddingSubParent(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all"
                                  />
                                  <p className="text-[9px] text-slate-400 mt-1">Enter untuk simpan · Esc untuk batal</p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setAddingSubParent(null)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    onClick={handleAddSubQuestion}
                                    disabled={!newSubLabel.trim()}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border-0 cursor-pointer transition-all"
                                  >
                                    Simpan Sub
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Inline Add Question Form */}
                      {showAdd && insertMode === 'after_selected' && selectedId === q.id && (
                        <div
                          className="ml-8 w-full mb-3 mt-1"
                          style={{ animation: 'slideDown 0.2s ease' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-stretch gap-0">
                            {/* Connector line */}
                            <div className="flex flex-col items-center mr-3 flex-shrink-0">
                              <div className="w-px flex-1 bg-blue-200" style={{ minHeight: '8px' }} />
                              <CornerDownRight size={13} className="text-blue-400 flex-shrink-0 my-0.5" />
                              <div className="w-px flex-1 bg-transparent" />
                            </div>
                            {/* Form card */}
                            <div className="flex-1 bg-white border border-blue-200 rounded-xl p-4 shadow-sm mb-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Sisipkan Rincian Baru Setelah R.{qCode}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Tipe</label>
                                  <SelectDropdown variant="form" value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer">
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="radio">Radio/Pilihan</option>
                                    <option value="select">Select/Dropdown</option>
                                    <option value="search">Searchable Dropdown</option>
                                    <option value="location">Geotagging</option>
                                    <option value="date">Tanggal/Waktu</option>
                                    <option value="pcl">PCL (Daftar Petugas)</option>
                                    <option value="pml">PML (Daftar Pengawas)</option>
                                  </SelectDropdown>
                                </div>
                                <div className="flex items-end mb-1">
                                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                                    <input type="checkbox" checked={newQ.req} onChange={e => setNewQ({ ...newQ, req: e.target.checked })} className="rounded accent-blue-600" />
                                    Wajib diisi
                                  </label>
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Label Pertanyaan</label>
                                <input value={newQ.label} onChange={e => setNewQ({ ...newQ, label: e.target.value })}
                                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" placeholder="Contoh: Nama Kepala Rumah Tangga" autoFocus />
                              </div>
                              <div className="flex gap-2 justify-end mt-4">
                                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all">Batal</button>
                                <button onClick={addQ} disabled={!newQ.label.trim()} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg border-0 cursor-pointer hover:bg-blue-700 transition-all disabled:opacity-40">Tambah</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {orderedBlockQs.length === 0 && (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100/70 p-12 text-center">
                    <AlertTriangle size={24} className="text-slate-300 mx-auto mb-2.5" />
                    <p className="text-xs text-slate-400 font-semibold">Blok ini masih kosong</p>
                    <p className="text-[11px] text-slate-300 mt-1">Gunakan tombol 'Tambah' atau 'Impor Excel' untuk mengisi kuesioner</p>
                  </div>
                )}

                {/* Bottom Add Buttons & Form */}
                {canEdit && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => { setInsertMode('bottom'); setShowAdd(!showAdd); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        <Plus size={14} />
                        <span>Tambah Rincian Pertanyaan</span>
                      </button>
                      <button
                        onClick={handleAddNote}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        <StickyNote size={14} />
                        <span>Tambah Catatan</span>
                      </button>
                    </div>

                    {(showAdd && (insertMode === 'bottom' || !selectedId)) && (
                      <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm" style={{ animation: 'slideUp 0.2s ease' }}>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">No. Rincian</label>
                            <div className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg font-semibold text-blue-600 mono">
                              {!activeBlok.startsWith("Blok ") ? (
                                <span className="text-slate-400 font-medium italic">Tidak ada penomoran (Blok Teks)</span>
                              ) : (() => {
                                const tempQ = { id: "temp_new_q_id", blokId: activeBlok, type: newQ.type || 'text', sort_order: 999999 };
                                const nextCode = getQuestionCode(tempQ, [...questions, tempQ], blocks);
                                return `R.${nextCode} (Otomatis)`;
                              })()}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Tipe</label>
                            <SelectDropdown variant="form" value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer">
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="radio">Radio/Pilihan</option>
                              <option value="select">Select/Dropdown</option>
                              <option value="search">Searchable Dropdown</option>
                              <option value="location">Geotagging</option>
                              <option value="date">Tanggal/Waktu</option>
                              <option value="pcl">PCL (Daftar Petugas)</option>
                              <option value="pml">PML (Daftar Pengawas)</option>
                            </SelectDropdown>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Label Pertanyaan</label>
                          <input value={newQ.label} onChange={e => setNewQ({ ...newQ, label: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" placeholder="Contoh: Nama Kepala Rumah Tangga" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={newQ.req} onChange={e => setNewQ({ ...newQ, req: e.target.checked })} className="rounded accent-blue-600" />
                            Wajib diisi
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-50 rounded-lg border-0 cursor-pointer hover:bg-slate-100 transition-all">Batal</button>
                            <button onClick={addQ} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg border-0 cursor-pointer hover:bg-blue-700 transition-all">Tambah</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Properties & Sub-Question Addition Modal */}
          {showRightPanel && (
            <div className="lg:col-span-4 relative z-20 animate-sidebar-enter lg:h-full lg:flex lg:flex-col lg:min-h-0">

              {/* Inline Subquestion Creator */}
              {/* Sub-question form is now inline below each question card */}

              {/* Properties Panel */}
              {selected ? (() => {
                // === NOTE EDITOR (early return) ===
                if (selected.type === 'note') {
                  return (
                    <div className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
                      <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between bg-amber-50/50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <StickyNote size={14} className="text-amber-600" />
                          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Edit Catatan</h3>
                        </div>
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">CATATAN</span>
                      </div>
                      {!canEdit && (
                        <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                          Catatan hanya dapat direview (Mode Read-Only)
                        </div>
                      )}
                      <div className="p-5 space-y-4 lg:flex-1 lg:overflow-y-auto">
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
                                  <Bold size={12} />
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
                                  <Italic size={12} />
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
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            Gunakan <code className="bg-slate-50 px-1 rounded font-bold">**teks**</code> tebal, <code className="bg-slate-50 px-1 rounded">*teks*</code> miring.<br />
                            <strong>Variabel Dinamis (Agregasi):</strong><br />
                            • Khusus PCL Aktif: <code className="bg-slate-50 px-1 rounded font-bold">{"{{MAXPCLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{MINPCLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{SUMPCLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{AVGPCLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{LASTPCLR108}}"}</code>.<br />
                            • Keseluruhan Database (ALL): <code className="bg-slate-50 px-1 rounded font-bold">{"{{MAXALLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{MINALLR108}}"}</code>, <code className="bg-slate-50 px-1 rounded font-bold">{"{{SUMALLR108}}"}</code>, dsb. (Dapat ditulis menggunakan/tanpa garis bawah, cth: <code className="bg-slate-50 px-1 rounded font-bold">{"{{MAX_PCL_R108}}"}</code>).
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
                            <Trash2 size={13} /> Hapus Catatan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // === REGULAR QUESTION PROPERTIES ===
                let parsedVal = { type: "unlimited", min: "", max: "", hint: "", sub_label: "" };
                if (selected.val) {
                  const trimmed = selected.val.trim();
                  if (trimmed.startsWith('{')) {
                    try { parsedVal = { ...parsedVal, ...JSON.parse(trimmed) }; } catch (e) { }
                    // Debug: Log parsed validation to see if loop settings are present
                    console.log('[FormBuilder] parsedVal for question', selected.id, ':', parsedVal);
                  } else if (trimmed.startsWith('range:')) {
                    const parts = trimmed.replace('range:', '').trim().split('-');
                    parsedVal.type = "range"; parsedVal.min = parts[0] || ""; parsedVal.max = parts[1] || "";
                  } else if (trimmed.startsWith('min:')) {
                    parsedVal.type = "min"; parsedVal.min = trimmed.replace('min:', '').trim();
                  } else if (trimmed.startsWith('gt:')) {
                    parsedVal.type = "gt"; parsedVal.min = trimmed.replace('gt:', '').trim();
                  } else { parsedVal.hint = trimmed; }
                }
                const updateValObj = (updates) => {
                  console.log('[FormBuilder] updateValObj called with:', updates);
                  handleUpdateQuestion("val", JSON.stringify({ ...parsedVal, ...updates }));
                };
                const optionsList = Array.isArray(selected.options) ? selected.options : [];

                return (
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Properti Rincian</h3>
                      <Settings size={14} className="text-slate-300 animate-spin-slow" />
                    </div>
                    {!canEdit && (
                      <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                        Properti hanya dapat direview (Mode Read-Only)
                      </div>
                    )}
                    <div className="p-5 space-y-4 lg:flex-1 lg:overflow-y-auto">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">No. Rincian</label>
                          <input
                            value={`R.${getQuestionCode(selected, questions, blocks)}`}
                            readOnly
                            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-bold mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Kode Rincian Kustom (opsional)</label>
                          <input
                            type="text"
                            value={parsedVal.custom_code || ""}
                            readOnly={!canEdit}
                            placeholder="Misal: R400 (Kosongkan utk default)"
                            onChange={e => updateValObj({ custom_code: e.target.value })}
                            className={`w-full px-3 py-2.5 text-xs border rounded-lg font-bold mono outline-none focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase">Pertanyaan Utama</label>
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
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Label Pertanyaan</label>
                        <textarea
                          value={parsedVal.sub_label || ""}
                          readOnly={!canEdit}
                          placeholder="Contoh: Pastikan kembali ke responden..."
                          onChange={e => updateValObj({ sub_label: e.target.value })}
                          rows={2}
                          className={`w-full px-3 py-2.5 text-xs border rounded-lg font-medium outline-none resize-none focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Petunjuk Pengisian (Keterangan)</label>
                        <textarea
                          value={parsedVal.hint || ""}
                          readOnly={!canEdit}
                          placeholder="Contoh: SHM = Surat Hak Milik..."
                          onChange={e => updateValObj({ hint: e.target.value })}
                          rows={8}
                          className={`w-full px-3 py-2.5 text-xs border rounded-lg font-medium outline-none resize-y focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                        />
                      </div>

                      {questions.some(c => c.parentId === selected.id || c.parent_id === selected.id) && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Mode Rincian Induk</label>
                          {canEdit ? (
                            <SelectDropdown variant="form"
                              value={parsedVal.parent_mode || "label"}
                              onChange={e => updateValObj({ parent_mode: e.target.value })}
                              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                            >
                              <option value="label">Pertanyaan Label (Tanpa Input Petugas)</option>
                              <option value="original">Pertanyaan Asli (Butuh Input Petugas)</option>
                              <option value="empty">Kosong (Langsung Skip/Tampilkan Sub-pertanyaan)</option>
                            </SelectDropdown>
                          ) : (
                            <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-semibold">
                              {parsedVal.parent_mode === "original" ? "Pertanyaan Asli (Butuh Input Petugas)" : parsedVal.parent_mode === "empty" ? "Kosong (Langsung Skip/Tampilkan Sub-pertanyaan)" : "Pertanyaan Label (Tanpa Input Petugas)"}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Tipe Input</label>
                          {canEdit ? (
                            <SelectDropdown variant="form"
                              value={selected.type}
                              onChange={e => handleUpdateQuestion("type", e.target.value)}
                              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                            >
                              <option value="text">Text (Kapital)</option>
                              <option value="number">Number</option>
                              <option value="radio">Radio</option>
                              <option value="select">Select (Multi-Select)</option>
                              <option value="search">Searchable Dropdown</option>
                              <option value="location">Geotagging</option>
                              <option value="date">Tanggal/Waktu</option>
                              <option value="pcl">PCL (Daftar Petugas)</option>
                              <option value="pml">PML (Daftar Pengawas)</option>
                              <option value="signature">Tanda Tangan</option>
                            </SelectDropdown>
                          ) : (
                            <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-semibold capitalize">{selected.type === "search" ? "Searchable Dropdown" : selected.type}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Wajib diisi</label>
                          {canEdit ? (
                            <SelectDropdown variant="form"
                              value={selected.req ? "Ya" : "Tidak"}
                              onChange={e => handleUpdateQuestion("req", e.target.value === "Ya")}
                              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                            >
                              <option value="Ya">Ya</option>
                              <option value="Tidak">Tidak</option>
                            </SelectDropdown>
                          ) : (
                            <div className={`px-3 py-2.5 text-xs border border-slate-100 rounded-lg font-semibold ${selected.req ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}>{selected.req ? "Ya" : "Tidak"}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Satuan Kuesioner (Opsional)</label>
                        <input
                          type="text"
                          value={parsedVal.satuan || ""}
                          readOnly={!canEdit}
                          placeholder="Contoh: Rupiah, Kg, dll."
                          onChange={e => updateValObj({ satuan: e.target.value })}
                          className={`w-full px-3 py-2.5 text-xs border rounded-lg font-bold outline-none focus:border-blue-500 ${canEdit ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                        />
                      </div>

                      {selected.type === "number" && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Validasi Batasan Angka</label>
                          <div>
                            <SelectDropdown variant="form"
                              value={parsedVal.type}
                              disabled={!canEdit}
                              onChange={e => updateValObj({ type: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-600 font-semibold"
                            >
                              <option value="unlimited">Tidak Dibatasi</option>
                              <option value="range">Rentang Nilai (Min-Max)</option>
                              <option value="min">Lebih Dari / Sama Dengan (&gt;=)</option>
                              <option value="gt">Lebih Dari (&gt;)</option>
                              <option value="max">Kurang Dari / Sama Dengan (&lt;=)</option>
                              <option value="lt">Kurang Dari (&lt;)</option>
                            </SelectDropdown>
                          </div>
                          {parsedVal.type === "range" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Nilai Min</label>
                                <input type="number" value={parsedVal.min} disabled={!canEdit} onChange={e => updateValObj({ min: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Nilai Max</label>
                                <input type="number" value={parsedVal.max} disabled={!canEdit} onChange={e => updateValObj({ max: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600" />
                              </div>
                            </div>
                          )}
                          {(parsedVal.type === "min" || parsedVal.type === "gt") && (
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Batas Nilai Minimal</label>
                              <input type="number" value={parsedVal.min} disabled={!canEdit} onChange={e => updateValObj({ min: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600" />
                            </div>
                          )}
                          {(parsedVal.type === "max" || parsedVal.type === "lt") && (
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Batas Nilai Maksimal</label>
                              <input type="number" value={parsedVal.max} disabled={!canEdit} onChange={e => updateValObj({ max: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600" />
                            </div>
                          )}
                        </div>
                      )}

                      {selected.type === "number" && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipe Bilangan</label>
                          <div>
                            <SelectDropdown variant="form"
                              value={parsedVal.number_type || "decimal"}
                              disabled={!canEdit}
                              onChange={e => updateValObj({ number_type: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-600 font-semibold"
                            >
                              <option value="decimal">Bilangan Desimal (Bisa Koma)</option>
                              <option value="integer">Bilangan Bulat (Tidak Bisa Koma)</option>
                            </SelectDropdown>
                          </div>
                        </div>
                      )}

                      {selected.type === "number" && (
                        <>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Formula Kalkulasi Otomatis</label>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Rumus Operasi (misal: R101a + R101b atau AGE(R410))</label>
                              <input
                                type="text"
                                value={parsedVal.formula || ""}
                                disabled={!canEdit}
                                onChange={e => updateValObj({ formula: e.target.value })}
                                placeholder="Kosongkan jika diinput manual"
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600 focus:border-blue-500 mb-1"
                              />
                              <p className="text-[9px] text-slate-400 leading-normal">
                                Tips: Gunakan <strong className="text-slate-600">AGE(R410)</strong> untuk menghitung umur otomatis berdasarkan tanggal lahir dari pertanyaan berkode R410.
                              </p>
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3 mt-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Validasi Konsistensi Rumus</label>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Rumus Logika (misal: R806c + R806d === R806b)</label>
                              <input
                                type="text"
                                value={parsedVal.custom_validation_formula || ""}
                                disabled={!canEdit}
                                onChange={e => updateValObj({ custom_validation_formula: e.target.value })}
                                placeholder="Contoh: R806c + R806d === R806b"
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600 focus:border-blue-500 mb-1"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Pesan Peringatan Jika Salah</label>
                              <input
                                type="text"
                                value={parsedVal.custom_validation_message || ""}
                                disabled={!canEdit}
                                onChange={e => updateValObj({ custom_validation_message: e.target.value })}
                                placeholder="Masukkan pesan peringatan untuk petugas"
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {selected.type === "text" && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Validasi Isian Teks</label>
                          <div>
                            <SelectDropdown variant="form"
                              value={parsedVal.text_validation_type || "none"}
                              disabled={!canEdit}
                              onChange={e => updateValObj({
                                text_validation_type: e.target.value,
                                text_validation_min: "",
                                text_validation_max: ""
                              })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-600 font-semibold"
                            >
                              <option value="none">Tanpa Validasi</option>
                              <option value="digits_only">Hanya Angka</option>
                              <option value="letters_only">Hanya Huruf</option>
                              <option value="alphanumeric">Huruf & Angka</option>
                              <option value="email">Format E-mail</option>
                              <option value="length">Panjang Karakter (Min/Max)</option>
                            </SelectDropdown>
                          </div>
                          {parsedVal.text_validation_type !== "none" && parsedVal.text_validation_type !== "email" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Min Karakter</label>
                                  <input
                                    type="number"
                                    value={parsedVal.text_validation_min || ""}
                                    disabled={!canEdit}
                                    onChange={e => updateValObj({ text_validation_min: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Max Karakter</label>
                                  <input
                                    type="number"
                                    value={parsedVal.text_validation_max || ""}
                                    disabled={!canEdit}
                                    onChange={e => updateValObj({ text_validation_max: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"
                                  />
                                </div>
                              </div>
                              <div className="border-t border-slate-100 pt-2">
                                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Panjang Karakter Alternatif (ATAU)</label>
                                <input
                                  type="text"
                                  placeholder="Pisahkan dengan koma, cth: 4,16"
                                  value={parsedVal.text_validation_or_lengths || ""}
                                  disabled={!canEdit}
                                  onChange={e => updateValObj({ text_validation_or_lengths: e.target.value })}
                                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600 focus:border-blue-500"
                                />
                                <p className="text-[8px] text-slate-400 mt-0.5">Jika diisi, validasi Min/Max di atas akan diabaikan.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {selected.type === "date" && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Pengaturan Tanggal/Waktu</label>
                          <div>
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Format</label>
                            <SelectDropdown variant="form"
                              value={parsedVal.date_type || "date"}
                              disabled={!canEdit}
                              onChange={e => updateValObj({ date_type: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-600 font-semibold"
                            >
                              <option value="date">Tanggal Saja (YYYY-MM-DD)</option>
                              <option value="datetime-local">Tanggal & Waktu (Local)</option>
                              <option value="time">Waktu Saja (HH:MM)</option>
                            </SelectDropdown>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <label className="text-xs font-semibold text-slate-500 cursor-pointer">
                              Sediakan tombol "Ambil Waktu Sekarang"
                            </label>
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={!!parsedVal.auto_now}
                                onChange={e => updateValObj({ auto_now: e.target.checked })}
                                className="rounded accent-blue-600 cursor-pointer"
                              />
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">{parsedVal.auto_now ? "Ya" : "Tidak"}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {(selected.type === "radio" || selected.type === "select" || selected.type === "search") && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sumber Opsi Dinamis (Ambil dari Looping):</label>
                            {canEdit ? (
                              <SelectDropdown variant="form"
                                value={parsedVal.options_source_question_id || ""}
                                onChange={e => updateValObj({ options_source_question_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
                              >
                                <option value="">-- Gunakan Pilihan Manual --</option>
                                {questions
                                  .filter(q => q.id !== selected.id && q.type !== 'note')
                                  .map(q => (
                                    <option key={q.id} value={q.id}>R.{getQuestionCode(q, questions, blocks)}: {q.label.substring(0, 40)}...</option>
                                  ))
                                }
                              </SelectDropdown>
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">
                                {parsedVal.options_source_question_id
                                  ? `Mengambil dari R.${getQuestionCode(questions.find(x => x.id === parsedVal.options_source_question_id), questions, blocks)}`
                                  : "Pilihan Manual"}
                              </div>
                            )}
                          </div>

                          {!parsedVal.options_source_question_id && (
                            <>
                              <div className="pt-2 border-t border-slate-100">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Gunakan Template dari Freeform (Opsional):</label>
                                {canEdit ? (
                                  <SearchableSelect
                                    options={[
                                      { value: "", label: "-- Pilih Template Pilihan Dinamis --" },
                                      ...freeformOptions.map(opt => ({
                                        value: opt.id,
                                        label: opt.key_name
                                      }))
                                    ]}
                                    value={""} // Always unselected to act as a trigger
                                    onChange={(val) => {
                                      if (!val) return;
                                      const selectedFreeform = freeformOptions.find(opt => opt.id === val);
                                      if (selectedFreeform && Array.isArray(selectedFreeform.payload)) {
                                        // Payload format should be an array of { value, label }
                                        const newOptions = selectedFreeform.payload.map(item => {
                                          // Handle various formats
                                          if (item.value !== undefined && item.label !== undefined) return item;
                                          const keys = Object.keys(item);
                                          if (keys.length >= 2) return { value: String(item[keys[0]]), label: String(item[keys[1]]) };
                                          if (keys.length === 1) return { value: String(item[keys[0]]), label: String(item[keys[0]]) };
                                          return null;
                                        }).filter(Boolean);

                                        if (newOptions.length > 0) {
                                          handleUpdateQuestion("options", newOptions);
                                          alert(`Berhasil mengambil ${newOptions.length} opsi dari template "${selectedFreeform.key_name}"!`);
                                        } else {
                                          alert(`Template "${selectedFreeform.key_name}" tidak memiliki daftar opsi yang valid.`);
                                        }
                                      }
                                    }}
                                    placeholder="Cari Template Pilihan Dinamis..."
                                    className="w-full"
                                  />
                                ) : (
                                  <div className="text-xs font-semibold text-slate-500">Pilihan Manual (Bukan Template)</div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Daftar Pilihan Opsi</label>
                                {canEdit && (
                                  <button type="button" onClick={() => handleAddOption(selected, optionsList)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded border-0 cursor-pointer">
                                    + Opsi
                                  </button>
                                )}
                              </div>
                              {canEdit && (
                                <details className="mb-3 bg-white p-2 border border-slate-200 rounded-lg">
                                  <summary className="text-[10px] font-bold text-slate-500 cursor-pointer outline-none">Import Opsi dari JSON (Otomatis)</summary>
                                  <div className="mt-2">
                                    <textarea id={`json-import-${selected.id}`} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none font-mono" rows="4" placeholder='Contoh:\n[\n  {"kode": "000", "pekerjaan": "Tidak Bekerja"},\n  {"kode": "001", "pekerjaan": "PNS"}\n]'></textarea>
                                    <button type="button" onClick={(e) => {
                                      const textarea = document.getElementById(`json-import-${selected.id}`);
                                      const jsonStr = textarea.value;
                                      if (!jsonStr) return;
                                      try {
                                        const parsed = JSON.parse(jsonStr);
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                          const newOptions = parsed.map(item => {
                                            const keys = Object.keys(item);
                                            if (keys.length >= 2) {
                                              return { value: String(item[keys[0]]), label: String(item[keys[1]]) };
                                            } else if (keys.length === 1) {
                                              return { value: String(item[keys[0]]), label: String(item[keys[0]]) };
                                            }
                                            return null;
                                          }).filter(Boolean);
                                          // Auto append to existing options
                                          handleUpdateQuestion("options", [...optionsList, ...newOptions]);
                                          textarea.value = "";
                                          e.target.parentElement.parentElement.removeAttribute("open");
                                          alert(`${newOptions.length} Opsi berhasil diimport!`);
                                        } else {
                                          alert("Gagal: JSON harus berupa array of objects.");
                                        }
                                      } catch (err) {
                                        alert("Gagal: Format JSON tidak valid (" + err.message + ")");
                                      }
                                    }} className="mt-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded border-0 cursor-pointer w-full transition-colors">
                                      Proses JSON
                                    </button>
                                  </div>
                                </details>
                              )}
                              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {optionsList.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                                    {canEdit ? (
                                      <input
                                        type="text"
                                        value={opt.value}
                                        onChange={e => handleUpdateOptionValue(optionsList, idx, e.target.value)}
                                        placeholder="Nilai"
                                        className="w-10 px-1 py-1 text-center text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 focus:border-blue-300 rounded outline-none uppercase"
                                        title="Nilai/Kode Opsi"
                                      />
                                    ) : (
                                      <span className="w-10 h-6 flex items-center justify-center text-[10px] font-bold text-blue-600 bg-blue-50 rounded-md uppercase">{opt.value}</span>
                                    )}
                                    <input type="text" value={opt.label} readOnly={!canEdit} onChange={e => handleUpdateOptionLabel(optionsList, idx, e.target.value)} className="flex-1 px-2 py-1 text-xs border border-transparent hover:border-slate-100 focus:border-blue-300 rounded outline-none font-medium text-slate-700 bg-transparent" />
                                    <label className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!opt.is_other}
                                        disabled={!canEdit}
                                        onChange={() => handleToggleOptionOther(optionsList, idx)}
                                        className="rounded accent-blue-600 cursor-pointer w-3 h-3"
                                      />
                                      <span>Tambah Input Text</span>
                                    </label>
                                    {canEdit && (
                                      <button type="button" onClick={() => handleDeleteOption(selected, optionsList, idx)} className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 border-0 bg-transparent cursor-pointer rounded">
                                        <Trash size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {optionsList.length === 0 && <p className="text-[10px] text-slate-400 text-center italic py-2">Belum ada pilihan opsi</p>}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Auto-fill & Copy Configuration Section */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Pengaturan Auto-fill & Salin</label>

                        <div>
                          <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Nilai Default (Bawaan):</label>
                          {canEdit ? (
                            <input
                              type="text"
                              value={parsedVal.default_val || ""}
                              onChange={e => updateValObj({ default_val: e.target.value })}
                              placeholder="Contoh: Kalimantan Utara"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none focus:border-blue-500"
                            />
                          ) : (
                            <div className="text-xs font-semibold text-slate-600">{parsedVal.default_val || "-"}</div>
                          )}
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-500 cursor-pointer">
                              Gunakan sebagai Kunci Pencarian (Lookup Key)
                            </label>
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={!!parsedVal.is_lookup_key}
                                onChange={e => updateValObj({ is_lookup_key: e.target.checked })}
                                className="rounded accent-blue-600 cursor-pointer"
                              />
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">{parsedVal.is_lookup_key ? "Ya" : "Tidak"}</div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-500 cursor-pointer">
                              Salin Nilai Jika Kunci Pencarian Cocok
                            </label>
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={!!parsedVal.copy_on_key_match}
                                onChange={e => updateValObj({ copy_on_key_match: e.target.checked })}
                                className="rounded accent-blue-600 cursor-pointer"
                              />
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">{parsedVal.copy_on_key_match ? "Ya" : "Tidak"}</div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-250">
                            <label className="text-xs font-semibold text-slate-550 cursor-pointer">
                              Hanya Baca (Read Only / Kunci Isian)
                            </label>
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={!!parsedVal.read_only}
                                onChange={e => updateValObj({ read_only: e.target.checked })}
                                className="rounded accent-blue-600 cursor-pointer"
                              />
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">{parsedVal.read_only ? "Ya" : "Tidak"}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Loop / Perulangan Section */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Ulangi Pertanyaan (Looping)</label>
                          {canEdit && (
                            <input
                              type="checkbox"
                              checked={!!parsedVal.is_loop}
                              onChange={e => {
                                updateValObj({
                                  is_loop: e.target.checked,
                                  loop_by_question_id: e.target.checked ? (parsedVal.loop_by_question_id || "") : null
                                });
                              }}
                              className="rounded accent-blue-600 cursor-pointer"
                            />
                          )}
                        </div>
                        {parsedVal.is_loop && (
                          <div className="space-y-3 pt-1 border-t border-slate-100">
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Tipe Pengulangan:</label>
                              {canEdit ? (
                                <SelectDropdown variant="form"
                                  value={parsedVal.loop_type || "question"}
                                  onChange={e => updateValObj({
                                    loop_type: e.target.value,
                                    loop_by_question_id: e.target.value === "manual" ? null : (parsedVal.loop_by_question_id || "")
                                  })}
                                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-755 outline-none cursor-pointer focus:border-blue-500"
                                >
                                  <option value="question">Berdasarkan Rincian Lain</option>
                                  <option value="manual">Dinamis oleh Petugas (Tombol Tambah/Kurang)</option>
                                </SelectDropdown>
                              ) : (
                                <div className="text-xs font-semibold text-slate-600">
                                  {parsedVal.loop_type === "manual" ? "Dinamis oleh Petugas" : "Berdasarkan Rincian Lain"}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Nama Kelompok Looping (Optional):</label>
                              {canEdit ? (
                                <input
                                  type="text"
                                  value={parsedVal.loop_group || ""}
                                  placeholder="Contoh: anggota_keluarga"
                                  onChange={e => updateValObj({ loop_group: e.target.value.trim().toLowerCase() })}
                                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-755 outline-none focus:border-blue-500"
                                />
                              ) : (
                                <div className="text-xs font-semibold text-slate-600">
                                  {parsedVal.loop_group || "Tidak ada"}
                                </div>
                              )}
                              <p className="text-[8px] text-slate-400 mt-1 leading-snug">Gunakan nama yang sama untuk semua pertanyaan yang ingin diulang bersama dalam satu kontainer visual.</p>
                            </div>
                            {parsedVal.loop_type !== "manual" && (
                              <div className="space-y-2">
                                <label className="block text-[9px] font-semibold text-slate-400 uppercase">Ulangi berdasarkan jumlah pada:</label>
                                {canEdit ? (
                                  <SelectDropdown variant="form"
                                    value={parsedVal.loop_by_question_id || ""}
                                    onChange={e => updateValObj({ loop_by_question_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-755 outline-none cursor-pointer focus:border-blue-500"
                                  >
                                    <option value="">-- Pilih Rincian Jumlah --</option>
                                    {(() => {
                                      const allOrderedQs = [];
                                      blocks.forEach(b => {
                                        allOrderedQs.push(...getOrderedQuestionsInBlock(b.id, questions));
                                      });
                                      const currentIdx = allOrderedQs.findIndex(x => x.id === selected.id);
                                      const possibleLoopQs = allOrderedQs.filter((x, idx) => idx < currentIdx && x.type === 'number');
                                      return possibleLoopQs.map(x => (
                                        <option key={x.id} value={x.id}>
                                          R.{getQuestionCode(x, questions, blocks)}: {x.label.substring(0, 30)}...
                                        </option>
                                      ));
                                    })()}
                                  </SelectDropdown>
                                ) : (
                                  <div className="px-3 py-2 text-xs bg-white border border-slate-100 rounded-lg text-slate-600 font-semibold">
                                    {parsedVal.loop_by_question_id
                                      ? `R.${getQuestionCode(questions.find(t => t.id === parsedVal.loop_by_question_id), questions, blocks)}: ${questions.find(t => t.id === parsedVal.loop_by_question_id)?.label || ''}`
                                      : "Belum ditentukan"
                                    }
                                  </div>
                                )}
                                <p className="text-[9px] text-slate-450 leading-snug">Pertanyaan ini akan diulang sebanyak jawaban angka pada rincian terpilih di atas.</p>
                              </div>
                            )}
                            {parsedVal.loop_type === "manual" && (
                              <p className="text-[9px] text-slate-455 leading-snug">Petugas dapat secara dinamis menambah dan menghapus baris isian menggunakan tombol tambah/kurang di aplikasi.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pertanyaan Sementara (Temporary / Client Calculation Only) */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Pertanyaan Sementara (Temporary)</label>
                            <p className="text-[8px] text-slate-400 mt-0.5 leading-snug">Hanya digunakan untuk perhitungan / navigasi client (tidak disimpan ke Database/Server).</p>
                          </div>
                          {canEdit && (
                            <input
                              type="checkbox"
                              checked={!!parsedVal.is_temporary}
                              onChange={e => {
                                updateValObj({
                                  is_temporary: e.target.checked
                                });
                              }}
                              className="rounded accent-blue-600 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>

                      {/* Skip Logic (Lompat ke Rincian) */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Lompat ke Rincian (Skip Logic Target)</label>
                          {canEdit ? (
                            <SelectDropdown variant="form"
                              value={selected.skipTarget || ""}
                              onChange={e => handleUpdateQuestion("skipTarget", e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-blue-600 outline-none cursor-pointer focus:border-blue-500"
                            >
                              <option value="">-- Tidak ada lompatan --</option>
                              {(() => {
                                const allOrderedQs = [];
                                blocks.forEach(b => {
                                  allOrderedQs.push(...getOrderedQuestionsInBlock(b.id, questions));
                                });
                                const currentIdx = allOrderedQs.findIndex(y => y.id === selected.id);

                                return blocks.map(b => {
                                  const blockQs = getOrderedQuestionsInBlock(b.id, questions).filter(x => {
                                    if (x.id === selected.id || x.type === 'note') return false;
                                    const targetIdx = allOrderedQs.findIndex(y => y.id === x.id);
                                    return targetIdx > currentIdx;
                                  });
                                  if (blockQs.length === 0) return null;
                                  return (
                                    <optgroup key={b.id} label={`${b.id}: ${b.title}`}>
                                      {blockQs.map(x => (
                                        <option key={x.id} value={x.id}>R.{getQuestionCode(x, questions, blocks)}: {x.label.substring(0, 30)}...</option>
                                      ))}
                                    </optgroup>
                                  );
                                });
                              })()}
                            </SelectDropdown>
                          ) : (
                            <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-medium">
                              {selected.skipTarget ? `Lompat ke R.${getQuestionCode(questions.find(t => t.id === selected.skipTarget), questions, blocks)}` : "Tidak ada"}
                            </div>
                          )}
                        </div>

                        {selected.skipTarget && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Syarat Jawaban Pemicu Lompatan</label>
                            <RuleBuilder
                              ruleVal={selected.skip || ""}
                              onChange={newVal => handleUpdateQuestion("skip", newVal)}
                              label="Aturan Lompatan"
                              questions={questions}
                              blocks={blocks}
                              currentQuestionId={selected.id}
                              allowCurrent={true}
                            />
                            <p className="text-[9px] text-slate-400 leading-snug">Semua rincian setelah rincian ini hingga sebelum target akan dilewati jika kondisi di atas terpenuhi.</p>
                          </div>
                        )}
                      </div>

                      {/* Show If Logic */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Tampilkan Kondisional (Show If)</label>
                          <RuleBuilder
                            ruleVal={selected.showIfValue || ""}
                            onChange={newVal => {
                              if (!newVal) {
                                handleUpdateQuestion({
                                  showIfParentId: null,
                                  showIfValue: null
                                });
                              } else {
                                try {
                                  const parsed = JSON.parse(newVal);
                                  const parentId = (parsed.conditions && parsed.conditions[0]) ? parsed.conditions[0].question_id : null;
                                  handleUpdateQuestion({
                                    showIfParentId: parentId,
                                    showIfValue: newVal
                                  });
                                } catch (e) {
                                  handleUpdateQuestion("showIfValue", newVal);
                                }
                              }
                            }}
                            label="Syarat Menampilkan Rincian"
                            questions={questions}
                            blocks={blocks}
                            currentQuestionId={selected.id}
                          />
                          <p className="text-[9px] text-slate-400 leading-snug">Rincian pertanyaan ini hanya akan ditampilkan ke petugas jika kondisi di atas terpenuhi.</p>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          onClick={() => handleDeleteQuestion(selected.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg border-0 transition-all mt-2 text-red-500 bg-red-50 hover:bg-red-100 cursor-pointer"
                          title="Hapus rincian ini beserta sub-pertanyaannya"
                        >
                          <Trash2 size={13} /> Hapus Rincian
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (() => {
                const activeBlockObj = blocks.find(b => b.id === activeBlok);
                if (!activeBlockObj) {
                  return (
                    <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                      <Settings size={28} className="text-slate-200 mb-3 animate-pulse" />
                      <p className="text-sm text-slate-400 font-bold">Pilih rincian untuk melihat propertinya</p>
                      <p className="text-xs text-slate-300 mt-1">Klik pada salah satu rincian kuesioner</p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings size={14} className="text-slate-500" />
                        Properti Blok ({activeBlockObj.id})
                      </h3>
                    </div>
                    {!canEdit && (
                      <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                        Properti hanya dapat direview (Mode Read-Only)
                      </div>
                    )}
                    <div className="p-5 space-y-4 lg:flex-1 lg:overflow-y-auto">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Kode Blok</label>
                        <input
                          type="text"
                          value={activeBlockObj.id}
                          disabled
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Judul Blok</label>
                        <input
                          type="text"
                          value={activeBlockObj.title === "(Blok Teks)" ? "Blok Teks Saja" : activeBlockObj.title}
                          disabled={!canEdit || activeBlockObj.title === "(Blok Teks)"}
                          onChange={e => handleUpdateBlockTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Sembunyikan Blok (Hide Block)</label>
                        <RuleBuilder
                          ruleVal={activeBlockObj.hide_logic || ""}
                          onChange={handleUpdateBlockHideLogic}
                          label="Aturan Sembunyikan Blok"
                          questions={questions}
                          blocks={blocks}
                          currentQuestionId={null}
                        />
                        <p className="text-[9px] text-slate-400 leading-snug">Blok ini beserta semua rincian di dalamnya akan disembunyikan dari aplikasi petugas apabila kondisi di atas terpenuhi.</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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

      {/* Delete Question Confirmation Modal */}
      {questionToDelete && (() => {
        const qToDel = questions.find(q => q.id === questionToDelete);
        if (!qToDel) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ animation: "fadeIn 0.15s ease" }}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg" style={{ animation: "scaleIn 0.2s ease" }}>
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold text-slate-800">Hapus Pertanyaan?</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan menghapus pertanyaan <strong className="text-slate-700">"{qToDel.label?.substring(0, 50) || 'Tanpa label'}{qToDel.label?.length > 50 ? '...' : ''}"</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-2.5 mt-6 justify-end">
                <button
                  onClick={() => setQuestionToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl border-0 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteQuestion}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl border-0 cursor-pointer"
                >
                  Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Copy Questionnaire Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => { if (!isCopying) setIsCopyModalOpen(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg"
            style={{ maxWidth: 520, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Copy size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Salin Struktur Kuesioner</h3>
                  <p className="text-xs text-slate-400">Duplikasi seluruh blok dan rincian kuesioner dari kegiatan lain</p>
                </div>
              </div>
              <button
                disabled={isCopying}
                onClick={() => setIsCopyModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-805 text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700">
                  <AlertTriangle size={14} />
                  <span>Peringatan Penting!</span>
                </div>
                <p>Tindakan ini akan <strong className="text-slate-800">menghapus seluruh blok dan pertanyaan</strong> kuesioner yang saat ini terdaftar pada kegiatan ini (kegiatan tujuan) untuk digantikan dengan salinan dari kegiatan asal.</p>
                <p className="font-semibold text-slate-800">Logika lompatan (skip logic), tampil kondisional (show if), validasi khusus, dan logika sembunyikan blok juga akan ikut disalin dan disesuaikan otomatis.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Kegiatan Asal</label>
                <SelectDropdown variant="form"
                  value={sourceActivityId}
                  onChange={e => {
                    setSourceActivityId(e.target.value);
                    setCopyError("");
                  }}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value="">-- Pilih Kegiatan Sumber --</option>
                  {activities
                    .filter(act => act.name !== selectedProject)
                    .map(act => (
                      <option key={act.id} value={act.id}>
                        {act.name} ({act.status === "draft" ? "Draft" : "Published"})
                      </option>
                    ))
                  }
                </SelectDropdown>
              </div>

              {copyError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold">
                  {copyError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-50">
                <button
                  type="button"
                  disabled={isCopying}
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 rounded-xl border-0 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isCopying || !sourceActivityId}
                  onClick={handleCopyQuestionnaire}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl border-0 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isCopying ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyalin...</span>
                    </>
                  ) : (
                    <span>Salin & Timpa</span>
                  )}
                </button>
              </div>
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
                  <Database size={20} />
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
                <X size={18} />
              </button>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check size={36} />
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
                      <Upload size={12} className="rotate-180" />
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
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
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
                              <FileText size={18} />
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
                            <X size={14} />
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
                                    <td className="px-3 py-2 mono font-semibold text-blue-600">R.{`${blocks.findIndex(b => b.id === activeBlok) + 1}${(questions.filter(x => x.blokId === activeBlok && !x.parentId).length + idx + 1).toString().padStart(2, '0')}`}</td>
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
                            <span className="w-1 h-1 rounded-full bg-emerald-500" /> Validasi format sukses. Struktur rincian kuesioner siap diimpor.
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

      {/* ─── PETUGAS PREVIEW MODAL ────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6" style={{ animation: 'fadeIn 0.25s ease' }}>
          <div className="bg-slate-50 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative border border-slate-200 flex flex-col h-[680px] max-h-[85vh]" style={{ animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

            {/* App Navigation Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Pratinjau Kuesioner Petugas</h3>
                  <p className="text-[10px] text-blue-100 font-medium">Simulasi pengisian data kuesioner</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-full bg-white/10 border-0 flex items-center justify-center text-white hover:bg-white/20 cursor-pointer transition-all active:scale-[0.9]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Block Switcher Tabs */}
            <div className="bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto px-6 py-3 flex-shrink-0" style={{ display: 'flex', flexWrap: 'nowrap' }}>
              {blocks.map(b => (
                <button
                  key={b.id}
                  onClick={() => setPreviewActiveBlok(b.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all flex-shrink-0 whitespace-nowrap ${previewActiveBlok === b.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  {b.id}: {b.title}
                </button>
              ))}
            </div>

            {/* Simulator Content Area (Scrollable Form Fields) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-blue-50 text-blue-700 rounded-xl p-4 border border-blue-100 text-xs leading-relaxed font-semibold">
                ℹ️ Ini adalah pratinjau interaktif dari kuesioner petugas. Anda dapat mengisi nilai secara langsung di bawah ini untuk menguji form builder.
              </div>

              {(() => {
                const blockQs = questions.filter(q => q.blokId === previewActiveBlok);
                const topLevelQs = blockQs.filter(q => !q.parentId && !q.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                const renderedGroups = new Set();

                return topLevelQs.flatMap(q => {
                  let loopGroupName = "";
                  const qValStr = q.val || q.validation;
                  if (qValStr) {
                    try {
                      const parsed = JSON.parse(qValStr);
                      if (parsed && parsed.loop_group) {
                        loopGroupName = parsed.loop_group;
                      }
                    } catch (e) { }
                  }

                  if (loopGroupName) {
                    if (renderedGroups.has(loopGroupName)) {
                      return [];
                    }
                    renderedGroups.add(loopGroupName);

                    const groupQs = topLevelQs.filter(x => {
                      const v = x.val || x.validation;
                      if (!v) return false;
                      try {
                        const parsed = JSON.parse(v);
                        return parsed && parsed.loop_group === loopGroupName;
                      } catch (e) {
                        return false;
                      }
                    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                    const masterQ = groupQs.find(x => {
                      const v = x.val || x.validation;
                      if (!v) return false;
                      try {
                        const parsed = JSON.parse(v);
                        return parsed && parsed.is_loop && parsed.loop_type === "manual";
                      } catch (e) {
                        return false;
                      }
                    }) || groupQs[0];

                    let loopCount = 1;
                    const manualCount = getManualLoopCount(masterQ);
                    if (manualCount !== null) {
                      loopCount = manualCount;
                    } else {
                      const triggerQ = groupQs.find(x => {
                        const v = x.val || x.validation;
                        if (!v) return false;
                        try {
                          const parsed = JSON.parse(v);
                          return parsed && parsed.is_loop && parsed.loop_type === "question" && parsed.loop_by_question_id;
                        } catch (e) {
                          return false;
                        }
                      });
                      if (triggerQ) {
                        try {
                          const parsed = JSON.parse(triggerQ.val || triggerQ.validation);
                          const triggerValue = previewAnswers[parsed.loop_by_question_id];
                          const parsedTrigger = parseInt(triggerValue, 10);
                          loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
                        } catch (e) { }
                      }
                    }
                    const instances = Array.from({ length: loopCount }, (_, idx) => idx);

                    const isManualLoop = groupQs.some(x => {
                      const v = x.val || x.validation;
                      if (!v) return false;
                      try {
                        const parsed = JSON.parse(v);
                        return parsed && parsed.is_loop && parsed.loop_type === "manual";
                      } catch (e) {
                        return false;
                      }
                    });

                    const resultElements = [];

                    instances.forEach((idx) => {
                      resultElements.push(
                        <div key={`loop_header_${loopGroupName}_${idx}`} className="flex items-center gap-2 py-2 border-b border-solid border-slate-200 mt-6 first:mt-0">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            Isian Ke-{idx + 1}
                          </span>
                        </div>
                      );

                      groupQs.forEach(gq => {
                        const els = renderPreviewQuestionWithChildren(gq, idx);
                        if (els && els.length > 0) {
                          resultElements.push(...els);
                        }
                      });
                    });

                    if (isManualLoop) {
                      resultElements.push(
                        <div key={`loop_controls_${loopGroupName}`} className="flex items-center gap-3 mt-6 p-4 bg-white rounded-xl border border-solid border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleAddManualLoop(masterQ.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                          >
                            <Plus size={14} />
                            Tambah Isian
                          </button>
                          {loopCount > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualLoop(masterQ.id, loopCount)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                            >
                              <X size={14} />
                              Hapus Terakhir
                            </button>
                          )}
                          <span className="text-xs text-slate-500 font-semibold ml-auto">
                            Total: {loopCount} isian
                          </span>
                        </div>
                      );
                    }

                    return resultElements;
                  }

                  return renderPreviewQuestionWithChildren(q);
                });
              })()}

              {questions.filter(q => q.blokId === previewActiveBlok).length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400">
                  <FileText size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold">Blok ini belum memiliki rincian pertanyaan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Paste Confirmation Modal ─────────────────────────────────── */}
      {pasteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ animation: 'fadeIn 0.15s ease' }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPasteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md mx-4" style={{ animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Copy size={16} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Paste Pertanyaan</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Konfirmasi sebelum menyalin pertanyaan</p>
              </div>
              <button onClick={() => setPasteTarget(null)} className="ml-auto p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg border-0 bg-transparent cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Source → Target summary */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">Sumber</p>
                  <p className="text-sm font-bold text-violet-800">{copiedBlockId}</p>
                  <p className="text-[10px] text-violet-400 mt-0.5">
                    {getOrderedQuestionsInBlock(copiedBlockId, questions).length} pertanyaan
                  </p>
                </div>
                <ArrowRight size={18} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Tujuan</p>
                  <p className="text-sm font-bold text-blue-800">{pasteTarget.id}</p>
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    {questions.filter(q => q.blokId === pasteTarget.id).length} pertanyaan saat ini
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Yang akan terjadi:
                </p>
                <ul className="text-[11px] text-amber-700 space-y-1 pl-4 list-disc">
                  <li><strong>{getOrderedQuestionsInBlock(copiedBlockId, questions).length} pertanyaan</strong> dari <strong>{copiedBlockId}</strong> akan ditambahkan di akhir <strong>{pasteTarget.id}</strong></li>
                  <li>Pertanyaan yang sudah ada di blok tujuan <strong>tidak</strong> akan dihapus</li>
                  <li>Nomor rincian (R.{pasteTarget.id?.replace('Blok ', '')}01 dst) otomatis menyesuaikan</li>
                  <li>Relasi sub-pertanyaan, skip logic &amp; show-if ikut tersalin</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-2.5 justify-end">
              <button
                onClick={() => setPasteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl border-0 cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handlePasteBlock(pasteTarget.id)}
                disabled={isPasting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border-0 cursor-pointer transition-all"
              >
                {isPasting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Paste Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Paste Toast Notification ──────────────────────────────────── */}
      {pasteToast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-xs font-semibold border ${pasteToast.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : 'bg-violet-600 text-white border-violet-500'
            }`}
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', minWidth: '280px', maxWidth: '400px' }}
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {pasteToast.type === 'success' ? <Check size={13} /> : <Copy size={13} />}
          </div>
          <span className="flex-1">{pasteToast.msg}</span>
          <button
            onClick={() => setPasteToast(null)}
            className="p-0.5 hover:bg-white/20 rounded border-0 bg-transparent cursor-pointer text-white/80 hover:text-white transition-all"
          >
            <X size={12} />
          </button>
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
        <Variable size={11} /> Variabel
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
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
