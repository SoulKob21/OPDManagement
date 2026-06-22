import React, { useState, useRef, useEffect } from 'react';

interface BuddhistDateInputProps {
  value: string; // CE date string YYYY-MM-DD
  onChange: (ceDate: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const formatToBuddhistDate = (ceDate: string): string => {
  if (!ceDate) return '';
  const parts = ceDate.split('-');
  if (parts.length !== 3) return ceDate;
  const [year, month, day] = parts;
  const beYear = parseInt(year, 10) + 543;
  const monthIdx = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${THAI_MONTHS_SHORT[monthIdx]} ${beYear}`;
};

const parseBuddhistDateInput = (inputText: string): string | null => {
  if (!inputText) return null;
  const text = inputText.trim();

  const hasThai = /[\u0e00-\u0e7f]/.test(text);

  // 1. If it contains Thai characters, parse as Thai text format (e.g. "12 ธ.ค. 2570")
  if (hasThai) {
    const parts = text.split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1];
      const beYear = parseInt(parts[2], 10);
      const ceYear = beYear - 543;
      
      let monthIdx = THAI_MONTHS.findIndex(m => m.includes(monthStr));
      if (monthIdx === -1) {
        monthIdx = THAI_MONTHS_SHORT.findIndex(m => m.replace(/\./g, '') === monthStr.replace(/\./g, ''));
      }
      
      if (day >= 1 && day <= 31 && monthIdx !== -1 && ceYear > 1900 && ceYear < 2100) {
        const month = monthIdx + 1;
        const dObj = new Date(ceYear, monthIdx, day);
        if (dObj.getFullYear() === ceYear && dObj.getMonth() === monthIdx && dObj.getDate() === day) {
          return `${ceYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    return null;
  }

  // 2. Check if contains separators (/ or - or .)
  if (/[\/\-\.]/.test(text)) {
    const parts = text.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let beYear = parseInt(parts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(beYear)) return null;

      if (beYear < 100) {
        beYear += 2500;
      }
      const ceYear = beYear - 543;
      
      // Validate date validity
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && ceYear > 1900 && ceYear < 2100) {
        const dObj = new Date(ceYear, month - 1, day);
        if (dObj.getFullYear() === ceYear && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
          return `${ceYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    return null;
  }

  // 3. If it is a raw digit string (4 to 8 digits)
  if (/^\d+$/.test(text)) {
    const L = text.length;
    if (L < 4 || L > 8) return null;

    const tryCandidate = (d: number, m: number, y: number): string | null => {
      let finalYear = y;
      if (y < 100) {
        finalYear += 2500;
      }
      const ceYear = finalYear - 543;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && ceYear > 1900 && ceYear < 2100) {
        const dObj = new Date(ceYear, m - 1, d);
        if (dObj.getFullYear() === ceYear && dObj.getMonth() === m - 1 && dObj.getDate() === d) {
          return `${ceYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
      return null;
    };

    if (L === 8) {
      // DDMMYYYY
      const d = parseInt(text.substring(0, 2), 10);
      const m = parseInt(text.substring(2, 4), 10);
      const y = parseInt(text.substring(4, 8), 10);
      const res = tryCandidate(d, m, y);
      if (res) return res;
    } else if (L === 7) {
      // DDMYYYY or DMMYYYY
      // Try DDMYYYY first (e.g. 1212570 -> 12, 1, 2570)
      const d1 = parseInt(text.substring(0, 2), 10);
      const m1 = parseInt(text.substring(2, 3), 10);
      const y1 = parseInt(text.substring(3, 7), 10);
      let res = tryCandidate(d1, m1, y1);
      if (res) return res;

      // Try DMMYYYY (e.g. 1122570 -> 1, 12, 2570)
      const d2 = parseInt(text.substring(0, 1), 10);
      const m2 = parseInt(text.substring(1, 3), 10);
      const y2 = parseInt(text.substring(3, 7), 10);
      res = tryCandidate(d2, m2, y2);
      if (res) return res;
    } else if (L === 6) {
      // DDMMYY (e.g. 121270 -> 12, 12, 70)
      const d1 = parseInt(text.substring(0, 2), 10);
      const m1 = parseInt(text.substring(2, 4), 10);
      const y1 = parseInt(text.substring(4, 6), 10);
      let res = tryCandidate(d1, m1, y1);
      if (res) return res;

      // DMYYYY (e.g. 112570 -> 1, 1, 2570)
      const d2 = parseInt(text.substring(0, 1), 10);
      const m2 = parseInt(text.substring(1, 2), 10);
      const y2 = parseInt(text.substring(2, 6), 10);
      res = tryCandidate(d2, m2, y2);
      if (res) return res;
    } else if (L === 5) {
      // DDMYY (e.g. 12170 -> 12, 1, 70)
      const d1 = parseInt(text.substring(0, 2), 10);
      const m1 = parseInt(text.substring(2, 3), 10);
      const y1 = parseInt(text.substring(3, 5), 10);
      let res = tryCandidate(d1, m1, y1);
      if (res) return res;

      // DMMYY (e.g. 11270 -> 1, 12, 70)
      const d2 = parseInt(text.substring(0, 1), 10);
      const m2 = parseInt(text.substring(1, 3), 10);
      const y2 = parseInt(text.substring(3, 5), 10);
      res = tryCandidate(d2, m2, y2);
      if (res) return res;
    } else if (L === 4) {
      // DMYY (e.g. 1170 -> 1, 1, 70)
      const d = parseInt(text.substring(0, 1), 10);
      const m = parseInt(text.substring(1, 2), 10);
      const y = parseInt(text.substring(2, 4), 10);
      const res = tryCandidate(d, m, y);
      if (res) return res;
    }
    return null;
  }

  return null;
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const BuddhistDateInput: React.FC<BuddhistDateInputProps> = ({
  value,
  onChange,
  max,
  min,
  placeholder = 'เลือกวันที่ (พ.ศ.)',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typedValue, setTypedValue] = useState('');
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0], 10);
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1], 10) - 1;
    return new Date().getMonth();
  });
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Parse min/max dates
  const minDate = min ? new Date(min + 'T00:00:00') : null;
  const maxDate = max ? new Date(max + 'T00:00:00') : null;

  const isDateDisabled = (year: number, month: number, day: number): boolean => {
    const d = new Date(year, month, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  // Sync typed value with selected CE date value
  useEffect(() => {
    if (value) {
      setTypedValue(formatToBuddhistDate(value));
    } else {
      setTypedValue('');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Recalculate drop direction when open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 380);
    }
  }, [isOpen]);

  const handleSelectDate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    handleSelectDate(now.getDate());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setTypedValue('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedValue(e.target.value);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const calendarDays: { day: number; type: 'prev' | 'current' | 'next'; disabled: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({ day: d, type: 'prev', disabled: isDateDisabled(prevY, prevM, d) });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, type: 'current', disabled: isDateDisabled(viewYear, viewMonth, d) });
  }

  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({ day: d, type: 'next', disabled: isDateDisabled(nextY, nextM, d) });
  }

  const isSelected = (day: number, type: string): boolean => {
    if (!value || type !== 'current') return false;
    const selectedStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedStr === value;
  };

  const isToday = (day: number, type: string): boolean => {
    if (type !== 'current') return false;
    const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dayStr === todayStr;
  };

  return (
    <div className="cal-container" ref={containerRef}>
      {/* Input container allowing typing and calendar button */}
      <div
        className={`cal-input ${isOpen ? 'cal-input-active' : ''} ${disabled ? 'cal-input-disabled' : ''}`}
        style={{ padding: 0 }}
      >
        <input
          type="text"
          className="form-input"
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            boxShadow: 'none',
            width: '100%',
            height: '100%',
            padding: '0.625rem 0.875rem',
            fontSize: 'inherit',
            fontWeight: value ? 500 : 400,
            color: 'inherit',
          }}
          value={typedValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!typedValue.trim()) {
                onChange('');
                setTypedValue('');
                setIsOpen(false);
                return;
              }
              const parsed = parseBuddhistDateInput(typedValue);
              if (parsed) {
                onChange(parsed);
                setTypedValue(formatToBuddhistDate(parsed));
                setViewYear(parseInt(parsed.split('-')[0], 10));
                setViewMonth(parseInt(parsed.split('-')[1], 10) - 1);
              } else {
                onChange('');
                setTypedValue('');
              }
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!typedValue.trim()) {
                onChange('');
                setTypedValue('');
                return;
              }
              const parsed = parseBuddhistDateInput(typedValue);
              if (parsed) {
                onChange(parsed);
                setTypedValue(formatToBuddhistDate(parsed));
              } else {
                onChange('');
                setTypedValue('');
              }
            }, 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && !disabled && (
          <svg
            className="cal-input-icon cal-clear-icon"
            onMouseDown={(e) => {
              // Prevent input from losing focus
              e.preventDefault();
            }}
            onClick={handleClear}
            style={{ marginRight: '0.375rem', cursor: 'pointer' }}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        <svg
          className="cal-input-icon"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          style={{ marginRight: '0.875rem', cursor: 'pointer' }}
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      {/* Calendar dropdown */}
      {isOpen && (
        <div
          className={`cal-dropdown ${dropUp ? 'cal-dropdown-up' : ''}`}
          ref={calendarRef}
          onMouseDown={(e) => {
            // Prevent input from losing focus, which prevents onBlur from clearing the selected date
            e.preventDefault();
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="cal-header">
            <button type="button" className="cal-nav-btn" onClick={handlePrevMonth} aria-label="เดือนก่อนหน้า">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="cal-title">
              <span className="cal-title-month">{THAI_MONTHS[viewMonth]}</span>
              <span className="cal-title-year">พ.ศ. {viewYear + 543}</span>
            </div>
            <button type="button" className="cal-nav-btn" onClick={handleNextMonth} aria-label="เดือนถัดไป">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Day-of-week labels */}
          <div className="cal-weekdays">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div key={i} className={`cal-weekday ${i === 0 ? 'cal-weekday-sun' : ''}`}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="cal-days">
            {calendarDays.map((cell, idx) => {
              const selected = isSelected(cell.day, cell.type);
              const todayMark = isToday(cell.day, cell.type);
              const isSun = idx % 7 === 0;

              let className = 'cal-day';
              if (cell.type !== 'current') className += ' cal-day-outside';
              if (cell.disabled) className += ' cal-day-disabled';
              if (selected) className += ' cal-day-selected';
              if (todayMark && !selected) className += ' cal-day-today';
              if (isSun && cell.type === 'current') className += ' cal-day-sun';

              return (
                <button
                  key={idx}
                  type="button"
                  className={className}
                  disabled={cell.disabled || cell.type !== 'current'}
                  onClick={() => {
                    if (cell.type === 'current' && !cell.disabled) handleSelectDate(cell.day);
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="cal-footer">
            <button type="button" className="cal-footer-btn" onClick={handleToday}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              วันนี้
            </button>
            {value && (
              <button type="button" className="cal-footer-btn cal-footer-clear" onClick={handleClear}>
                ล้าง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuddhistDateInput;
