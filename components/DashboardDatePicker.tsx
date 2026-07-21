'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

type DashboardDatePickerProps = {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel: string;
  placeholder: string;
};

const monthFormatter = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' });
const displayFormatter = new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parseDateValue(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date | null, b: Date) {
  return Boolean(a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      value: toDateValue(date),
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

export default function DashboardDatePicker({ name, value = '', onChange, ariaLabel, placeholder }: DashboardDatePickerProps) {
  const initialDate = parseDateValue(value);
  const [uncontrolledValue, setUncontrolledValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(initialDate || new Date());
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedValue = onChange ? value : uncontrolledValue;

  const selectedDate = parseDateValue(selectedValue);
  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const today = useMemo(() => new Date(), []);

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

  function moveMonth(amount: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function chooseDate(date: Date) {
    const nextValue = toDateValue(date);
    if (onChange) {
      onChange(nextValue);
    } else {
      setUncontrolledValue(nextValue);
    }
    setViewDate(date);
    setIsOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen && selectedDate) setViewDate(selectedDate);
          setIsOpen((current) => !current);
        }}
        className="dashboard-date-picker-trigger flex h-11 w-full items-center justify-between rounded-[8px] border border-[#A09086] bg-white px-4 text-left text-[13px] font-semibold text-[#142334] outline-none transition-all duration-200 hover:border-[#C9AD98] hover:bg-[#F8F6F4] focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
      >
        <span className={selectedDate ? 'truncate' : 'truncate text-[#7C6F66]'}>
          {selectedDate ? displayFormatter.format(selectedDate) : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-[#A09086] transition-transform duration-200 group-hover:scale-105" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="dashboard-date-picker-popover absolute left-0 top-full z-[110] mt-2 w-[min(320px,calc(100vw-48px))] rounded-[10px] border border-[#A09086] bg-white p-3 shadow-xl shadow-[#142334]/14"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
                className="grid h-9 w-9 place-items-center rounded-[8px] text-[#6B5F57] transition hover:bg-[#F5F0EA] hover:text-[#142334]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[13px] font-bold text-[#142334]">{monthFormatter.format(viewDate)}</p>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
                className="grid h-9 w-9 place-items-center rounded-[8px] text-[#6B5F57] transition hover:bg-[#F5F0EA] hover:text-[#142334]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day, index) => (
                <span key={`${day}-${index}`} className="py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A09086]">
                  {day}
                </span>
              ))}
              {calendarDays.map((item) => {
                const selected = isSameDay(selectedDate, item.date);
                const currentDay = isSameDay(today, item.date);

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => chooseDate(item.date)}
                    className={`grid h-9 place-items-center rounded-[8px] text-[12px] font-semibold transition-all duration-200 ease-out hover:bg-[#F5F0EA] hover:text-[#142334] ${
                      item.inCurrentMonth ? 'text-[#142334]' : 'text-[#B8AEA6]'
                    } ${currentDay ? 'ring-1 ring-[#C9AD98]' : ''} ${selected ? 'bg-[#142334] text-white hover:bg-[#142334] hover:text-white' : ''}`}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#F0E8E0] pt-3">
              <button
                type="button"
                onClick={() => {
                  const nextToday = new Date();
                  chooseDate(nextToday);
                }}
                className="rounded-[8px] bg-[#F5F0EA] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#EADDD2]"
              >
                Today
              </button>
              {selectedValue && (
                <button
                  type="button"
                onClick={() => {
                    if (onChange) {
                      onChange('');
                    } else {
                      setUncontrolledValue('');
                    }
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-[8px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7C6F66] transition hover:bg-[#F8F6F4] hover:text-[#142334]"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
