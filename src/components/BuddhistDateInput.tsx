import React, { useState, useRef, useEffect, useCallback } from 'react';

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

  // Determine drop direction
  const handleOpen = useCallback(() => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 380);
    }
    setIsOpen(!isOpen);
    // Sync view to current value
    if (!isOpen && value) {
      setViewYear(parseInt(value.split('-')[0], 10));
      setViewMonth(parseInt(value.split('-')[1], 10) - 1);
    }
  }, [disabled, isOpen, value]);

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
    setIsOpen(false);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const calendarDays: { day: number; type: 'prev' | 'current' | 'next'; disabled: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({ day: d, type: 'prev', disabled: isDateDisabled(prevY, prevM, d) });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, type: 'current', disabled: isDateDisabled(viewYear, viewMonth, d) });
  }

  // Next month leading days
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({ day: d, type: 'next', disabled: isDateDisabled(nextY, nextM, d) });
  }

  // Check if a day is selected
  const isSelected = (day: number, type: string): boolean => {
    if (!value || type !== 'current') return false;
    const selectedStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedStr === value;
  };

  // Check if a day is today
  const isToday = (day: number, type: string): boolean => {
    if (type !== 'current') return false;
    const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dayStr === todayStr;
  };

  return (
    <div className="cal-container" ref={containerRef}>
      {/* Display input */}
      <div
        className={`cal-input ${isOpen ? 'cal-input-active' : ''} ${disabled ? 'cal-input-disabled' : ''}`}
        onClick={handleOpen}
      >
        <span className={value ? 'cal-input-value' : 'cal-input-placeholder'}>
          {value ? formatToBuddhistDate(value) : placeholder}
        </span>
        <svg
          className="cal-input-icon"
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
