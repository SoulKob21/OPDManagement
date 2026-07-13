import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Patient, Doctor } from '../../types/opd';
import { MOCK_DOCTORS } from '../../types/opd';
import { BuddhistDateInput } from '../../components/BuddhistDateInput';
import { DiseaseMultiSelect } from '../../components/DiseaseMultiSelect';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';

interface DmAbiViewProps {
  onBack: () => void;
}

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

const parseTitleAndName = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return { title: 'นาย', first_name: '', last_name: '' };
  const dotMatch = trimmed.match(/^([ก-ฮa-zA-Z\.]+\.)\s*(.*)$/);
  if (dotMatch) {
    const parts = dotMatch[2].trim().split(/\s+/);
    return { title: dotMatch[1], first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
  }
  const standardTitles = ['นางสาว', 'นาง', 'นาย', 'เด็กหญิง', 'เด็กชาย', 'พระภิกษุ', 'พระ', 'คุณ'];
  let title = 'นาย'; let rest = trimmed;
  for (const t of standardTitles) { if (rest.startsWith(t)) { title = t; rest = rest.slice(t.length).trim(); break; } }
  const parts = rest.split(/\s+/);
  return { title, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
};

const genderFromTitle = (title: string) => {
  if (['นาย', 'เด็กชาย'].some(t => title.includes(t))) return 'ชาย';
  if (['นาง', 'นางสาว', 'เด็กหญิง'].some(t => title.includes(t))) return 'หญิง';
  return 'อื่นๆ';
};

interface AbiAnkleResult {
  status: 'normal' | 'abnormal';
  value: string; // Measured value if abnormal
}

interface AbiExamJson {
  ltResult?: AbiAnkleResult;
  rtResult?: AbiAnkleResult;
  remarks?: string;
}

const parseAbiNotes = (notesStr: string): AbiExamJson => {
  try {
    if (notesStr && (notesStr.startsWith('{') || notesStr.startsWith('['))) {
      return JSON.parse(notesStr) as AbiExamJson;
    }
  } catch (e) {
    console.error('Error parsing ABI JSON notes:', e);
  }
  
  const res: AbiExamJson = {};
  if (!notesStr) return res;

  const ltMatch = notesStr.match(/Lt:\s*([^\s(|]+)(?:\s*\(([^)]+)\))?/i);
  if (ltMatch) {
    const val = ltMatch[1].trim();
    const label = ltMatch[2] ? ltMatch[2].trim() : '';
    const status = (label.includes('PAD') || label.includes('ผิดปกติ')) ? 'abnormal' : 'normal';
    res.ltResult = { status, value: val === '-' ? '' : val };
  }
  
  const rtMatch = notesStr.match(/Rt:\s*([^\s(|]+)(?:\s*\(([^)]+)\))?/i);
  if (rtMatch) {
    const val = rtMatch[1].trim();
    const label = rtMatch[2] ? rtMatch[2].trim() : '';
    const status = (label.includes('PAD') || label.includes('ผิดปกติ')) ? 'abnormal' : 'normal';
    res.rtResult = { status, value: val === '-' ? '' : val };
  }
  
  const pipeParts = notesStr.split('|');
  if (pipeParts.length > 2) {
    res.remarks = pipeParts.slice(2).join('|').trim();
  } else {
    res.remarks = notesStr;
  }
  return res;
};

// Thai Date utility
const toThaiDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const thaiYear = parseInt(y) + 543;
  return `${d}/${m}/${thaiYear}`;
};

const formatDbDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
  }
  return dateStr;
};



// Mock data fallback
const MOCK_DATA = [
  { id: 1, hn: 'HN-00101', name: 'นายสมชาย ใจดี', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM, HT', ltResult: 'ปกติ', rtResult: 'ปกติ', remarks: '—', summary: 'ปกติ' },
  { id: 2, hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'HT', ltResult: 'ผิดปกติ (0.85)', rtResult: 'ปกติ', remarks: 'มีอาการชาปลายเท้า', summary: 'ผิดปกติ' },
  { id: 3, hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', diseases: 'DM, DLP', ltResult: 'ผิดปกติ (0.72)', rtResult: 'ผิดปกติ (0.68)', remarks: '—', summary: 'ผิดปกติ' },
  { id: 4, hn: 'HN-00104', name: 'นางมาลี ดอกไม้', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', diseases: '—', ltResult: 'ปกติ', rtResult: 'ปกติ', remarks: '—', summary: 'ปกติ' },
  { id: 5, hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', diseases: 'CKD', ltResult: 'ปกติ', rtResult: 'ปกติ', remarks: '—', summary: 'ปกติ' },
];

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.875rem',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.8rem',
  color: 'white',
  borderBottom: '1px solid var(--border-color)',
  whiteSpace: 'nowrap',
};

const THAI_MONTHS = [
  { value: '01', label: 'มกราคม' }, { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' }, { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' }, { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' }, { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' }, { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' },
];

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedLabel = options.find(opt => String(opt.value) === String(value))?.label || value || 'ทั้งหมด';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '36px',
          padding: '0 2.25rem 0 0.75rem',
          background: 'var(--bg-surface-solid)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-primary)',
          position: 'relative',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel}
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
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DmAbiView: React.FC<DmAbiViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const { allowedMenus } = useAuth();
  const canDelete = allowedMenus === null || allowedMenus.includes('delete-patients');
  const [showForm, setShowForm] = useState(false);

  // Custom Modal States
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showAlert = (message: string, title = 'แจ้งเตือน') => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = 'ยืนยันการทำรายการ') => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const renderCustomModal = () => {
    if (!modal.isOpen) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
        padding: '1rem'
      }}>
        <div style={{
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          animation: 'scaleUp 0.15s ease-out'
        }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            margin: 0,
            color: modal.type === 'confirm' ? 'var(--warning)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {modal.type === 'confirm' ? '⚠️' : 'ℹ️'} {modal.title}
          </h3>
          
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
            whiteSpace: 'pre-line'
          }}>
            {modal.message}
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
          }}>
            {modal.type === 'confirm' ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    modal.onCancel?.();
                    setModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  style={{ width: 'auto', minWidth: '80px', padding: '0.4rem 1rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    modal.onConfirm?.();
                  }}
                  style={{ width: 'auto', minWidth: '80px', padding: '0.4rem 1rem' }}
                >
                  ยืนยัน
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                style={{ width: 'auto', minWidth: '80px', padding: '0.4rem 1rem' }}
              >
                ตกลง
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Patient search states
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

  // Doctor autocomplete
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [activeDoctorIndex, setActiveDoctorIndex] = useState(-1);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([...MOCK_DOCTORS]);

  // Exam form states
  const [examDate, setExamDate] = useState(TODAY);
  const [editedDiseases, setEditedDiseases] = useState('');
  const [ltResult, setLtResult] = useState<AbiAnkleResult>({ status: 'normal', value: '' });
  const [rtResult, setRtResult] = useState<AbiAnkleResult>({ status: 'normal', value: '' });
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // DB list states
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterDate, setFilterDate] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [listError, setListError] = useState('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'month' | 'year'>('month');
  const [exportYear, setExportYear] = useState(currentYearStr);
  const [exportMonth, setExportMonth] = useState(currentMonthStr);
  const [exportResult, setExportResult] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Options
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: '', label: 'ทั้งหมด (ทุกปี)' },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - i;
      return { value: String(year), label: `ปี พ.ศ. ${year + 543}` };
    })
  ];

  const monthOptions = [
    { value: '', label: 'ทั้งหมด (ทุกเดือน)' },
    ...THAI_MONTHS
  ];

  const resultOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'ปกติ', label: 'ปกติ' },
    { value: 'ผิดปกติ', label: 'ผิดปกติ' },
  ];

  const pageSizeOptions = [
    { value: '10', label: '10 รายการ' },
    { value: '20', label: '20 รายการ' },
    { value: '50', label: '50 รายการ' },
  ];

  useEffect(() => {
    supabase.from('doctors').select('*').eq('status', 'active').order('id').then(({ data }) => {
      if (data && data.length > 0) setDoctorsList(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    supabase.from('appointments').select('appointment_date').eq('patient_id', selectedPatient.id)
      .order('appointment_date', { ascending: false }).limit(1).then(({ data }) => {
        setLastAppointmentDate(data?.[0]?.appointment_date || TODAY);
      });
    setEditedDiseases(selectedPatient.chronic_disease_note || '');
  }, [selectedPatient]);

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
    if (query.trim().length < 4) { setSearchResults([]); setShowSearchResults(false); return; }
    try {
      setSearchingHn(true);
      const q = `%${query.trim()}%`;
      const { data } = await supabase.from('patients').select('*')
        .or(`hn.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`)
        .eq('status', 'active').limit(8);
      setSearchResults(data || []);
      setShowSearchResults(true);
      if ((!data || data.length === 0) && query.trim().length >= 4) {
        setPatientNotFound(true);
        setMiniPatientForm({ ...initialPatientForm, hn: query.trim() });
        setLastAppointmentDate(TODAY);
      }
    } catch { } finally { setSearchingHn(false); }
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

  const fetchListData = async (targetPage = page, targetPageSize = pageSize) => {
    setListLoading(true);
    setListError('');
    try {
      if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback local mock filtering
        let filteredMock = [...MOCK_DATA];
        if (filterYear) {
          filteredMock = filteredMock.filter(r => {
            const y = r.date.split('/')[2];
            const isMatch = (parseInt(y) - 543).toString() === filterYear;
            return isMatch;
          });
        }
        if (filterMonth) {
          filteredMock = filteredMock.filter(r => r.date.split('/')[1] === filterMonth);
        }
        if (filterDate) {
          filteredMock = filteredMock.filter(r => formatDbDate(r.date) === filterDate);
        }
        if (filterResult) {
          filteredMock = filteredMock.filter(r => r.summary === filterResult);
        }

        setTotalCount(filteredMock.length);
        const sliced = filteredMock.slice((targetPage - 1) * targetPageSize, targetPage * targetPageSize);
        setDbResults(sliced.map((s) => ({
          id: s.id,
          exam_date: TODAY,
          result_status: s.summary,
          notes: JSON.stringify({
            ltResult: s.ltResult.includes('ผิดปกติ') ? { status: 'abnormal', value: s.ltResult.match(/\d+\.\d+/)?.[0] || '0.85' } : { status: 'normal', value: '' },
            rtResult: s.rtResult.includes('ผิดปกติ') ? { status: 'abnormal', value: s.rtResult.match(/\d+\.\d+/)?.[0] || '0.85' } : { status: 'normal', value: '' },
            remarks: s.remarks
          }),
          patients: {
            hn: s.hn,
            title: '',
            first_name: s.name,
            last_name: '',
            primary_doctor: s.doctor,
            chronic_disease_note: s.diseases,
          }
        })));
        setHasSearched(true);
        return;
      }

      // ── PROD: Supabase query ──────────
      let query = supabase
        .from('patient_abi_assessments')
        .select(`
          id,
          exam_date,
          result_status,
          notes,
          patients (
            id,
            hn,
            title,
            first_name,
            last_name,
            primary_doctor,
            chronic_disease_note
          )
        `, { count: 'exact' });

      if (filterYear) {
        if (filterMonth) {
          const yearNum = parseInt(filterYear);
          const monthNum = parseInt(filterMonth);
          const lastDay = new Date(yearNum, monthNum, 0).getDate();
          query = query
            .gte('exam_date', `${filterYear}-${filterMonth}-01`)
            .lte('exam_date', `${filterYear}-${filterMonth}-${String(lastDay).padStart(2, '0')}`);
        } else {
          query = query
            .gte('exam_date', `${filterYear}-01-01`)
            .lte('exam_date', `${filterYear}-12-31`);
        }
      }

      if (filterDate) {
        query = query.eq('exam_date', filterDate);
      }

      if (filterResult) {
        query = query.eq('result_status', filterResult);
      }

      const fromRange = (targetPage - 1) * targetPageSize;
      const toRange = targetPage * targetPageSize - 1;

      const { data, error, count } = await query
        .order('exam_date', { ascending: false })
        .range(fromRange, toRange);

      if (error) throw error;
      setDbResults(data || []);
      setTotalCount(count ?? 0);
      setHasSearched(true);
    } catch (err: any) {
      setListError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setListLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedPatient && !patientNotFound) errors.patient = 'กรุณาค้นหาและเลือกคนไข้';
    if (patientNotFound && !selectedPatient) {
      if (!miniPatientForm.hn.trim()) errors.hn = 'กรุณาระบุ HN';
      if (!miniPatientForm.first_name.trim()) errors.first_name = 'กรุณาระบุชื่อ (พิมพ์ชื่อเต็มด้านบน)';
    }
    
    // Validate value inputs when status is abnormal
    if (ltResult.status === 'abnormal' && !ltResult.value.trim()) {
      errors.ltValue = 'กรุณาระบุค่าข้อเท้าซ้ายที่วัดได้';
    }
    if (rtResult.status === 'abnormal' && !rtResult.value.trim()) {
      errors.rtValue = 'กรุณาระบุค่าข้อเท้าขวาที่วัดได้';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true); setSaveError(''); setSaveSuccess('');
    try {
      let patientId = selectedPatient?.id;

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
          chronic_disease_note: editedDiseases,
          status: 'active',
        }).select().single();
        if (patErr) throw patErr;
        patientId = newPat.id;
      }
      if (!patientId) throw new Error('ไม่พบข้อมูลคนไข้');

      // Update diseases for existing patient
      if (selectedPatient) {
        await supabase.from('patients').update({ chronic_disease_note: editedDiseases }).eq('id', patientId);
      }

      // Save appointment
      if (lastAppointmentDate) {
        const { data: existApps } = await supabase.from('appointments').select('*')
          .eq('patient_id', patientId).order('appointment_date', { ascending: false }).limit(1);
        if (existApps && existApps.length > 0) {
          await supabase.from('appointments').update({ appointment_date: lastAppointmentDate, updated_at: new Date().toISOString() }).eq('id', existApps[0].id);
        } else {
          await supabase.from('appointments').insert({
            patient_id: patientId, appointment_date: lastAppointmentDate,
            appointment_time: '09:00:00', department: 'อายุรกรรม (Medicine)',
            doctor_name: selectedPatient?.primary_doctor || miniPatientForm.primary_doctor || 'ไม่ระบุแพทย์',
            reason: 'บันทึกผล ABI', status: 'completed',
          });
        }
      }

      const isAbnormal = ltResult.status === 'abnormal' || rtResult.status === 'abnormal';
      const notesJson = {
        ltResult,
        rtResult,
        remarks: remarks.trim()
      };
      
      const serializedNotes = JSON.stringify(notesJson);

      if (editingId) {
        const isMockUuid = typeof editingId === 'number' || (typeof editingId === 'string' && !editingId.includes('-'));
        if (!isMockUuid) {
          const { error: saveErr } = await supabase
            .from('patient_abi_assessments')
            .update({
              exam_date: examDate,
              result_status: isAbnormal ? 'ผิดปกติ' : 'ปกติ',
              notes: serializedNotes,
            })
            .eq('id', editingId);
          if (saveErr) throw saveErr;
        }
        setSaveSuccess(`แก้ไขผลการตรวจ ABI สำเร็จ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      } else {
        await supabase.from('patient_abi_assessments').insert({
          patient_id: patientId,
          exam_date: examDate,
          result_status: isAbnormal ? 'ผิดปกติ' : 'ปกติ',
          notes: serializedNotes,
        });
        setSaveSuccess(`บันทึกผลการตรวจ ABI สำเร็จ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      }

      // Reset form states to default values
      setHnQuery('');
      setSelectedPatient(null);
      setSearchResults([]);
      setPatientNotFound(false);
      setMiniPatientForm(initialPatientForm);
      setFullNameInput('');
      setShowExtraFields(false);
      setLastAppointmentDate(TODAY);
      setSelectedDoctor(null);
      setDoctorQuery('');
      setExamDate(TODAY);
      setEditedDiseases('');
      setLtResult({ status: 'normal', value: '' });
      setRtResult({ status: 'normal', value: '' });
      setRemarks('');
      setEditingId(null);
      setFormErrors({});
      setShowForm(false);
      
      // Reload list
      fetchListData();
    } catch (err: any) {
      setSaveError('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (row: any) => {
    if (row.rawRecord) {
      const r = row.rawRecord;
      setEditingId(r.id);
      const patient = r.patients;
      if (patient) {
        setSelectedPatient({
          id: patient.id,
          hn: patient.hn,
          title: patient.title || '',
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          gender: patient.gender || 'ชาย',
          phone_number: patient.phone_number || '',
          address: patient.address || '',
          emergency_contact_name: patient.emergency_contact_name || '',
          emergency_contact_phone: patient.emergency_contact_phone || '',
          medical_right: patient.medical_right || '',
          primary_doctor: patient.primary_doctor || '',
          chronic_disease_note: patient.chronic_disease_note || '',
          status: 'active'
        } as any);
        setHnQuery(patient.hn);
      }
      setExamDate(r.exam_date);
      
      const exam = parseAbiNotes(r.notes);
      setLtResult(exam.ltResult || { status: 'normal', value: '' });
      setRtResult(exam.rtResult || { status: 'normal', value: '' });
      setRemarks(exam.remarks || '');
    } else {
      // Mock data edit
      setEditingId(row.id);
      setSelectedPatient(null);
      setHnQuery(row.hn);
      setPatientNotFound(true);
      setMiniPatientForm({
        ...initialPatientForm,
        hn: row.hn,
        first_name: row.name,
      });
      setFullNameInput(row.name);
      
      const parseSide = (val: string) => {
        if (val === 'ปกติ') return { status: 'normal' as const, value: '' };
        const matchVal = val.match(/\d+\.\d+/);
        return { status: 'abnormal' as const, value: matchVal ? matchVal[0] : '0.90' };
      };
      
      setLtResult(parseSide(row.ltResult));
      setRtResult(parseSide(row.rtResult));
      setRemarks(row.remarks === '—' ? '' : row.remarks);
    }
    setSaveSuccess('');
    setSaveError('');
    setShowForm(true);
  };

  const handleDeleteRecord = (row: any) => {
    const isMock = !row.rawRecord;
    const confirmMsg = `คุณต้องการลบข้อมูลการตรวจคัดกรอง ABI ของ ${row.name} (HN: ${row.hn}) ใช่หรือไม่?`;
    
    showConfirm(confirmMsg, async () => {
      try {
        if (!isMock) {
          const { error } = await supabase
            .from('patient_abi_assessments')
            .delete()
            .eq('id', row.rawRecord.id);
          if (error) throw error;
        }
        showAlert('ลบข้อมูลการตรวจคัดกรอง ABI สำเร็จ', 'ลบข้อมูลสำเร็จ');
        fetchListData(page, pageSize);
      } catch (err: any) {
        showAlert('ลบข้อมูลไม่สำเร็จ: ' + err.message, 'เกิดข้อผิดพลาด');
      }
    }, 'ยืนยันการลบข้อมูล');
  };

  const resetForm = () => {
    setShowForm(false); setHnQuery(''); setSelectedPatient(null);
    setSearchResults([]); setPatientNotFound(false);
    setMiniPatientForm(initialPatientForm); setFullNameInput('');
    setShowExtraFields(false); setLastAppointmentDate(TODAY);
    setSelectedDoctor(null); setDoctorQuery('');
    setExamDate(TODAY); setEditedDiseases('');
    setLtResult({ status: 'normal', value: '' });
    setRtResult({ status: 'normal', value: '' });
    setRemarks('');
    setEditingId(null);
    setSaveSuccess(''); setSaveError(''); setFormErrors({});
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setExportSuccess(false);
    setExportProgress(10);
    setExportMessage('กำลังเตรียมรูปแบบข้อมูลเพื่อนำออกรายงาน...');

    try {
      const yearStr = exportYear;
      const monthStr = exportMonth;

      let startDate = `${yearStr}-01-01`;
      let endDate = `${yearStr}-12-31`;

      if (exportMode === 'month') {
        const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        startDate = `${yearStr}-${monthStr}-01`;
        endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      }

      if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
        setExportProgress(50);
        let filteredMock = [...MOCK_DATA];
        if (exportMode === 'month') {
          filteredMock = filteredMock.filter(r => r.date.split('/')[1] === monthStr);
        }
        if (exportResult) {
          filteredMock = filteredMock.filter(r => r.summary === exportResult);
        }

        const excelData = filteredMock.map((row, idx) => ({
          'ลำดับ': idx + 1,
          'HN': row.hn,
          'ชื่อ-นามสกุล': row.name,
          'แพทย์เจ้าของไข้': row.doctor,
          'วันที่ตรวจ': row.date,
          'โรคประจำตัว': row.diseases,
          'ข้อเท้าซ้าย (Lt.)': row.ltResult,
          'ข้อเท้าขวา (Rt.)': row.rtResult,
          'หมายเหตุ': row.remarks
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรอง ABI');
        
        const fileLabel = exportMode === 'year' 
          ? `ปี_${parseInt(yearStr) + 543}` 
          : `เดือน_${THAI_MONTHS.find(m => m.value === monthStr)?.label ?? monthStr}_${parseInt(yearStr) + 543}`;
        XLSX.writeFile(workbook, `abi_screening_${fileLabel}.xlsx`);
        
        setExportProgress(100);
        setExportSuccess(true);
        setExportMessage(`ดาวน์โหลดสำเร็จ! (ข้อมูล Mock) สรุปนำออกแล้วทั้งหมด ${filteredMock.length} รายการ`);
        return;
      }

      // ── PROD: Supabase ────────────────
      let countQuery = supabase
        .from('patient_abi_assessments')
        .select('id', { count: 'exact', head: true })
        .gte('exam_date', startDate)
        .lte('exam_date', endDate);

      if (exportResult) {
        countQuery = countQuery.eq('result_status', exportResult);
      }

      const { count: total, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      
      if (!total) {
        throw new Error('ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก');
      }

      setExportProgress(20);
      setExportMessage(`ค้นพบข้อมูลทั้งหมด ${total} รายการ กำลังเริ่มดึงข้อมูล...`);

      let allResults: any[] = [];
      const batchSize = 1000;
      for (let offset = 0; offset < total; offset += batchSize) {
        const progressVal = 20 + Math.round((offset / total) * 60);
        setExportProgress(progressVal);
        setExportMessage(`กำลังดึงประวัติการคัดกรอง ABI... (${offset} จาก ${total} รายการ)`);

        let query = supabase
          .from('patient_abi_assessments')
          .select(`
            exam_date,
            result_status,
            notes,
            patients (
              hn,
              title,
              first_name,
              last_name,
              primary_doctor,
              chronic_disease_note
            )
          `)
          .gte('exam_date', startDate)
          .lte('exam_date', endDate);

        if (exportResult) {
          query = query.eq('result_status', exportResult);
        }

        const { data, error } = await query
          .order('exam_date', { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        allResults = [...allResults, ...(data || [])];
      }

      setExportProgress(85);
      setExportMessage('ดึงข้อมูลเสร็จสิ้น กำลังสรุปข้อมูลในรูปแบบ Excel...');

      const excelData = allResults.map((r, idx) => {
        const patient = r.patients;
        const exam = parseAbiNotes(r.notes);
        
        const ltText = exam.ltResult 
          ? (exam.ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ (${exam.ltResult.value})`)
          : 'ปกติ';
          
        const rtText = exam.rtResult 
          ? (exam.rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ (${exam.rtResult.value})`)
          : 'ปกติ';

        return {
          'ลำดับ': idx + 1,
          'HN': patient?.hn ?? '',
          'ชื่อ-นามสกุล': `${patient?.title ?? ''}${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`.trim(),
          'แพทย์เจ้าของไข้': patient?.primary_doctor ?? '',
          'วันที่ตรวจ': toThaiDate(r.exam_date ?? ''),
          'โรคประจำตัว': patient?.chronic_disease_note ?? '',
          'ข้อเท้าซ้าย (Lt.)': ltText,
          'ข้อเท้าขวา (Rt.)': rtText,
          'หมายเหตุ': exam.remarks || '—'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรอง ABI');

      const fileLabel = exportMode === 'year' 
        ? `ปี_${parseInt(yearStr) + 543}` 
        : `เดือน_${THAI_MONTHS.find(m => m.value === monthStr)?.label ?? monthStr}_${parseInt(yearStr) + 543}`;
      XLSX.writeFile(workbook, `abi_screening_${fileLabel}.xlsx`);

      setExportProgress(100);
      setExportSuccess(true);
      setExportMessage(`ดาวน์โหลดสำเร็จ! สรุปนำออกแล้วทั้งหมด ${total} รายการ`);

    } catch (err: any) {
      setExportMessage(`ดาวน์โหลดล้มเหลว: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const displayRows = dbResults.length > 0
    ? dbResults.map((r, index) => {
        const patient = r.patients;
        const exam = parseAbiNotes(r.notes);
        
        const ltText = exam.ltResult 
          ? (exam.ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ (${exam.ltResult.value})`)
          : 'ปกติ';
          
        const rtText = exam.rtResult 
          ? (exam.rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ (${exam.rtResult.value})`)
          : 'ปกติ';

        return {
          id: index + 1,
          hn: patient?.hn || '—',
          name: patient ? `${patient.title || ''}${patient.first_name || ''} ${patient.last_name || ''}`.trim() : '—',
          doctor: patient?.primary_doctor || '—',
          date: formatDbDate(r.exam_date),
          diseases: patient?.chronic_disease_note || '—',
          ltResult: ltText,
          rtResult: rtText,
          remarks: exam.remarks || '—',
          summary: r.result_status,
          summaryColor: r.result_status === 'ปกติ' ? '#10b981' : '#ef4444',
          rawRecord: r
        };
      })
    : MOCK_DATA.map((row, index) => ({
        id: index + 1,
        hn: row.hn,
        name: row.name,
        doctor: row.doctor,
        date: row.date,
        diseases: row.diseases,
        ltResult: row.ltResult,
        rtResult: row.rtResult,
        remarks: row.remarks,
        summary: row.summary,
        summaryColor: row.summary === 'ปกติ' ? '#10b981' : '#ef4444'
      }));

  const DoctorAutocomplete = () => (
    selectedDoctor ? (
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
    )
  );

  const pageData = dbResults.length > 0 ? displayRows : displayRows.slice((page - 1) * pageSize, page * pageSize);

  if (showForm) {
    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        <button className="btn btn-secondary" style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }} onClick={resetForm}>
          ← กลับรายการ
        </button>

        <div className="dashboard-card" style={{ maxWidth: '100%' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            🫀 {editingId ? 'แก้ไขข้อมูลการตรวจคัดกรอง ABI' : 'บันทึกผลการตรวจคัดกรอง ABI'}
          </h2>

          {/* Step 1 */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem', background: 'var(--bg-secondary)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 1: ค้นหาคนไข้ (กรอก HN หรือชื่อ)
            </h4>

            {selectedPatient ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-solid)', border: '1.5px solid var(--primary-glow)' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)', marginRight: '1rem' }}>HN: {selectedPatient.hn}</strong>
                    <span>{selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name}</span>
                    <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>แพทย์เจ้าของไข้: {selectedPatient.primary_doctor || '—'}</span>
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => { setSelectedPatient(null); setHnQuery(''); setPatientNotFound(false); }}>
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
                  <input type="text" className="form-input" placeholder="พิมพ์ HN หรือชื่อคนไข้เพื่อค้นหา..."
                    value={hnQuery} onChange={e => handleSearchHn(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)} />
                  {searchingHn && <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>กำลังค้นหา...</span>}
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ zIndex: 150, background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'absolute', top: '100%', left: 0, right: 0, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
                    {searchResults.map(p => (
                      <div key={p.id} className="autocomplete-item" onMouseDown={() => handleSelectPatient(p)}
                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        <span className="autocomplete-item-id" style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>{p.hn}</span>
                        <div className="autocomplete-item-info">
                          <div className="autocomplete-item-name" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{p.title}{p.first_name} {p.last_name}</div>
                          <div className="autocomplete-item-meta" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>แพทย์: {p.primary_doctor || '—'} • {p.phone_number || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.patient && <span className="form-error" style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>⚠️ {formErrors.patient}</span>}
              </div>
            )}

            {/* New Patient Form */}
            {patientNotFound && !selectedPatient && (
              <div style={{ marginTop: '1rem', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border-focus)', background: 'rgba(99, 102, 241, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>➕</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>ไม่พบคนไข้ในระบบ — กรอกข้อมูลเพื่อลงทะเบียนคนไข้ใหม่</span>
                </div>
                <div className="opd-form-grid" style={{ gridTemplateColumns: '160px 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">HN *</label>
                    <input type="text" className="form-input" value={miniPatientForm.hn} style={{ fontWeight: 700 }}
                      onChange={e => setMiniPatientForm({ ...miniPatientForm, hn: e.target.value })} />
                    {formErrors.hn && <span className="form-error" style={{ color: 'red', fontSize: '0.75rem' }}>{formErrors.hn}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ชื่อ-นามสกุล * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(พิมพ์ชื่อเต็มพร้อมคำนำหน้า)</span></label>
                    <input type="text" className="form-input" placeholder="เช่น นายสมชาย ใจดี" value={fullNameInput} onChange={e => handleFullNameChange(e.target.value)} />
                    {formErrors.first_name && <span className="form-error" style={{ color: 'red', fontSize: '0.75rem' }}>{formErrors.first_name}</span>}
                  </div>
                </div>
                <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">แพทย์เจ้าของไข้</label>
                    <DoctorAutocomplete />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันนัดหมายล่าสุด</label>
                    <BuddhistDateInput value={lastAppointmentDate} onChange={setLastAppointmentDate} placeholder="เลือกวันนัดหมายล่าสุด (พ.ศ.)" />
                  </div>
                </div>
                {(miniPatientForm.title || miniPatientForm.first_name) && (
                  <div style={{ display: 'flex', gap: '0.75rem', margin: '0.75rem 0', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>แยกอัตโนมัติ:</span>
                    <span>คำนำหน้า: <strong>{miniPatientForm.title}</strong></span>
                    <span>ชื่อ: <strong>{miniPatientForm.first_name || '—'}</strong></span>
                    <span>นามสกุล: <strong>{miniPatientForm.last_name || '—'}</strong></span>
                    <span>เพศ: <strong>{miniPatientForm.gender}</strong></span>
                  </div>
                )}
                <button type="button" onClick={() => setShowExtraFields(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, padding: '0.25rem 0', marginTop: '0.5rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showExtraFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                  {showExtraFields ? 'ซ่อนข้อมูลเพิ่มเติม' : 'กรอกข้อมูลเพิ่มเติม (ไม่บังคับ)'}
                </button>
                {showExtraFields && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="opd-form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 120px', gap: '0.75rem' }}>
                      <div className="form-group"><label className="form-label">คำนำหน้า</label><input type="text" className="form-input" value={miniPatientForm.title} onChange={e => setMiniPatientForm(p => ({ ...p, title: e.target.value, gender: genderFromTitle(e.target.value) }))} /></div>
                      <div className="form-group"><label className="form-label">ชื่อจริง</label><input type="text" className="form-input" value={miniPatientForm.first_name} onChange={e => setMiniPatientForm({ ...miniPatientForm, first_name: e.target.value })} /></div>
                      <div className="form-group"><label className="form-label">นามสกุล</label><input type="text" className="form-input" value={miniPatientForm.last_name} onChange={e => setMiniPatientForm({ ...miniPatientForm, last_name: e.target.value })} /></div>
                      <div className="form-group"><label className="form-label">เพศ</label><select className="form-select" value={miniPatientForm.gender} onChange={e => setMiniPatientForm({ ...miniPatientForm, gender: e.target.value })}>{['ชาย', 'หญิง', 'อื่นๆ'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 2: บันทึกผลการตรวจคัดกรอง ABI
            </h4>

            <div className="form-group" style={{ marginBottom: '1.25rem', maxWidth: 280 }}>
              <label className="form-label">วันที่ตรวจ</label>
              <BuddhistDateInput value={examDate} onChange={setExamDate} />
            </div>

            {/* Disease select */}
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🩺</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>โรคประจำตัวคนไข้:</span>
              </div>
              <div style={{ width: '100%', marginTop: '0.25rem' }}>
                <DiseaseMultiSelect
                  value={editedDiseases}
                  onChange={setEditedDiseases}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* Left Ankle */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🦵 ข้อเท้าซ้าย (Left Ankle)
                </h4>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>ผลการตรวจข้อเท้าซ้าย</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', maxWidth: '280px' }}>
                    <button
                      type="button"
                      onClick={() => setLtResult({ status: 'normal', value: '' })}
                      style={{
                        flex: 1,
                        height: '38px',
                        border: '1.5px solid',
                        borderColor: ltResult.status === 'normal' ? '#10b981' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        background: ltResult.status === 'normal' ? '#10b981' : 'transparent',
                        color: ltResult.status === 'normal' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>✔️ ปกติ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLtResult({ ...ltResult, status: 'abnormal' })}
                      style={{
                        flex: 1,
                        height: '38px',
                        border: '1.5px solid',
                        borderColor: ltResult.status === 'abnormal' ? '#dc2626' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        background: ltResult.status === 'abnormal' ? '#dc2626' : 'transparent',
                        color: ltResult.status === 'abnormal' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>❌ ผิดปกติ</span>
                    </button>
                  </div>
                </div>

                {ltResult.status === 'abnormal' && (
                  <div className="form-group" style={{ animation: 'slideDown 0.2s ease-out' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#dc2626' }}>ระบุค่า ABI ที่วัดได้ *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="3"
                      className="form-input"
                      placeholder="ระบุค่า เช่น 0.85"
                      value={ltResult.value}
                      onChange={e => setLtResult({ ...ltResult, value: e.target.value })}
                      style={{ border: '1.5px solid #fca5a5' }}
                    />
                    {formErrors.ltValue && <span className="form-error" style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>⚠️ {formErrors.ltValue}</span>}
                  </div>
                )}
              </div>

              {/* Right Ankle */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🦵 ข้อเท้าขวา (Right Ankle)
                </h4>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>ผลการตรวจข้อเท้าขวา</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', maxWidth: '280px' }}>
                    <button
                      type="button"
                      onClick={() => setRtResult({ status: 'normal', value: '' })}
                      style={{
                        flex: 1,
                        height: '38px',
                        border: '1.5px solid',
                        borderColor: rtResult.status === 'normal' ? '#10b981' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        background: rtResult.status === 'normal' ? '#10b981' : 'transparent',
                        color: rtResult.status === 'normal' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>✔️ ปกติ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRtResult({ ...rtResult, status: 'abnormal' })}
                      style={{
                        flex: 1,
                        height: '38px',
                        border: '1.5px solid',
                        borderColor: rtResult.status === 'abnormal' ? '#dc2626' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        background: rtResult.status === 'abnormal' ? '#dc2626' : 'transparent',
                        color: rtResult.status === 'abnormal' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>❌ ผิดปกติ</span>
                    </button>
                  </div>
                </div>

                {rtResult.status === 'abnormal' && (
                  <div className="form-group" style={{ animation: 'slideDown 0.2s ease-out' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#dc2626' }}>ระบุค่า ABI ที่วัดได้ *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="3"
                      className="form-input"
                      placeholder="ระบุค่า เช่น 0.78"
                      value={rtResult.value}
                      onChange={e => setRtResult({ ...rtResult, value: e.target.value })}
                      style={{ border: '1.5px solid #fca5a5' }}
                    />
                    {formErrors.rtValue && <span className="form-error" style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>⚠️ {formErrors.rtValue}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">หมายเหตุเพิ่มเติม</label>
              <input type="text" className="form-input" placeholder="พิมพ์ข้อความเพิ่มเติมหากมี..."
                value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
          </div>

          {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>✅ {saveSuccess}</div>}
          {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5' }}>⚠️ {saveError}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!selectedPatient && !patientNotFound)} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกผลตรวจ ABI'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto', padding: '0.5rem 1.25rem' }}>ยกเลิก</button>
          </div>
        </div>
        {renderCustomModal()}
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🫀 การตรวจคัดกรอง ABI</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>ระบบบันทึกประวัติและผลการวิเคราะห์ดัชนี Ankle-Brachial Index แยกตารางเฉพาะ</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={() => { setSaveSuccess(''); setSaveError(''); setShowForm(true); }} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มข้อมูลการตรวจ
          </button>
          <button className="btn btn-secondary" onClick={onBack} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>← กลับหน้าหลัก</button>
        </div>
      </div>

      {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>✅ {saveSuccess}</div>}

      {/* Criteria Legend */}
      <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }}></span>
          เกณฑ์การคัดกรองดัชนี ABI (Ankle-Brachial Index)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1rem' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#10b981', marginRight: 8, verticalAlign: 'middle' }}></span><strong>ปกติ:</strong> ค่าดัชนี ABI ทั้งข้อเท้าซ้ายและขวา มีค่าตั้งแต่ 1.0 ขึ้นไป</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#ef4444', marginRight: 8, verticalAlign: 'middle' }}></span><strong>ผิดปกติ:</strong> ค่าดัชนี ABI ข้างใดข้างหนึ่งตรวจพบความผิดปกติ มีค่าน้อยกว่า 1.0 (ตรวจพบสัญญาณของหลอดเลือดตีบตัน)</span>
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
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>วันที่ตรวจ (พ.ศ.)</label>
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
            setDbResults([]);
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
            background: 'var(--bg-surface-solid)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s'
          }}
        >
          ล้างตัวกรอง
        </button>
        <button
          className="btn btn-primary"
          onClick={() => { setPage(1); fetchListData(1); }}
          style={{
            width: 'auto',
            padding: '0.375rem 1.25rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          🔍 ค้นหา
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
                    <th style={thStyle}>วันที่ตรวจ</th>
                    <th style={thStyle}>โรคประจำตัว</th>
                    <th style={thStyle}>ข้อเท้าซ้าย (Lt.)</th>
                    <th style={thStyle}>ข้อเท้าขวา (Rt.)</th>
                    <th style={thStyle}>หมายเหตุ</th>
                    <th style={{ ...thStyle, width: 140, textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasSearched ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        🔍 กรุณากดปุ่ม <strong>"ค้นหา"</strong> ด้านบนเพื่อแสดงรายการผลตรวจ
                      </td>
                    </tr>
                  ) : listLoading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ⏳ กำลังโหลดข้อมูลคัดกรอง ABI...
                      </td>
                    </tr>
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ไม่พบข้อมูลการตรวจคัดกรอง ABI
                      </td>
                    </tr>
                  ) : (
                    pageData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{(page - 1) * pageSize + idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.hn}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{row.doctor}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.date}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {row.diseases && row.diseases !== '—' ? (
                              row.diseases.split(',').map((d: any) => (
                                <span key={d} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{d.trim()}</span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: row.ltResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.ltResult}</td>
                        <td style={{ padding: '0.75rem 1rem', color: row.rtResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.rtResult}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.remarks}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleStartEdit(row)}
                              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            >
                              ✏️ แก้ไข
                            </button>
                            {canDelete && (
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteRecord(row)}
                                style={{
                                  width: 'auto',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#fca5a5';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#fee2e2';
                                }}
                              >
                                🗑️ ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {hasSearched && pageData.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ</span>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button className="btn btn-secondary" onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); fetchListData(newPage, pageSize); }} disabled={page === 1} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>‹ ก่อนหน้า</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setPage(p); fetchListData(p, pageSize); }} style={{ width: 32, padding: '0.35rem 0', fontSize: '0.8rem', minWidth: 32 }}>{p}</button>
                  ))}
                  <button className="btn btn-secondary" onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); fetchListData(newPage, pageSize); }} disabled={page === totalPages} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>ถัดไป ›</button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Export to Excel Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--bg-surface-solid)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '440px', padding: '1.5rem', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', animation: 'scaleUp 0.2s ease-out' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>📂 ส่งออกรายงานคัดกรอง ABI (Excel)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>กรุณาเลือกปีกิจกรรมและรูปแบบขอบเขตของข้อมูลที่ต้องการนำออก</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>ขอบเขตข้อมูล</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                    <input type="radio" name="exportMode" checked={exportMode === 'month'} onChange={() => setExportMode('month')} style={{ accentColor: 'var(--primary)' }} />
                    <span>ตามเดือนที่เลือก</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                    <input type="radio" name="exportMode" checked={exportMode === 'year'} onChange={() => setExportMode('year')} style={{ accentColor: 'var(--primary)' }} />
                    <span>ตามปีที่เลือก (ทั้ง 12 เดือน)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">เลือกปี (พ.ศ.)</label>
                  <CustomSelect value={exportYear} onChange={setExportYear} options={yearOptions.filter(y => y.value !== '')} />
                </div>
                {exportMode === 'month' && (
                  <div className="form-group">
                    <label className="form-label">เลือกเดือน</label>
                    <CustomSelect value={exportMonth} onChange={setExportMonth} options={THAI_MONTHS} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">กรองผลคัดกรอง</label>
                <CustomSelect value={exportResult} onChange={setExportResult} options={resultOptions} />
              </div>
            </div>

            {exporting && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{exportMessage}</span>
                  <span>{exportProgress}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${exportProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease-out' }}></div>
                </div>
              </div>
            )}

            {exportSuccess && (
              <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', color: '#065f46', fontSize: '0.75rem', fontWeight: 500 }}>
                {exportMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                style={{ width: 'auto', padding: '0.4rem 1.25rem' }}
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportExcel}
                disabled={exporting}
                style={{ width: 'auto', padding: '0.4rem 1.5rem', background: '#10b981', borderColor: '#10b981' }}
              >
                {exporting ? 'กำลังนำออก...' : '📥 เริ่มดาวน์โหลด'}
              </button>
            </div>
          </div>
        </div>
      )}
      {renderCustomModal()}
    </div>
  );
};
