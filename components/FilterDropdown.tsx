'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Eye } from 'lucide-react';

type FilterDropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
  intelligence?: number;
  inputPrice?: number;
  outputPrice?: number;
  /** Renders an eye badge so an image-capable option is obvious before it is picked. */
  supportsVision?: boolean;
};

type FilterDropdownProps = {
  name: string;
  value: string;
  onChange?: (value: string) => void;
  options: FilterDropdownOption[];
  ariaLabel: string;
  className?: string;
  wrapLabels?: boolean;
  publicForm?: boolean;
  id?: string;
  required?: boolean;
};

export default function FilterDropdown({ name, value, onChange, options, ariaLabel, className = '', wrapLabels = false, publicForm = false, id, required = false }: FilterDropdownProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [invalid, setInvalid] = useState(false);
  const selectedValue = onChange ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue) || options[0];

  useEffect(() => {
    const form = triggerRef.current?.form;
    function reset() {
      setUncontrolledValue(value);
      setIsOpen(false);
      setInvalid(false);
    }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (dropdownRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {required ? (
        <input
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          value={selectedValue}
          onChange={() => {}}
          required
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus();
          }}
        />
      ) : <input type="hidden" name={name} value={selectedValue} />}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-label={publicForm ? `${ariaLabel}: ${selectedOption?.label || 'Choose one'}` : ariaLabel}
        aria-describedby={invalid && id ? `${id}-error` : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={publicForm ? 'flex w-full items-center justify-between gap-2 min-h-[52px] rounded-[10px] border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-2.5 text-left text-sm font-medium text-[var(--brand-ink)] outline-none transition-colors hover:border-[var(--brand-ink)] focus-visible:border-[var(--brand-ink)] focus-visible:ring-2 focus-visible:ring-[var(--brand-warm)] aria-expanded:border-[var(--brand-ink)] aria-expanded:ring-1 aria-expanded:ring-[var(--brand-warm)]' : `dashboard-filter-dropdown-trigger flex w-full items-center justify-between rounded-[8px] border border-[#A09086] bg-white px-4 text-left text-[13px] font-semibold text-[#142334] outline-none transition-all duration-200 hover:border-[#C9AD98] hover:bg-[#F8F6F4] focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30 ${
          wrapLabels ? 'min-h-11 py-3' : 'h-11'
        }`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${wrapLabels ? 'whitespace-normal break-words leading-snug' : ''}`}>
          <span className={`${wrapLabels ? 'min-w-0' : 'truncate'} ${publicForm && !selectedValue ? 'text-[#62564E]' : ''}`}>{selectedOption?.label || 'Select...'}</span>
          {selectedOption && (selectedOption.intelligence != null || selectedOption.inputPrice != null || selectedOption.outputPrice != null || selectedOption.supportsVision) && (
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-normal text-[#6B6B6B]">
              {selectedOption.supportsVision && (
                <Eye className="h-3.5 w-3.5 text-[#8C7466]" aria-label="Reads images" >
                  <title>Reads images</title>
                </Eye>
              )}
              {selectedOption.intelligence != null && <span title="Intelligence Score">🧠 {selectedOption.intelligence}</span>}
              {selectedOption.inputPrice != null && <span title="Input Price per 1M tokens">↓${selectedOption.inputPrice}</span>}
              {selectedOption.outputPrice != null && <span title="Output Price per 1M tokens">↑${selectedOption.outputPrice}</span>}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${publicForm ? 'text-[#756458]' : 'text-[#A09086]'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {invalid && <p id={id ? `${id}-error` : undefined} className="mt-1 text-sm text-red-700">Choose an option.</p>}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-lenis-prevent-wheel
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={publicForm ? 'absolute left-0 top-full z-[100] mt-2 max-h-[280px] w-full overflow-y-auto rounded-[10px] border border-[#CDC6C3] bg-white shadow-lg shadow-[#142334]/10' : 'dashboard-filter-dropdown-menu absolute left-0 top-full z-[300] mt-2 max-h-[280px] w-full overflow-y-auto rounded-[8px] border border-[#A09086] bg-white shadow-xl shadow-[#142334]/12'}
          >
            {options.filter((option) => !publicForm || option.value !== '').map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    if (onChange) {
                      onChange(option.value);
                    } else {
                      setUncontrolledValue(option.value);
                    }
                    setIsOpen(false);
                    setInvalid(false);
                    triggerRef.current?.focus();
                  }}
                  className={publicForm ? `w-full border-b border-[var(--brand-scroll-track)] px-4 py-2.5 text-left text-sm text-[var(--brand-ink)] transition-colors last:border-0 enabled:hover:bg-[var(--brand-scroll-track)] enabled:focus-visible:bg-[var(--brand-scroll-track)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand-ink)] disabled:text-[#62564E] ${isSelected ? 'bg-[var(--brand-scroll-track)] font-semibold' : ''}` : `w-full border-b border-[#F0E8E0] px-4 py-3 text-left text-[13px] font-semibold text-[#142334] transition-all duration-200 ease-out last:border-0 hover:bg-[#F5F0EA] hover:pl-5 ${
                    wrapLabels ? 'whitespace-normal break-words leading-snug' : ''
                  } ${
                    isSelected ? 'bg-[#F2ECE7]' : ''
                  } ${option.disabled ? 'cursor-not-allowed text-[#A09086] hover:bg-white hover:pl-4' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={wrapLabels ? 'min-w-0 whitespace-normal break-words leading-snug' : 'truncate'}>{option.label}</span>
                    {publicForm && isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                    {(option.intelligence != null || option.inputPrice != null || option.outputPrice != null || option.supportsVision) && (
                      <span className="flex shrink-0 items-center gap-2 text-[11px] font-normal text-[#6B6B6B]">
                        {option.supportsVision && (
                          <Eye className="h-3.5 w-3.5 text-[#8C7466]" aria-label="Reads images">
                            <title>Reads images</title>
                          </Eye>
                        )}
                        {option.intelligence != null && <span title="Intelligence Score">🧠 {option.intelligence}</span>}
                        {option.inputPrice != null && <span title="Input Price per 1M tokens">↓${option.inputPrice}</span>}
                        {option.outputPrice != null && <span title="Output Price per 1M tokens">↑${option.outputPrice}</span>}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
