'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

type FilterDropdownOption = {
  value: string;
  label: string;
};

type FilterDropdownProps = {
  name: string;
  value: string;
  options: FilterDropdownOption[];
  ariaLabel: string;
};

export default function FilterDropdown({ name, value, options, ariaLabel }: FilterDropdownProps) {
  const [selectedValue, setSelectedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    <div ref={dropdownRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="dashboard-filter-dropdown-trigger flex h-11 w-full items-center justify-between rounded-[8px] border border-[#D8C8BB] bg-white px-4 text-left text-[13px] font-semibold text-[#142334] outline-none transition-all duration-200 hover:border-[#C9AD98] hover:bg-[#F8F6F4] focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
      >
        <span className="truncate">{selectedOption?.label || 'Select...'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#A09086] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="dashboard-filter-dropdown-menu absolute left-0 top-full z-[100] mt-2 max-h-[280px] w-full overflow-y-auto rounded-[8px] border border-[#D8C8BB] bg-white shadow-xl shadow-[#142334]/12"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedValue(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full border-b border-[#F0E8E0] px-4 py-3 text-left text-[13px] font-semibold text-[#142334] transition-all duration-200 ease-out last:border-0 hover:bg-[#F5F0EA] hover:pl-5 ${
                    isSelected ? 'bg-[#F2ECE7]' : ''
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
