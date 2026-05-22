'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Clock3 } from 'lucide-react';

type DashboardTimePickerProps = {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel: string;
  placeholder: string;
  disabled?: boolean;
};

function toTimeValue(index: number) {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function formatTimeLabel(value?: string) {
  if (!value) return '';
  const [rawHour, minute = '00'] = value.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minute.padStart(2, '0')} ${period}`;
}

const defaultTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const value = toTimeValue(index);
  return {
    value,
    label: formatTimeLabel(value),
  };
});

export default function DashboardTimePicker({
  name,
  value = '',
  onChange,
  ariaLabel,
  placeholder,
  disabled = false,
}: DashboardTimePickerProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedValue = onChange ? value : uncontrolledValue;

  const options = useMemo(() => {
    if (!selectedValue || defaultTimeOptions.some((option) => option.value === selectedValue)) {
      return defaultTimeOptions;
    }

    return [...defaultTimeOptions, { value: selectedValue, label: formatTimeLabel(selectedValue) || selectedValue }].sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }, [selectedValue]);

  const selectedLabel = formatTimeLabel(selectedValue);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function chooseTime(nextValue: string) {
    if (onChange) {
      onChange(nextValue);
    } else {
      setUncontrolledValue(nextValue);
    }
    setIsOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className={`dashboard-time-picker-trigger flex h-11 w-full items-center justify-between rounded-[8px] border border-[#D8C8BB] bg-white px-4 text-left text-[13px] font-semibold text-[#142334] outline-none transition-all duration-200 hover:border-[#C9AD98] hover:bg-[#F8F6F4] focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30 ${
          disabled ? 'cursor-not-allowed bg-[#F8F6F4] text-[#A09086] hover:border-[#D8C8BB] hover:bg-[#F8F6F4]' : ''
        }`}
      >
        <span className={selectedLabel ? 'truncate' : 'truncate text-[#7C6F66]'}>{selectedLabel || placeholder}</span>
        <span className="ml-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-[#A09086]" />
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#A09086] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="dashboard-time-picker-popover absolute left-0 top-full z-[110] mt-2 max-h-[280px] w-full overflow-y-auto rounded-[8px] border border-[#D8C8BB] bg-white shadow-xl shadow-[#142334]/12"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseTime(option.value)}
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
