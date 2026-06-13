import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

/**
 * Searchable Select / Dropdown Component.
 *
 * @param {Object} props
 * @param {string} props.value - Selected value.
 * @param {Array} props.options - Array of { value, label } options.
 * @param {boolean} [props.disabled] - Disabled state.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {function} props.onChange - Triggered when selection changes.
 */
function SearchableSelect({ value, options = [], disabled, placeholder = "Pilih opsi...", onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search query when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    String(opt.value).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm bg-white border border-solid rounded-xl outline-none transition-all text-left ${
          isOpen ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200"
        } ${disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "cursor-pointer text-slate-800 font-medium"}`}
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400 font-normal"}>
          {selectedOption ? `${selectedOption.value}. ${selectedOption.label}` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-solid border-slate-150 rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-72 flex flex-col">
          {/* Search Input Area */}
          <div className="p-3 border-b border-solid border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari opsi..."
              className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none border-none p-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0 outline-none"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-left border-0 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "bg-transparent text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.value}. {opt.label}</span>
                    {isSelected && <Check size={14} className="text-blue-600 stroke-[3px]" />}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                Tidak ada opsi yang cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
