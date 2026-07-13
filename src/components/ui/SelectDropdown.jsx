import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom dropdown component with a sleek UI matching the application's design system.
 * Replaces standard HTML <select> elements. Supports native <option> children.
 *
 * @param {Object} props
 * @param {string} props.value - The currently selected value.
 * @param {Function} props.onChange - Callback fired when an option is selected. Passes a fake event { target: { value } }.
 * @param {Array<{value: string|number, label: string}>} [props.options] - Optional list of options. If not provided, it parses children.
 * @param {string} [props.className] - Extra CSS classes for the container.
 * @param {string} [props.buttonClassName] - Extra CSS classes for the toggle button.
 * @param {'left'|'right'} [props.align] - Alignment of the dropdown menu.
 * @param {'default'|'form'} [props.variant] - Visual style variant. 'default' is blue button, 'form' is white bordered.
 */
function SelectDropdown({
  value,
  onChange,
  options = [],
  className = '',
  buttonClassName = '',
  align = 'left',
  variant = 'default',
  children,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Parse children if options array is not provided
  let finalOptions = options;
  if (finalOptions.length === 0 && children) {
    const parseChildren = (nodes) => {
      let opts = [];
      React.Children.toArray(nodes).forEach(child => {
        if (!child) return;
        if (child.props && child.props.value !== undefined) {
          opts.push({ value: child.props.value, label: child.props.children });
        } else if (child.props && child.props.children) {
           opts = opts.concat(parseChildren(child.props.children));
        }
      });
      return opts;
    };
    finalOptions = parseChildren(children);
  }

  const selectedOption = finalOptions.find(opt => opt.value === value || opt.value == value);
  const displayLabel = selectedOption ? selectedOption.label : (value || 'Pilih...');

  const baseVariantCls = variant === 'form' 
    ? "flex items-center justify-between gap-2 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
    : variant === 'bare'
    ? "flex items-center justify-between gap-2 w-full focus:outline-none cursor-pointer"
    : "flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
    
  const alignmentCls = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div className={`relative inline-block min-w-0 ${variant === 'form' || variant === 'bare' ? 'w-full' : ''}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-w-0 ${baseVariantCls} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${className} ${buttonClassName}`}
      >
        <span className="truncate min-w-0">{displayLabel}</span>
        <ChevronDown 
          size={14} 
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${variant==='form' || variant==='bare' ? 'text-slate-400' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute ${alignmentCls} top-full mt-1.5 bg-white rounded-xl shadow-xl z-50 py-1.5 border border-slate-100 min-w-[140px] ${variant === 'form' || variant === 'bare' ? 'w-full' : ''} overflow-hidden max-h-60 overflow-y-auto flex flex-col`}
          style={{ animation: 'scaleIn 0.15s ease' }}
        >
          {finalOptions.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              onClick={() => {
                if (onChange) {
                  // Simulate event object for native onChange handlers, or pass value directly if it doesn't look like an event handler
                  // Actually, to be safe, just pass both or simulate the event
                  onChange({ target: { value: opt.value } });
                }
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                value === opt.value
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {finalOptions.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ada opsi</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectDropdown;
