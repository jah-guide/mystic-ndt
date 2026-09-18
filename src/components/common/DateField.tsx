import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

type PickerView = 'day' | 'month' | 'year';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  hint?: string;
  /** Inclusive minimum YYYY-MM-DD (days before are not selectable) */
  minDate?: string;
  /** Inclusive maximum YYYY-MM-DD */
  maxDate?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), 1);
}

function clampDayInMonth(year: number, month: number, day: number): number {
  const max = new Date(year, month + 1, 0).getDate();
  return Math.min(day, max);
}

function isBefore(a: string, b: string): boolean {
  return a < b;
}

function isAfter(a: string, b: string): boolean {
  return a > b;
}

function dayDisabled(key: string, minDate?: string, maxDate?: string): boolean {
  if (minDate && isBefore(key, minDate)) return true;
  if (maxDate && isAfter(key, maxDate)) return true;
  return false;
}

function monthFullyDisabled(year: number, month: number, minDate?: string, maxDate?: string): boolean {
  const start = `${year}-${pad(month + 1)}-01`;
  const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
  if (minDate && isAfter(minDate, end)) return true;
  if (maxDate && isBefore(maxDate, start)) return true;
  return false;
}

function yearFullyDisabled(year: number, minDate?: string, maxDate?: string): boolean {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  if (minDate && isAfter(minDate, end)) return true;
  if (maxDate && isBefore(maxDate, start)) return true;
  return false;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const POPOVER_MIN_WIDTH = 280;
const POPOVER_EST_HEIGHT = 340;
const YEAR_PAGE = 12;

export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  required,
  disabled,
  clearable,
  id,
  className = '',
  hint,
  minDate,
  maxDate
}) => {
  const [open, setOpen] = useState(false);
  const [pickerView, setPickerView] = useState<PickerView>('day');
  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected || new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (selected) setViewMonth(startOfMonth(selected));
  }, [value]);

  useEffect(() => {
    if (open) setPickerView('day');
  }, [open]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, POPOVER_MIN_WIDTH);
    const popH = popoverRef.current?.offsetHeight || POPOVER_EST_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < popH + 8 && rect.top > spaceBelow;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const top = openUp
      ? Math.max(8, rect.top - popH - 6)
      : rect.bottom + 6;
    setPos({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [open, pickerView]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerView === 'year') setPickerView('month');
        else if (pickerView === 'month') setPickerView('day');
        else setOpen(false);
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, pickerView]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toKey(new Date());
  const yearPageStart = Math.floor(year / YEAR_PAGE) * YEAR_PAGE;

  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pad-${i}`, day: 0, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${year}-${month}-${d}`, day: d, inMonth: true });
  }

  const selectDay = (day: number) => {
    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
    if (dayDisabled(key, minDate, maxDate)) return;
    onChange(key);
    setOpen(false);
  };

  const selectMonth = (m: number) => {
    if (monthFullyDisabled(year, m, minDate, maxDate)) return;
    const day = selected ? selected.getDate() : 1;
    setViewMonth(new Date(year, m, clampDayInMonth(year, m, day)));
    setPickerView('day');
  };

  const selectYear = (y: number) => {
    if (yearFullyDisabled(y, minDate, maxDate)) return;
    const day = selected ? selected.getDate() : 1;
    setViewMonth(new Date(y, month, clampDayInMonth(y, month, day)));
    setPickerView('month');
  };

  const navigatePrev = () => {
    if (pickerView === 'day') setViewMonth(m => addMonths(m, -1));
    else if (pickerView === 'month') setViewMonth(m => addYears(m, -1));
    else setViewMonth(m => addYears(m, -YEAR_PAGE));
  };

  const navigateNext = () => {
    if (pickerView === 'day') setViewMonth(m => addMonths(m, 1));
    else if (pickerView === 'month') setViewMonth(m => addYears(m, 1));
    else setViewMonth(m => addYears(m, YEAR_PAGE));
  };

  const display = value ? formatDate(value) : 'Select date';
  const monthLabel = viewMonth.toLocaleDateString('en-ZA', { month: 'long' });

  const cellBtn = (opts: {
    key: string;
    label: string | number;
    selected?: boolean;
    today?: boolean;
    disabled?: boolean;
    onClick: () => void;
    tall?: boolean;
  }) => (
    <button
      key={opts.key}
      type="button"
      disabled={opts.disabled}
      onClick={opts.onClick}
      className={`${opts.tall ? 'h-11' : 'h-9'} rounded-lg text-xs font-semibold transition-colors ${
        opts.disabled
          ? 'text-slate-600 cursor-not-allowed'
          : opts.selected
          ? 'bg-sky-600 text-white'
          : opts.today
          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
          : 'text-slate-200 hover:bg-slate-800'
      }`}
    >
      {opts.label}
    </button>
  );

  const headerTitle =
    pickerView === 'day' ? (
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          onClick={() => setPickerView('month')}
          className="px-1.5 py-0.5 rounded-md text-sm font-bold text-white hover:bg-slate-800 hover:text-sky-300"
        >
          {monthLabel}
        </button>
        <button
          type="button"
          onClick={() => setPickerView('year')}
          className="px-1.5 py-0.5 rounded-md text-sm font-bold text-white hover:bg-slate-800 hover:text-sky-300"
        >
          {year}
        </button>
      </div>
    ) : pickerView === 'month' ? (
      <button
        type="button"
        onClick={() => setPickerView('year')}
        className="px-1.5 py-0.5 rounded-md text-sm font-bold text-white hover:bg-slate-800 hover:text-sky-300"
      >
        {year}
      </button>
    ) : (
      <span className="text-sm font-bold text-white px-1.5">
        {yearPageStart} – {yearPageStart + YEAR_PAGE - 1}
      </span>
    );

  const popover =
    open &&
    pos &&
    createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Choose date"
        className="fixed z-[200] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-3"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <button
            type="button"
            onClick={navigatePrev}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 shrink-0"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {headerTitle}
          <button
            type="button"
            onClick={navigateNext}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 shrink-0"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {pickerView === 'day' && (
          <>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-[10px] font-bold text-slate-500 text-center py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map(cell => {
                if (!cell.inMonth) {
                  return <div key={cell.key} className="h-9" />;
                }
                const key = `${year}-${pad(month + 1)}-${pad(cell.day)}`;
                return cellBtn({
                  key: cell.key,
                  label: cell.day,
                  selected: value === key,
                  today: todayKey === key,
                  disabled: dayDisabled(key, minDate, maxDate),
                  onClick: () => selectDay(cell.day)
                });
              })}
            </div>
          </>
        )}

        {pickerView === 'month' && (
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, m) =>
              cellBtn({
                key: `m-${m}`,
                label,
                tall: true,
                selected: selected?.getFullYear() === year && selected?.getMonth() === m,
                today: new Date().getFullYear() === year && new Date().getMonth() === m,
                disabled: monthFullyDisabled(year, m, minDate, maxDate),
                onClick: () => selectMonth(m)
              })
            )}
          </div>
        )}

        {pickerView === 'year' && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: YEAR_PAGE }, (_, i) => yearPageStart + i).map(y =>
              cellBtn({
                key: `y-${y}`,
                label: y,
                tall: true,
                selected: selected?.getFullYear() === y,
                today: new Date().getFullYear() === y,
                disabled: yearFullyDisabled(y, minDate, maxDate),
                onClick: () => selectYear(y)
              })
            )}
          </div>
        )}

        {pickerView !== 'day' && (
          <button
            type="button"
            onClick={() => setPickerView(pickerView === 'year' ? 'month' : 'day')}
            className="mt-3 w-full text-[11px] font-semibold text-sky-400 hover:text-sky-300 py-1"
          >
            Back to {pickerView === 'year' ? 'months' : 'days'}
          </button>
        )}
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}{required && ' *'}
        </label>
      )}
      <div className="flex gap-2">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              const el = triggerRef.current;
              if (el) {
                const rect = el.getBoundingClientRect();
                const width = Math.max(rect.width, POPOVER_MIN_WIDTH);
                let left = rect.left;
                if (left + width > window.innerWidth - 8) {
                  left = Math.max(8, window.innerWidth - width - 8);
                }
                setPos({ top: rect.bottom + 6, left, width });
              }
              setOpen(true);
            } else {
              setOpen(false);
            }
          }}
          className={`flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border text-left text-sm transition-colors ${
            disabled
              ? 'border-slate-800 text-slate-500 cursor-not-allowed'
              : open
              ? 'border-sky-500 text-white ring-1 ring-sky-500/40'
              : 'border-slate-700 text-white hover:border-slate-500'
          }`}
        >
          <span className={value ? 'text-white' : 'text-slate-500'}>{display}</span>
          <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
        </button>
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
            aria-label="Clear date"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
      {popover}
    </div>
  );
};

/** Local calendar YYYY-MM-DD for "today" (avoids UTC shift from toISOString). */
export function todayKey(): string {
  return toKey(new Date());
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDaysToKey(dateKey: string, days: number): string {
  const d = parseValue(dateKey);
  if (!d) return dateKey;
  d.setDate(d.getDate() + days);
  return toKey(d);
}
