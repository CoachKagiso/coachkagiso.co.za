'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

type FilterDropdownOption = {
  value: string;
  label: string;
  intelligence?: number;
  inputPrice?: number;
  outputPrice?: number;
};

type FilterDropdownProps = {
  name: string;
  value: string;
  onChange?: (value: string) => void;
  options: FilterDropdownOption[];
  ariaLabel: string;
  className?: string;
  wrapLabels?: boolean;
};

export default function FilterDropdown({ name, value, onChange, options, ariaLabel, className = '', wrapLabels = false }: FilterDropdownProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedValue = onChange ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue) || options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
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
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`dashboard-filter-dropdown-trigger flex w-full items-center justify-between rounded-[8px] border border-[#A09086] bg-white px-4 text-left text-[13px] font-semibold text-[#142334] outline-none transition-all duration-200 hover:border-[#C9AD98] hover:bg-[#F8F6F4] focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30 ${
          wrapLabels ? 'min-h-11 py-3' : 'h-11'
        }`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${wrapLabels ? 'whitespace-normal break-words leading-snug' : ''}`}>
          <span className={wrapLabels ? 'min-w-0' : 'truncate'}>{selectedOption?.label || 'Select...'}</span>
          {selectedOption && (selectedOption.intelligence != null || selectedOption.inputPrice != null || selectedOption.outputPrice != null) && (
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-normal text-[#6B6B6B]">
              {selectedOption.intelligence != null && <span title="Intelligence Score">🧠 {selectedOption.intelligence}</span>}
              {selectedOption.inputPrice != null && <span title="Input Price per 1M tokens">↓${selectedOption.inputPrice}</span>}
              {selectedOption.outputPrice != null && <span title="Output Price per 1M tokens">↑${selectedOption.outputPrice}</span>}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#A09086] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="dashboard-filter-dropdown-menu absolute left-0 top-full z-[300] mt-2 max-h-[280px] w-full overflow-y-auto rounded-[8px] border border-[#A09086] bg-white shadow-xl shadow-[#142334]/12"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (onChange) {
                      onChange(option.value);
                    } else {
                      setUncontrolledValue(option.value);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full border-b border-[#F0E8E0] px-4 py-3 text-left text-[13px] font-semibold text-[#142334] transition-all duration-200 ease-out last:border-0 hover:bg-[#F5F0EA] hover:pl-5 ${
                    wrapLabels ? 'whitespace-normal break-words leading-snug' : ''
                  } ${
                    isSelected ? 'bg-[#F2ECE7]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={wrapLabels ? 'min-w-0 whitespace-normal break-words leading-snug' : 'truncate'}>{option.label}</span>
                    {(option.intelligence != null || option.inputPrice != null || option.outputPrice != null) && (
                      <span className="flex shrink-0 items-center gap-2 text-[11px] font-normal text-[#6B6B6B]">
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
