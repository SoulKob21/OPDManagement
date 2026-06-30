import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Patient, Doctor } from '../../types/opd';
import { MOCK_DOCTORS } from '../../types/opd';
import { BuddhistDateInput } from '../../components/BuddhistDateInput';
import * as XLSX from 'xlsx';

interface DmHbA1cFbsViewProps {
  onBack: () => void;
}

// ── Screening result logic (อิงตาม HbA1c; ถ้าไม่มี ให้ "-") ──
const getScreeningResult = (hba1c: number | null): { label: string; color: string; bg: string } => {
  if (hba1c === null) return { label: '-', color: '#6b7280', bg: '#f3f4f6' };
  if (hba1c >= 6.5) return { label: 'Diabetes', color: '#fff', bg: '#ef4444' };
  if (hba1c >= 5.7) return { label: 'Pre-diabetes (กลุ่มเสี่ยง)', color: '#fff', bg: '#f59e0b' };
  return { label: 'ปกติ', color: '#fff', bg: '#10b981' };
};

const getHba1cColor = (val: number | null) => {
  if (val === null) return 'var(--text-muted)';
  if (val >= 6.5) return '#ef4444';
  if (val >= 5.7) return '#f59e0b';
  return '#10b981';
};

const getFbsColor = (val: number | null) => {
  if (val === null) return 'var(--text-muted)';
  if (val >= 126) return '#ef4444';
  if (val >= 101) return '#f59e0b';
  return '#10b981';
};

// ── List row (from Supabase) ──────────────────────────────────
interface ListRow {
  patientId: string;
  hn: string;
  name: string;
  doctor: string;
  hba1cDate: string;        // YYYY-MM-DD (raw for filtering)
  hba1cDateDisplay: string; // DD/MM/พ.ศ.
  hba1c: number | null;
  fbsDate: string;
  fbsDateDisplay: string;
  fbs: number | null;
}
// ── Mock data for local development ─────────────────────────
const MOCK_LIST_DATA: ListRow[] = [
  { patientId: 'mock-01', hn: 'HN-00101', name: 'นายสมชาย ใจดี',            doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-01-15', hba1cDateDisplay: '15/01/2568', hba1c: 6.8,  fbsDate: '2025-01-15', fbsDateDisplay: '15/01/2568', fbs: 132 },
  { patientId: 'mock-02', hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข',      doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-01-15', hba1cDateDisplay: '15/01/2568', hba1c: 5.4,  fbsDate: '2025-01-15', fbsDateDisplay: '15/01/2568', fbs: 95 },
  { patientId: 'mock-03', hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์',      doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-01-16', hba1cDateDisplay: '16/01/2568', hba1c: 8.2,  fbsDate: '2025-01-16', fbsDateDisplay: '16/01/2568', fbs: 185 },
  { patientId: 'mock-04', hn: 'HN-00104', name: 'นางมาลี ดอกไม้',           doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-01-16', hba1cDateDisplay: '16/01/2568', hba1c: 6.0,  fbsDate: '2025-01-16', fbsDateDisplay: '16/01/2568', fbs: 110 },
  { patientId: 'mock-05', hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง',       doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-01-17', hba1cDateDisplay: '17/01/2568', hba1c: 5.2,  fbsDate: '2025-01-17', fbsDateDisplay: '17/01/2568', fbs: 88 },
  { patientId: 'mock-06', hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา',     doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-01-17', hba1cDateDisplay: '17/01/2568', hba1c: 7.5,  fbsDate: '2025-01-17', fbsDateDisplay: '17/01/2568', fbs: 156 },
  { patientId: 'mock-07', hn: 'HN-00107', name: 'นายอนุชา พัฒนา',           doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-01-18', hba1cDateDisplay: '18/01/2568', hba1c: 5.8,  fbsDate: '2025-01-18', fbsDateDisplay: '18/01/2568', fbs: 102 },
  { patientId: 'mock-08', hn: 'HN-00108', name: 'นางจันทร์ สว่าง',          doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-01-18', hba1cDateDisplay: '18/01/2568', hba1c: 6.5,  fbsDate: '2025-01-18', fbsDateDisplay: '18/01/2568', fbs: 128 },
  { patientId: 'mock-09', hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์',       doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-01-19', hba1cDateDisplay: '19/01/2568', hba1c: 9.1,  fbsDate: '2025-01-19', fbsDateDisplay: '19/01/2568', fbs: 210 },
  { patientId: 'mock-10', hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-01-19', hba1cDateDisplay: '19/01/2568', hba1c: 5.6,  fbsDate: '2025-01-19', fbsDateDisplay: '19/01/2568', fbs: 98 },
  { patientId: 'mock-11', hn: 'HN-00111', name: 'นายสุรชัย ดีงาม',           doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-02-20', hba1cDateDisplay: '20/02/2568', hba1c: 7.0,  fbsDate: '2025-02-20', fbsDateDisplay: '20/02/2568', fbs: 140 },
  { patientId: 'mock-12', hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ',       doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-02-20', hba1cDateDisplay: '20/02/2568', hba1c: 6.2,  fbsDate: '2025-02-20', fbsDateDisplay: '20/02/2568', fbs: 115 },
  { patientId: 'mock-13', hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล',        doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-02-21', hba1cDateDisplay: '21/02/2568', hba1c: 5.0,  fbsDate: '2025-02-21', fbsDateDisplay: '21/02/2568', fbs: 82 },
  { patientId: 'mock-14', hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข',         doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-02-21', hba1cDateDisplay: '21/02/2568', hba1c: 8.8,  fbsDate: '2025-02-21', fbsDateDisplay: '21/02/2568', fbs: 195 },
  { patientId: 'mock-15', hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง',  doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-02-22', hba1cDateDisplay: '22/02/2568', hba1c: 6.4,  fbsDate: '2025-02-22', fbsDateDisplay: '22/02/2568', fbs: 120 },
  { patientId: 'mock-16', hn: 'HN-00116', name: 'นางวรรณี ชื่นชม',           doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-03-22', hba1cDateDisplay: '22/03/2568', hba1c: 5.3,  fbsDate: '2025-03-22', fbsDateDisplay: '22/03/2568', fbs: 90 },
  { patientId: 'mock-17', hn: 'HN-00117', name: 'นายเอกชัย ทองดี',           doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-03-23', hba1cDateDisplay: '23/03/2568', hba1c: 7.8,  fbsDate: '2025-03-23', fbsDateDisplay: '23/03/2568', fbs: 168 },
  { patientId: 'mock-18', hn: 'HN-00118', name: 'นางสาวณัฐมล สมบูรณ์',      doctor: 'นพ.สมศักดิ์ รักษาดี',  hba1cDate: '2025-03-23', hba1cDateDisplay: '23/03/2568', hba1c: null, fbsDate: '2025-03-23', fbsDateDisplay: '23/03/2568', fbs: 108 },
  { patientId: 'mock-19', hn: 'HN-00119', name: 'นายธีระ แสงสว่าง',          doctor: 'นพ.ชาญชัย วิทยา',      hba1cDate: '2025-03-24', hba1cDateDisplay: '24/03/2568', hba1c: 5.7,  fbsDate: '2025-03-24', fbsDateDisplay: '24/03/2568', fbs: 100 },
  { patientId: 'mock-20', hn: 'HN-00120', name: 'นางปราณี ใจสะอาด',          doctor: 'พญ.วิไล ใจงาม',         hba1cDate: '2025-03-24', hba1cDateDisplay: '24/03/2568', hba1c: 10.2, fbsDate: '2025-03-24', fbsDateDisplay: '24/03/2568', fbs: 248 },
];
const THAI_MONTHS = [
  { value: '01', label: 'มกราคม' }, { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' }, { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' }, { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' }, { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' }, { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' },
];

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.875rem',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
  color: '#fff',
  borderBottom: '2px solid rgba(255,255,255,0.15)',
  letterSpacing: '0.02em',
};
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

interface PatientFormState {
  hn: string; title: string; first_name: string; last_name: string;
  gender: string; phone_number: string; address: string;
  emergency_contact_name: string; emergency_contact_phone: string;
  medical_right: string; primary_doctor: string;
  citizen_id: string; passport_number: string; date_of_birth: string;
  allergy_note: string; chronic_disease_note: string;
  status: 'active' | 'inactive';
}

const initialPatientForm: PatientFormState = {
  hn: '', title: 'นาย', first_name: '', last_name: '',
  gender: 'ชาย', phone_number: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  medical_right: 'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
  primary_doctor: 'กรุณาเลือกแพทย์เจ้าของไข้ใหม่',
  citizen_id: '', passport_number: '', date_of_birth: '',
  allergy_note: '', chronic_disease_note: '', status: 'active',
};

// ── Name helpers (same as MedicineDeliveryPage) ───────────────
const parseTitleAndName = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return { title: 'นาย', first_name: '', last_name: '' };
  const dotMatch = trimmed.match(/^([ก-ฮa-zA-Z\.]+\.)\s*(.*)$/);
  if (dotMatch) {
    const parts = dotMatch[2].trim().split(/\s+/);
    return { title: dotMatch[1], first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
  }
  const standardTitles = ['นางสาว', 'นาง', 'นาย', 'เด็กหญิง', 'เด็กชาย', 'พระภิกษุ', 'พระ', 'คุณ'];
  let title = 'นาย';
  let rest = trimmed;
  for (const t of standardTitles) {
    if (rest.startsWith(t)) { title = t; rest = rest.slice(t.length).trim(); break; }
  }
  const parts = rest.split(/\s+/);
  return { title, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
};

const genderFromTitle = (title: string) => {
  if (['นาย', 'เด็กชาย'].some(t => title.includes(t))) return 'ชาย';
  if (['นาง', 'นางสาว', 'เด็กหญิง'].some(t => title.includes(t))) return 'หญิง';
  return 'อื่นๆ';
};

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder = 'ทั้งหมด' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '36px',
          padding: '0.375rem 2rem 0.375rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid ' + (isOpen ? 'var(--border-focus)' : 'var(--border-color)'),
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px var(--primary-glow)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            position: 'absolute',
            right: '0.75rem',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 150,
            width: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg-surface-solid)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px',
          }}
        >
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  display: 'block',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


export const DmHbA1cFbsView: React.FC<DmHbA1cFbsViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);

  // ── Filter states ──────────────────────────────────────────
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterDate, setFilterDate] = useState('');
  const [filterResult, setFilterResult] = useState('');



  // ── Patient search states ──────────────────────────────────
  const [hnQuery, setHnQuery] = useState('');
  const [searchingHn, setSearchingHn] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);
  const [miniPatientForm, setMiniPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [fullNameInput, setFullNameInput] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [lastAppointmentDate, setLastAppointmentDate] = useState(TODAY);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Doctor autocomplete ────────────────────────────────────
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [activeDoctorIndex, setActiveDoctorIndex] = useState(-1);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([...MOCK_DOCTORS]);

  // ── Latest labs ────────────────────────────────────────────
  const [latestHba1c, setLatestHba1c] = useState<{ result_value: string; test_date: string } | null>(null);
  const [latestFbs, setLatestFbs] = useState<{ result_value: string; test_date: string } | null>(null);

  // ── Lab form ───────────────────────────────────────────────
  const [hba1cDate, setHba1cDate] = useState(TODAY);
  const [hba1cValue, setHba1cValue] = useState('');
  const [fbsDate, setFbsDate] = useState(TODAY);
  const [fbsValue, setFbsValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // ── List data from Supabase ─────────────────────────────
  const [listData, setListData] = useState<ListRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Export to Excel states ──────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'month' | 'year'>('month');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportYear, setExportYear] = useState(currentYearStr);
  const [exportMonth, setExportMonth] = useState(currentMonthStr);
  const [exportResult, setExportResult] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: (currentYear + 1) - 2024 + 1 }, (_, i) => {
    const y = 2024 + i;
    return { value: y.toString(), label: (y + 543).toString() };
  });


  const monthOptions = [
    { value: '', label: 'ทั้งหมด' },
    ...THAI_MONTHS.map(m => ({ value: m.value, label: m.label }))
  ];

  const resultOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'ปกติ', label: 'ปกติ' },
    { value: 'Pre-diabetes (กลุ่มเสี่ยง)', label: 'Pre-diabetes (กลุ่มเสี่ยง)' },
    { value: 'Diabetes', label: 'Diabetes' },
    { value: '-', label: 'ไม่มีผล HbA1c' }
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
  ];



  // Helper: convert YYYY-MM-DD to DD/MM/พ.ศ.
  const toThaiDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${parseInt(y) + 543}`;
  };

  const fetchListData = async (targetPage: number = page, targetPageSize: number = pageSize) => {
    setListLoading(true); setListError('');
    try {
      // ── DEV: use mock data ──────────────────────────────────
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 300)); // simulate network
        const filtered = MOCK_LIST_DATA.filter(row => {
          const rowYear = row.hba1cDate.slice(0, 4);
          const rowMonth = row.hba1cDate.slice(5, 7);
          const screening = getScreeningResult(row.hba1c);
          if (filterYear && rowYear !== filterYear) return false;
          if (filterMonth && rowMonth !== filterMonth) return false;
          if (filterDate && row.hba1cDate !== filterDate) return false;
          if (filterResult && screening.label !== filterResult) return false;
          return true;
        });
        filtered.sort((a, b) => a.hba1cDate.localeCompare(b.hba1cDate));
        setTotalCount(filtered.length);
        const sliced = filtered.slice((targetPage - 1) * targetPageSize, targetPage * targetPageSize);
        setListData(sliced);
        setHasSearched(true);
        return;
      }

      // ── PROD: fetch from Supabase with SQL filters ──────────
      let query = supabase
        .from('patient_lab_results')
        .select('patient_id, result_value, test_date, patients(id, hn, title, first_name, last_name, primary_doctor)', { count: 'exact' })
        .eq('test_name', 'Hemoglobin A1C')
        .eq('status', 'completed');

      if (filterYear) {
        if (filterMonth) {
          const yearNum = parseInt(filterYear);
          const monthNum = parseInt(filterMonth);
          const lastDay = new Date(yearNum, monthNum, 0).getDate();
          query = query
            .gte('test_date', `${filterYear}-${filterMonth}-01`)
            .lte('test_date', `${filterYear}-${filterMonth}-${String(lastDay).padStart(2, '0')}`);
        } else {
          query = query
            .gte('test_date', `${filterYear}-01-01`)
            .lte('test_date', `${filterYear}-12-31`);
        }
      }

      if (filterDate) {
        query = query.eq('test_date', filterDate);
      }

      // Result filter (based on HbA1c value)
      if (filterResult) {
        if (filterResult === 'ปกติ') {
          query = query.filter('result_value::numeric', 'lt', 5.7);
        } else if (filterResult === 'Pre-diabetes (กลุ่มเสี่ยง)') {
          query = query.filter('result_value::numeric', 'gte', 5.7)
                       .filter('result_value::numeric', 'lt', 6.5);
        } else if (filterResult === 'Diabetes') {
          query = query.filter('result_value::numeric', 'gte', 6.5);
        }
      }

      const fromRange = (targetPage - 1) * targetPageSize;
      const toRange = targetPage * targetPageSize - 1;

      const { data: hba1cRows, error: e1, count } = await query
        .order('test_date', { ascending: true })
        .range(fromRange, toRange);

      if (e1) throw e1;
      setTotalCount(count ?? 0);

      // Fetch FBS results (latest per patient) only for patients in current hba1cRows page
      const patientIds = Array.from(new Set((hba1cRows || []).map(r => r.patient_id).filter(Boolean)));
      let fbsRows: any[] = [];
      if (patientIds.length > 0) {
        const { data, error: e2 } = await supabase
          .from('patient_lab_results')
          .select('patient_id, result_value, test_date')
          .eq('test_name', 'Fasting Blood Sugar')
          .eq('status', 'completed')
          .in('patient_id', patientIds)
          .order('test_date', { ascending: false });
        if (e2) throw e2;
        fbsRows = data || [];
      }

      // Build FBS map: patient_id -> latest FBS row
      const fbsMap = new Map<string, { result_value: string; test_date: string }>();
      (fbsRows || []).forEach(r => {
        if (!fbsMap.has(r.patient_id)) fbsMap.set(r.patient_id, r);
      });

      // Build list rows from HbA1c rows (one row per HbA1c entry)
      const rows: ListRow[] = (hba1cRows || []).map(r => {
        const patient = (r as any).patients as any;
        const fbs = fbsMap.get(r.patient_id);
        const hba1cVal = parseFloat(r.result_value);
        const fbsVal = fbs ? parseFloat(fbs.result_value) : null;
        return {
          patientId: r.patient_id,
          hn: patient?.hn ?? '',
          name: `${patient?.title ?? ''}${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`.trim(),
          doctor: patient?.primary_doctor ?? '',
          hba1cDate: r.test_date ?? '',
          hba1cDateDisplay: toThaiDate(r.test_date ?? ''),
          hba1c: isNaN(hba1cVal) ? null : hba1cVal,
          fbsDate: fbs?.test_date ?? '',
          fbsDateDisplay: fbs ? toThaiDate(fbs.test_date) : '',
          fbs: fbsVal === null || isNaN(fbsVal as number) ? null : fbsVal,
        };
      });
      setListData(rows);
      setHasSearched(true);
    } catch (err: any) {
      setListError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setListLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setExportProgress(0);
    setExportSuccess(false);
    setExportMessage('กำลังเริ่มดึงข้อมูลคัดกรองเบาหวาน...');
    
    try {
      let startDate = '';
      let endDate = '';
      
      if (exportMode === 'month') {
        if (!exportYear || !exportMonth) {
          throw new Error('กรุณาเลือกปีและเดือนก่อนสั่งดาวน์โหลดข้อมูลรายเดือน');
        }
        const yearNum = parseInt(exportYear);
        const monthNum = parseInt(exportMonth);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        startDate = `${exportYear}-${exportMonth}-01`;
        endDate = `${exportYear}-${exportMonth}-${String(lastDay).padStart(2, '0')}`;
      } else {
        if (!exportYear) {
          throw new Error('กรุณาเลือกปีก่อนสั่งดาวน์โหลดข้อมูลรายปี');
        }
        startDate = `${exportYear}-01-01`;
        endDate = `${exportYear}-12-31`;
      }
      
      // ── DEV: use mock data ──────────────────────────────────
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 600)); // simulate network delay
        
        const filteredMock = MOCK_LIST_DATA.filter(row => {
          const rowYear = row.hba1cDate.slice(0, 4);
          const rowMonth = row.hba1cDate.slice(5, 7);
          if (exportMode === 'month') {
            return rowYear === filterYear && rowMonth === filterMonth;
          } else {
            return rowYear === filterYear;
          }
        });
        
        filteredMock.sort((a, b) => a.hba1cDate.localeCompare(b.hba1cDate));
        
        setExportProgress(50);
        setExportMessage(`ค้นพบข้อมูล Mock ${filteredMock.length} รายการ กำลังจัดเตรียม Excel...`);
        await new Promise(r => setTimeout(r, 400));
        
        const excelData = filteredMock.map((r, idx) => ({
          'ลำดับ': idx + 1,
          'HN': r.hn,
          'ชื่อ-นามสกุล': r.name,
          'แพทย์เจ้าของไข้': r.doctor,
          'HbA1c (%)': r.hba1c !== null ? r.hba1c : '',
          'วันที่ตรวจ HbA1c': r.hba1cDateDisplay,
          'FBS (mg/dL)': r.fbs !== null ? r.fbs : '',
          'วันที่ตรวจ FBS': r.fbsDateDisplay,
          'ผลการคัดกรอง': getScreeningResult(r.hba1c).label
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรองเบาหวาน');
        const fileLabel = exportMode === 'year' 
          ? `ปี_${parseInt(exportYear) + 543}` 
          : `เดือน_${THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth}_${parseInt(exportYear) + 543}`;
        XLSX.writeFile(workbook, `diabetes_screening_${fileLabel}.xlsx`);
        
        setExportProgress(100);
        setExportSuccess(true);
        setExportMessage(`ดาวน์โหลดสำเร็จ! พบทั้งหมด ${filteredMock.length} รายการ`);
        return;
      }
      
      // ── PROD: Supabase ──────────────────────────────────────
      let countQuery = supabase
        .from('patient_lab_results')
        .select('id', { count: 'exact', head: true })
        .eq('test_name', 'Hemoglobin A1C')
        .eq('status', 'completed')
        .gte('test_date', startDate)
        .lte('test_date', endDate);
      
      if (exportResult) {
        if (exportResult === 'ปกติ') {
          countQuery = countQuery.filter('result_value::numeric', 'lt', 5.7);
        } else if (exportResult === 'Pre-diabetes (กลุ่มเสี่ยง)') {
          countQuery = countQuery.filter('result_value::numeric', 'gte', 5.7)
                                 .filter('result_value::numeric', 'lt', 6.5);
        } else if (exportResult === 'Diabetes') {
          countQuery = countQuery.filter('result_value::numeric', 'gte', 6.5);
        }
      }
      
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      const total = count ?? 0;
      
      if (total === 0) {
        throw new Error('ไม่พบข้อมูลตามเงื่อนไขที่ระบุ');
      }
      
      let allHbA1c: any[] = [];
      const batchSize = 1000;
      for (let offset = 0; offset < total; offset += batchSize) {
        const progressVal = Math.round((offset / total) * 60); // 0-60%
        setExportProgress(progressVal);
        setExportMessage(`กำลังดึงข้อมูล HbA1c... ${offset} จาก ${total} รายการ`);
        
        let query = supabase
          .from('patient_lab_results')
          .select('patient_id, result_value, test_date, patients(id, hn, title, first_name, last_name, primary_doctor)')
          .eq('test_name', 'Hemoglobin A1C')
          .eq('status', 'completed')
          .gte('test_date', startDate)
          .lte('test_date', endDate);
          
        if (exportResult) {
          if (exportResult === 'ปกติ') {
            query = query.filter('result_value::numeric', 'lt', 5.7);
          } else if (exportResult === 'Pre-diabetes (กลุ่มเสี่ยง)') {
            query = query.filter('result_value::numeric', 'gte', 5.7)
                         .filter('result_value::numeric', 'lt', 6.5);
          } else if (exportResult === 'Diabetes') {
            query = query.filter('result_value::numeric', 'gte', 6.5);
          }
        }
        
        const { data, error } = await query
          .order('test_date', { ascending: true })
          .range(offset, offset + batchSize - 1);
          
        if (error) throw error;
        allHbA1c = [...allHbA1c, ...(data || [])];
      }
      
      setExportProgress(65);
      setExportMessage(`ดึงประวัติ HbA1c สำเร็จ ${total} รายการ กำลังจัดกลุ่มเพื่อสืบค้นประวัติ FBS...`);
      
      const patientIds = Array.from(new Set(allHbA1c.map(r => r.patient_id).filter(Boolean)));
      let allFbs: any[] = [];
      const idBatchSize = 400;
      for (let offset = 0; offset < patientIds.length; offset += idBatchSize) {
        const progressVal = 65 + Math.round((offset / patientIds.length) * 30); // 65-95%
        setExportProgress(progressVal);
        setExportMessage(`กำลังจับคู่ผลตรวจ FBS... (${offset} จาก ${patientIds.length} รายชื่อ)`);
        
        const chunkIds = patientIds.slice(offset, offset + idBatchSize);
        const { data, error } = await supabase
          .from('patient_lab_results')
          .select('patient_id, result_value, test_date')
          .eq('test_name', 'Fasting Blood Sugar')
          .eq('status', 'completed')
          .in('patient_id', chunkIds)
          .order('test_date', { ascending: false });
          
        if (error) throw error;
        allFbs = [...allFbs, ...(data || [])];
      }
      
      setExportProgress(95);
      setExportMessage('ดึงประวัติแล็บทั้งหมดเสร็จสิ้น กำลังสรุปข้อมูลในรูปแบบ Excel...');
      
      const fbsMap = new Map<string, { result_value: string; test_date: string }>();
      allFbs.forEach(r => {
        if (!fbsMap.has(r.patient_id)) {
          fbsMap.set(r.patient_id, r);
        }
      });
      
      const excelData = allHbA1c.map((r, idx) => {
        const patient = r.patients;
        const fbs = fbsMap.get(r.patient_id);
        const hba1cVal = parseFloat(r.result_value);
        const fbsVal = fbs ? parseFloat(fbs.result_value) : null;
        const screening = getScreeningResult(hba1cVal);
        
        return {
          'ลำดับ': idx + 1,
          'HN': patient?.hn ?? '',
          'ชื่อ-นามสกุล': `${patient?.title ?? ''}${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`.trim(),
          'แพทย์เจ้าของไข้': patient?.primary_doctor ?? '',
          'HbA1c (%)': isNaN(hba1cVal) ? '' : hba1cVal,
          'วันที่ตรวจ HbA1c': toThaiDate(r.test_date ?? ''),
          'FBS (mg/dL)': fbsVal === null || isNaN(fbsVal) ? '' : fbsVal,
          'วันที่ตรวจ FBS': fbs ? toThaiDate(fbs.test_date) : '',
          'ผลการคัดกรอง': screening.label
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรองเบาหวาน');
      
      const fileLabel = exportMode === 'year' 
        ? `ปี_${parseInt(exportYear) + 543}` 
        : `เดือน_${THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth}_${parseInt(exportYear) + 543}`;
      XLSX.writeFile(workbook, `diabetes_screening_${fileLabel}.xlsx`);
      
      setExportProgress(100);
      setExportSuccess(true);
      setExportMessage(`ดาวน์โหลดสำเร็จ! สรุปนำออกแล้วทั้งหมด ${total} รายการ`);
      
    } catch (err: any) {
      setExportMessage(`ดาวน์โหลดล้มเหลว: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Fetch doctors from DB
  useEffect(() => {
    supabase.from('doctors').select('*').eq('status', 'active').order('id').then(({ data }) => {
      if (data && data.length > 0) setDoctorsList(data);
    });
    // Avoid TS6133 unused warning
    if (typeof onBack === 'function') {}
  }, [onBack]);

  // Fetch latest labs when patient is selected
  useEffect(() => {
    if (!selectedPatient) { setLatestHba1c(null); setLatestFbs(null); return; }
    const fetchLabs = async () => {
      const [h, f] = await Promise.all([
        supabase.from('patient_lab_results').select('result_value,test_date').eq('patient_id', selectedPatient.id)
          .eq('test_name', 'Hemoglobin A1C').order('test_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('patient_lab_results').select('result_value,test_date').eq('patient_id', selectedPatient.id)
          .eq('test_name', 'Fasting Blood Sugar').order('test_date', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setLatestHba1c(h.data ?? null);
      setLatestFbs(f.data ?? null);
    };
    fetchLabs();

    // Fetch last appointment
    supabase.from('appointments').select('appointment_date').eq('patient_id', selectedPatient.id)
      .order('appointment_date', { ascending: false }).limit(1).then(({ data }) => {
        setLastAppointmentDate(data?.[0]?.appointment_date || TODAY);
      });
  }, [selectedPatient]);

  // ── Helpers ────────────────────────────────────────────────
  const filteredDoctors = doctorsList.filter(d => {
    if (!doctorQuery.trim()) return true;
    const q = doctorQuery.toLowerCase();
    return String(d.id).includes(q) || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
  });

  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setMiniPatientForm(prev => ({ ...prev, primary_doctor: doc.name }));
    setDoctorQuery(''); setShowDoctorDropdown(false); setActiveDoctorIndex(-1);
  };
  const handleClearDoctor = () => {
    setSelectedDoctor(null);
    setMiniPatientForm(prev => ({ ...prev, primary_doctor: '' }));
    setDoctorQuery('');
  };
  const handleDoctorKeyDown = (e: React.KeyboardEvent) => {
    if (!showDoctorDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveDoctorIndex(p => Math.min(p + 1, filteredDoctors.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveDoctorIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && activeDoctorIndex >= 0) { e.preventDefault(); handleSelectDoctor(filteredDoctors[activeDoctorIndex]); }
    else if (e.key === 'Escape') setShowDoctorDropdown(false);
  };

  const handleSearchHn = async (query: string) => {
    setHnQuery(query);
    setPatientNotFound(false);
    setSelectedPatient(null);
    if (!query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    try {
      setSearchingHn(true);
      const q = `%${query.trim()}%`;
      const { data } = await supabase.from('patients').select('*')
        .or(`hn.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`)
        .eq('status', 'active').limit(8);
      setSearchResults(data || []);
      setShowSearchResults(true);
      if ((!data || data.length === 0) && query.trim().length >= 2) {
        setPatientNotFound(true);
        setMiniPatientForm({ ...initialPatientForm, hn: query.trim() });
        setLastAppointmentDate(TODAY);
      }
    } catch { /* ignore */ } finally { setSearchingHn(false); }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setHnQuery(patient.hn);
    setSearchResults([]); setShowSearchResults(false); setPatientNotFound(false);
  };

  const handleFullNameChange = (value: string) => {
    setFullNameInput(value);
    const parsed = parseTitleAndName(value);
    setMiniPatientForm(prev => ({ ...prev, ...parsed, gender: genderFromTitle(parsed.title) }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedPatient && !patientNotFound) errors.patient = 'กรุณาค้นหาและเลือกคนไข้';
    if (patientNotFound && !selectedPatient) {
      if (!miniPatientForm.hn.trim()) errors.hn = 'กรุณาระบุ HN';
      if (!miniPatientForm.first_name.trim()) errors.first_name = 'กรุณาระบุชื่อ (พิมพ์ชื่อเต็มด้านบน)';
    }
    if (!hba1cValue && !fbsValue) errors.lab = 'กรุณากรอกผล HbA1c หรือ FBS อย่างน้อย 1 ค่า';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true); setSaveError(''); setSaveSuccess('');
    try {
      let patientId = selectedPatient?.id;

      // Create new patient if not found
      if (patientNotFound && !selectedPatient) {
        const { data: newPat, error: patErr } = await supabase.from('patients').insert({
          hn: miniPatientForm.hn.trim(),
          title: miniPatientForm.title,
          first_name: miniPatientForm.first_name.trim(),
          last_name: miniPatientForm.last_name.trim(),
          gender: miniPatientForm.gender,
          phone_number: miniPatientForm.phone_number.trim() || '',
          address: miniPatientForm.address.trim() || '',
          emergency_contact_name: miniPatientForm.emergency_contact_name.trim() || '',
          emergency_contact_phone: miniPatientForm.emergency_contact_phone.trim() || '',
          medical_right: miniPatientForm.medical_right,
          primary_doctor: miniPatientForm.primary_doctor.trim() || 'กรุณาเลือกแพทย์เจ้าของไข้ใหม่',
          allergy_note: miniPatientForm.allergy_note.trim() || null,
          chronic_disease_note: miniPatientForm.chronic_disease_note.trim() || null,
          status: 'active',
          citizen_id: miniPatientForm.citizen_id.trim() || null,
          passport_number: miniPatientForm.passport_number.trim() || null,
          date_of_birth: miniPatientForm.date_of_birth || null,
        }).select().single();
        if (patErr) throw patErr;
        patientId = newPat.id;
      }
      if (!patientId) throw new Error('ไม่พบข้อมูลคนไข้');

      // Save appointment date
      if (lastAppointmentDate) {
        const { data: existApps } = await supabase.from('appointments').select('*')
          .eq('patient_id', patientId).order('appointment_date', { ascending: false }).limit(1);
        if (existApps && existApps.length > 0) {
          await supabase.from('appointments').update({ appointment_date: lastAppointmentDate, updated_at: new Date().toISOString() }).eq('id', existApps[0].id);
        } else {
          await supabase.from('appointments').insert({
            patient_id: patientId, appointment_date: lastAppointmentDate,
            appointment_time: '09:00:00', department: 'อายุรกรรม (Medicine)',
            doctor_name: miniPatientForm.primary_doctor || 'ไม่ระบุแพทย์',
            reason: 'บันทึกผล HbA1C/FBS', status: 'completed',
          });
        }
      }

      // Insert lab results
      const inserts: any[] = [];
      if (hba1cValue.trim()) inserts.push({ patient_id: patientId, test_name: 'Hemoglobin A1C', test_date: hba1cDate, result_value: hba1cValue.trim(), unit: '%', reference_range: '< 7.0', status: 'completed', notes: 'บันทึกจากหน้าคัดกรองเบาหวาน' });
      if (fbsValue.trim()) inserts.push({ patient_id: patientId, test_name: 'Fasting Blood Sugar', test_date: fbsDate, result_value: fbsValue.trim(), unit: 'mg/dL', reference_range: '70-100', status: 'completed', notes: 'บันทึกจากหน้าคัดกรองเบาหวาน' });
      if (inserts.length > 0) {
        const { error: labErr } = await supabase.from('patient_lab_results').insert(inserts);
        if (labErr) throw labErr;
      }

      setSaveSuccess(`บันทึกสำเร็จ ${inserts.length} รายการ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      setHba1cValue(''); setFbsValue('');
      // Re-fetch latest labs for display
      if (patientId) {
        const [h, f] = await Promise.all([
          supabase.from('patient_lab_results').select('result_value,test_date').eq('patient_id', patientId).eq('test_name', 'Hemoglobin A1C').order('test_date', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('patient_lab_results').select('result_value,test_date').eq('patient_id', patientId).eq('test_name', 'Fasting Blood Sugar').order('test_date', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setLatestHba1c(h.data ?? null);
        setLatestFbs(f.data ?? null);
      }
      // Refresh the list view
      fetchListData();
    } catch (err: any) {
      setSaveError('บันทึกไม่สำเร็จ: ' + err.message);
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setShowForm(false); setHnQuery(''); setSelectedPatient(null);
    setSearchResults([]); setPatientNotFound(false);
    setMiniPatientForm(initialPatientForm); setFullNameInput('');
    setShowExtraFields(false); setLastAppointmentDate(TODAY);
    setSelectedDoctor(null); setDoctorQuery('');
    setHba1cValue(''); setFbsValue('');
    setHba1cDate(TODAY); setFbsDate(TODAY);
    setSaveSuccess(''); setSaveError(''); setFormErrors({});
    setLatestHba1c(null); setLatestFbs(null);
  };

  // ── CREATE FORM ────────────────────────────────────────────
  if (showForm) {
    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        <button className="btn btn-secondary" style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }} onClick={resetForm}>
          ← กลับรายการ
        </button>

        <div className="dashboard-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>🩸 บันทึกผล HbA1C และ FBS</h2>

          {/* ── Step 1: Patient Search ── */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.5rem', background: 'var(--primary-subtle)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 1: ค้นหาคนไข้ (กรอก HN หรือชื่อ)
            </h4>

            {selectedPatient ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-solid)', border: '1.5px solid var(--primary-glow)' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>HN: {selectedPatient.hn}</strong>
                    <span style={{ marginLeft: '0.75rem' }}>{selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name}</span>
                    <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>แพทย์: {selectedPatient.primary_doctor || '—'}</span>
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => { setSelectedPatient(null); setHnQuery(''); setPatientNotFound(false); setLatestHba1c(null); setLatestFbs(null); }}>
                    เปลี่ยนคนไข้
                  </button>
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: '300px' }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>วันนัดหมายล่าสุด (พ.ศ.)</label>
                  <BuddhistDateInput value={lastAppointmentDate} onChange={setLastAppointmentDate} placeholder="แก้ไขวันนัดหมายล่าสุด" />
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="form-input"
                    placeholder="พิมพ์ HN หรือชื่อคนไข้เพื่อค้นหา..."
                    value={hnQuery}
                    onChange={e => handleSearchHn(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  />
                  {searchingHn && <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>กำลังค้นหา...</span>}
                </div>

                {showSearchResults && searchResults.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ zIndex: 50 }}>
                    {searchResults.map(p => (
                      <div key={p.id} className="autocomplete-item" onMouseDown={() => handleSelectPatient(p)}>
                        <span className="autocomplete-item-id" style={{ fontSize: '0.625rem', minWidth: 36 }}>{p.hn}</span>
                        <div className="autocomplete-item-info">
                          <div className="autocomplete-item-name">{p.title}{p.first_name} {p.last_name}</div>
                          <div className="autocomplete-item-meta">แพทย์: {p.primary_doctor || '—'} • {p.phone_number || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.patient && <span className="form-error">{formErrors.patient}</span>}
              </div>
            )}

            {/* ── New Patient Mini-Form ── */}
            {patientNotFound && !selectedPatient && (
              <div style={{ marginTop: '1rem', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--accent)', background: 'rgba(139,92,246,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>ไม่พบคนไข้ในระบบ — กรอกข้อมูลเพื่อลงทะเบียนคนไข้ใหม่</span>
                </div>

                {/* HN + Full name */}
                <div className="opd-form-grid" style={{ gridTemplateColumns: '160px 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">HN *</label>
                    <input type="text" className="form-input" value={miniPatientForm.hn} style={{ fontWeight: 700 }}
                      onChange={e => setMiniPatientForm({ ...miniPatientForm, hn: e.target.value })} />
                    {formErrors.hn && <span className="form-error">{formErrors.hn}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ชื่อ-นามสกุล * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(พิมพ์ชื่อเต็มพร้อมคำนำหน้า เช่น นายสมชาย ใจดี)</span></label>
                    <input type="text" className="form-input" placeholder="เช่น นายสมชาย ใจดี" value={fullNameInput} onChange={e => handleFullNameChange(e.target.value)} />
                    {formErrors.first_name && <span className="form-error">{formErrors.first_name}</span>}
                  </div>
                </div>

                {/* Doctor + Last appointment */}
                <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">แพทย์เจ้าของไข้</label>
                    {selectedDoctor ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.75rem', height: '38px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--primary-glow)', background: 'var(--bg-surface-solid)' }}>
                        <span style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600, marginRight: '6px' }}>{selectedDoctor.id}</span>
                          {selectedDoctor.name}
                        </span>
                        <button type="button" onClick={handleClearDoctor} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <input type="text" className="form-input" placeholder="พิมพ์ ID, ชื่อ หรือสาขาเพื่อค้นหาแพทย์..."
                          value={doctorQuery}
                          onChange={e => { setDoctorQuery(e.target.value); setShowDoctorDropdown(true); setActiveDoctorIndex(-1); }}
                          onFocus={() => setShowDoctorDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
                          onKeyDown={handleDoctorKeyDown}
                        />
                        {showDoctorDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredDoctors.length === 0 ? (
                              <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>ไม่พบแพทย์ที่ตรงกับ "{doctorQuery}"</div>
                            ) : filteredDoctors.map((doc, idx) => (
                              <div key={doc.id} className={`autocomplete-item ${idx === activeDoctorIndex ? 'active' : ''}`}
                                onMouseDown={() => handleSelectDoctor(doc)}
                                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>{doc.id}</span>
                                <div>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{doc.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.specialty}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันนัดหมายล่าสุด</label>
                    <BuddhistDateInput value={lastAppointmentDate} onChange={setLastAppointmentDate} placeholder="เลือกวันนัดหมายล่าสุด (พ.ศ.)" />
                  </div>
                </div>

                {/* Parsed preview */}
                {(miniPatientForm.title || miniPatientForm.first_name) && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>แยกอัตโนมัติ:</span>
                    <span>คำนำหน้า <strong>{miniPatientForm.title}</strong></span>
                    <span>ชื่อ <strong>{miniPatientForm.first_name || '—'}</strong></span>
                    <span>นามสกุล <strong>{miniPatientForm.last_name || '—'}</strong></span>
                    <span>เพศ <strong>{miniPatientForm.gender}</strong></span>
                  </div>
                )}

                {/* Toggle extra fields */}
                <button type="button" onClick={() => setShowExtraFields(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, padding: '0.25rem 0', marginBottom: showExtraFields ? '0.75rem' : 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showExtraFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                  {showExtraFields ? 'ซ่อนข้อมูลเพิ่มเติม' : 'กรอกข้อมูลเพิ่มเติม (ไม่บังคับ)'}
                </button>

                {showExtraFields && (
                  <div>
                    <div className="opd-form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 120px' }}>
                      <div className="form-group">
                        <label className="form-label">คำนำหน้า</label>
                        <input type="text" className="form-input" value={miniPatientForm.title}
                          onChange={e => setMiniPatientForm(p => ({ ...p, title: e.target.value, gender: genderFromTitle(e.target.value) }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ชื่อจริง</label>
                        <input type="text" className="form-input" value={miniPatientForm.first_name}
                          onChange={e => setMiniPatientForm({ ...miniPatientForm, first_name: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">นามสกุล</label>
                        <input type="text" className="form-input" value={miniPatientForm.last_name}
                          onChange={e => setMiniPatientForm({ ...miniPatientForm, last_name: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">เพศ</label>
                        <select className="form-select" value={miniPatientForm.gender}
                          onChange={e => setMiniPatientForm({ ...miniPatientForm, gender: e.target.value })}>
                          {['ชาย', 'หญิง', 'อื่นๆ'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">เบอร์โทรศัพท์</label>
                        <input type="tel" className="form-input" value={miniPatientForm.phone_number}
                          onChange={e => setMiniPatientForm({ ...miniPatientForm, phone_number: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">สิทธิการรักษา</label>
                        <input type="text" className="form-input" value={miniPatientForm.medical_right}
                          onChange={e => setMiniPatientForm({ ...miniPatientForm, medical_right: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Lab Results ── */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
                ขั้นตอนที่ 2: บันทึกผลตรวจ
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* HbA1c */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#6366f1' }}>📊 Hemoglobin A1C (%)</h3>
                  {latestHba1c && (
                    <div style={{ background: 'color-mix(in srgb, #6366f1 8%, transparent)', border: '1px solid color-mix(in srgb, #6366f1 20%, transparent)', borderRadius: 8, padding: '0.5rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ผลล่าสุด ({latestHba1c.test_date}):</span>
                      <span style={{ fontWeight: 700, marginLeft: 8, color: parseFloat(latestHba1c.result_value) >= 7 ? '#ef4444' : '#10b981' }}>
                        {latestHba1c.result_value}%
                      </span>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">วันที่สั่งตรวจ</label>
                    <BuddhistDateInput value={hba1cDate} onChange={setHba1cDate} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ผล HbA1c (%) <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— เว้นว่างถ้าไม่มีผล</span></label>
                    <input type="number" step="0.1" min="0" max="20" className="form-input" placeholder="เช่น 7.5" value={hba1cValue} onChange={e => setHba1cValue(e.target.value)} />
                  </div>
                </div>

                {/* FBS */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f59e0b' }}>🩺 Fasting Blood Sugar (mg/dL)</h3>
                  {latestFbs && (
                    <div style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 20%, transparent)', borderRadius: 8, padding: '0.5rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ผลล่าสุด ({latestFbs.test_date}):</span>
                      <span style={{ fontWeight: 700, marginLeft: 8, color: parseFloat(latestFbs.result_value) > 100 ? '#ef4444' : '#10b981' }}>
                        {latestFbs.result_value} mg/dL
                      </span>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">วันที่สั่งตรวจ</label>
                    <BuddhistDateInput value={fbsDate} onChange={setFbsDate} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ผล FBS (mg/dL) <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— เว้นว่างถ้าไม่มีผล</span></label>
                    <input type="number" step="1" min="0" max="600" className="form-input" placeholder="เช่น 126" value={fbsValue} onChange={e => setFbsValue(e.target.value)} />
                  </div>
                </div>
              </div>
            {formErrors.lab && <span className="form-error" style={{ marginTop: '0.5rem', display: 'block' }}>{formErrors.lab}</span>}
            </div>



          {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}
          {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveError}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!selectedPatient && !patientNotFound)} style={{ width: 'auto' }}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกผลตรวจ'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto' }}>ยกเลิก</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────
  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🩸 การตรวจ HbA1C และ FBS</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>รายการผลตรวจ Hemoglobin A1C และ Fasting Blood Sugar</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มข้อมูลการตรวจ
          </button>
        </div>
      </div>

      {/* Criteria Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(245,158,11,0.06) 100%)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }}></span>
            เกณฑ์ HbA1c
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1rem' }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#10b981', marginRight: 8, verticalAlign: 'middle' }}></span>{'<= 5.6%'} — ปกติ</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#f59e0b', marginRight: 8, verticalAlign: 'middle' }}></span>{'5.7 – 6.4%'} — กลุ่มเสี่ยง (Pre-diabetes)</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#ef4444', marginRight: 8, verticalAlign: 'middle' }}></span>{'>= 6.5%'} — Diabetes</span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></span>
            เกณฑ์ FBS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1rem' }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#10b981', marginRight: 8, verticalAlign: 'middle' }}></span>{'70 – 100 mg%'} — ปกติ</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#f59e0b', marginRight: 8, verticalAlign: 'middle' }}></span>{'101 – 125 mg%'} — Pre-diabetes</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#ef4444', marginRight: 8, verticalAlign: 'middle' }}></span>{'>= 126 mg%'} — Diabetes</span>
          </div>
        </div>
        <div style={{ gridColumn: '1/-1', marginTop: '0.375rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8125rem' }}>
          ★ ผลการคัดกรองอิงตามผล HbA1c เป็นหลัก — หากไม่มีผล HbA1c จะแสดงเป็น "-"
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'flex-end', marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ปี (พ.ศ.)</label>
          <CustomSelect value={filterYear} onChange={val => { setFilterYear(val); setPage(1); }} options={yearOptions} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>เดือน</label>
          <CustomSelect value={filterMonth} onChange={val => { setFilterMonth(val); setPage(1); }} options={monthOptions} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>วันที่ตรวจ HbA1c (พ.ศ.)</label>
          <BuddhistDateInput value={filterDate} onChange={val => { setFilterDate(val); setPage(1); }} placeholder="ทั้งหมด (พ.ศ.)" style={{ height: '36px', minHeight: '36px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ผลการคัดกรอง</label>
          <CustomSelect value={filterResult} onChange={val => { setFilterResult(val); setPage(1); }} options={resultOptions} />
        </div>
        <button
          className="btn"
          onClick={() => {
            setFilterYear(currentYearStr);
            setFilterMonth(currentMonthStr);
            setFilterDate('');
            setFilterResult('');
            setPage(1);
            setListData([]);
            setHasSearched(false);
          }}
          style={{
            width: 'auto',
            padding: '0.375rem 0.875rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--danger-foreground)',
            background: 'var(--danger-bg)',
            border: '1.5px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#fecdd3';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--danger-bg)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          ล้างตัวกรอง
        </button>
        <button
          className="btn btn-primary"
          onClick={() => fetchListData()}
          disabled={listLoading}
          style={{
            width: 'auto',
            padding: '0.375rem 1rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: listLoading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          ค้นหา
        </button>
        <button
          className="btn"
          onClick={() => {
            setExportYear(filterYear || currentYearStr);
            setExportMonth(filterMonth || currentMonthStr);
            setExportResult(filterResult);
            setExportSuccess(false);
            setExportProgress(0);
            setExportMessage('');
            setExporting(false);
            setShowExportModal(true);
          }}
          style={{
            width: 'auto',
            padding: '0.375rem 1rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#059669';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#10b981';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          นำออก Excel
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: 'auto', width: '90px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>แสดงต่อหน้า</label>
          <CustomSelect value={String(pageSize)} onChange={val => { const newSize = Number(val); setPageSize(newSize); setPage(1); fetchListData(1, newSize); }} options={pageSizeOptions} />
        </div>
      </div>

      {/* Table */}
      {listError && (
        <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠️ {listError}</span>
          <button className="btn btn-secondary" onClick={() => fetchListData()} style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>ลองใหม่</button>
        </div>
      )}
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        const pageData = listData;
        return (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)' }}>
                    <th style={{ ...thStyle, width: 52, textAlign: 'center' }}>ลำดับ</th>
                    <th style={thStyle}>HN</th>
                    <th style={thStyle}>ชื่อ-สกุล</th>
                    <th style={thStyle}>แพทย์เจ้าของไข้</th>
                    <th style={{ ...thStyle, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>HbA1c (%)</th>
                    <th style={thStyle}>วันที่ตรวจ</th>
                    <th style={{ ...thStyle, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>FBS (mg/dl)</th>
                    <th style={thStyle}>วันที่ตรวจ</th>
                    <th style={{ ...thStyle, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>ผลการคัดกรอง</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasSearched ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        🔍 กรุณากดปุ่ม <strong>"ค้นหา"</strong> ด้านบนเพื่อแสดงรายการผลตรวจ
                      </td>
                    </tr>
                  ) : listLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle', marginRight: 8 }}></span>
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : pageData.map((row, idx) => {
                    const screening = getScreeningResult(row.hba1c);
                    const rowNum = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr key={`${row.patientId}-${row.hba1cDate}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{rowNum}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{row.hn}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{row.doctor}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, color: getHba1cColor(row.hba1c), borderLeft: '1px solid var(--border-color)' }}>
                          {row.hba1c !== null ? `${row.hba1c}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                          {row.hba1c !== null ? row.hba1cDateDisplay : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, color: getFbsColor(row.fbs), borderLeft: '1px solid var(--border-color)' }}>
                          {row.fbs !== null ? row.fbs : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                          {row.fbs !== null ? row.fbsDateDisplay : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', borderLeft: '1px solid var(--border-color)' }}>
                          <span style={{ display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, color: screening.color, background: screening.bg, whiteSpace: 'nowrap' }}>
                            {screening.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {totalCount === 0 ? 'ไม่พบข้อมูล' : `แสดง ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} จาก ${totalCount} รายการ`}
              </span>
              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchListData(p); }} disabled={page === 1} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>‹ ก่อนหน้า</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('ellipsis-' + i);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p) =>
                    typeof p === 'string'
                      ? <span key={p} style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span>
                      : <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { const targetP = p as number; setPage(targetP); fetchListData(targetP); }} style={{ width: 32, padding: '0.35rem 0', fontSize: '0.8rem', minWidth: 32 }}>{p}</button>
                  )
                }
                <button className="btn btn-secondary" onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchListData(p); }} disabled={page === totalPages || totalPages === 0} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>ถัดไป ›</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Export Modal */}
      {showExportModal && (
        <div className="opd-modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowExportModal(false)}>
          <div className="opd-modal" onClick={e => e.stopPropagation()} style={{
            width: '450px',
            maxWidth: '90%',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                📊 นำออกรายงานคัดกรองเบาหวาน
              </h3>
              <button
                disabled={exporting}
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  lineHeight: 1
                }}
              >&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>เลือกปีและเดือนที่ต้องการนำออกรายงาน:</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.15rem', marginBottom: '0.15rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ปี (พ.ศ.)</label>
                    <CustomSelect value={exportYear} onChange={val => setExportYear(val)} options={yearOptions} />
                  </div>
                  {exportMode === 'month' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>เดือน</label>
                      <CustomSelect 
                        value={exportMonth} 
                        onChange={val => setExportMonth(val)} 
                        options={monthOptions.filter(o => o.value !== '')}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ผลการคัดกรอง</label>
                  <CustomSelect value={exportResult} onChange={val => setExportResult(val)} options={resultOptions} />
                </div>
              </div>

              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.25rem' }}>เลือกโหมดขอบเขตข้อมูลเพื่อนำออก Excel:</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div
                  onClick={() => !exporting && setExportMode('month')}
                  style={{
                    border: exportMode === 'month' ? '2px solid #10b981' : '1.5px solid var(--border-color)',
                    background: exportMode === 'month' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: exportMode === 'month' ? '#10b981' : 'var(--text-primary)' }}>รายเดือน</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    เฉพาะ {THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth} พ.ศ. {parseInt(exportYear) + 543}
                  </span>
                </div>

                <div
                  onClick={() => !exporting && setExportMode('year')}
                  style={{
                    border: exportMode === 'year' ? '2px solid #10b981' : '1.5px solid var(--border-color)',
                    background: exportMode === 'year' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: exportMode === 'year' ? '#10b981' : 'var(--text-primary)' }}>รายปี</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    รวมทั้งปี พ.ศ. {parseInt(exportYear) + 543} (รองรับขนาด &gt;1,000 แถว)
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            {(exporting || exportProgress > 0 || exportMessage) && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: exportSuccess ? '#10b981' : 'var(--text-primary)' }}>
                    {exportSuccess ? '🎉 ดาวน์โหลดสำเร็จ' : exporting ? '⏳ กำลังทำงาน...' : 'ℹ️ รอเริ่มการดาวน์โหลด'}
                  </span>
                  <span>{exportProgress}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${exportProgress}%`,
                    height: '100%',
                    background: exportSuccess ? '#10b981' : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.2s ease-out'
                  }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{exportMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                className="btn btn-secondary"
                disabled={exporting}
                onClick={() => setShowExportModal(false)}
                style={{ width: 'auto', padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
              >
                {exportSuccess ? 'ปิด' : 'ยกเลิก'}
              </button>
              {!exportSuccess && (
                <button
                  className="btn"
                  disabled={exporting}
                  onClick={handleExportExcel}
                  style={{
                    width: 'auto',
                    padding: '0.45rem 1.5rem',
                    fontSize: '0.85rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    opacity: exporting ? 0.7 : 1
                  }}
                >
                  {exporting ? 'กำลังส่งคำขอ...' : 'ดาวน์โหลด Excel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
