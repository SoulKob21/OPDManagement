import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MedicineDelivery, Patient, Doctor, DeliveryType, DeliveryStatus } from '../types/opd';
import { DELIVERY_TYPE_LABELS, DELIVERY_STATUS_LABELS, MEDICAL_RIGHTS, GENDERS, MOCK_DOCTORS } from '../types/opd';
import { BuddhistDateInput } from '../components/BuddhistDateInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

type ViewMode = 'list' | 'create';

interface DeliveryFormState {
  delivery_type: DeliveryType;
  delivery_date: string;
  prescription_count: number;
  note: string;
  print_date: string;
}

const initialDeliveryForm: DeliveryFormState = {
  delivery_type: 'post',
  delivery_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
  prescription_count: 1,
  note: '',
  print_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
};

interface PatientFormState {
  hn: string;
  title: string;
  first_name: string;
  last_name: string;
  citizen_id: string;
  passport_number: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_right: string;
  primary_doctor: string;
  allergy_note: string;
  chronic_disease_note: string;
  status: 'active' | 'inactive';
}

const initialPatientForm: PatientFormState = {
  hn: '',
  title: 'นาย',
  first_name: '',
  last_name: '',
  citizen_id: '',
  passport_number: '',
  gender: 'ชาย',
  date_of_birth: '',
  phone_number: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_right: 'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
  primary_doctor: '',
  allergy_note: '',
  chronic_disease_note: '',
  status: 'active',
};

export const MedicineDeliveryPage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const [deliveries, setDeliveries] = useState<MedicineDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { allowedMenus } = useAuth();
  const canDelete = allowedMenus === null || allowedMenus.includes('delete-data');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [submitting, setSubmitting] = useState(false);

  // HN Search
  const [hnQuery, setHnQuery] = useState('');
  const [searchingHn, setSearchingHn] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);

  // Forms
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormState>(initialDeliveryForm);
  const [miniPatientForm, setMiniPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Full name input & extra fields toggle
  const [fullNameInput, setFullNameInput] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);

  // Last appointment date for new patient registration
  const [lastAppointmentDate, setLastAppointmentDate] = useState('');

  // Custom delete confirmation state
  const [deleteDeliveryId, setDeleteDeliveryId] = useState<number | null>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState('sent_to_pharmacy');
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterStatus]);

  // Status update
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);

  // Last Appointments Map (patient_id -> appointment_date)
  const [lastAppointments, setLastAppointments] = useState<Record<string, string>>({});

  // Doctor Autocomplete State
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [activeDoctorIndex, setActiveDoctorIndex] = useState(-1);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(() => {
    return [...MOCK_DOCTORS].sort((a, b) => a.id - b.id);
  });

  // Delivery Type Custom Dropdown State
  const [showDeliveryTypeDropdown, setShowDeliveryTypeDropdown] = useState(false);

  useEffect(() => {
    fetchDeliveries();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      const fetchPatientLastAppointment = async () => {
        const { data, error } = await supabase
          .from('appointments')
          .select('appointment_date')
          .eq('patient_id', selectedPatient.id)
          .order('appointment_date', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setLastAppointmentDate(data[0].appointment_date);
        } else {
          setLastAppointmentDate('');
        }
      };
      fetchPatientLastAppointment();
    } else {
      setLastAppointmentDate('');
    }
  }, [selectedPatient]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('status', 'active')
        .order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        setDoctorsList(data);
      }
    } catch {
      // fallback to MOCK_DOCTORS
    }
  };

  const filteredDoctors = doctorsList.filter((d) => {
    if (!doctorQuery.trim()) return true;
    const q = doctorQuery.toLowerCase();
    return (
      String(d.id).includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.license_no.toLowerCase().includes(q)
    );
  });

  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setMiniPatientForm({ ...miniPatientForm, primary_doctor: doc.name });
    setDoctorQuery('');
    setShowDoctorDropdown(false);
    setActiveDoctorIndex(-1);
  };

  const handleClearDoctor = () => {
    setSelectedDoctor(null);
    setMiniPatientForm({ ...miniPatientForm, primary_doctor: '' });
    setDoctorQuery('');
  };

  const handleDoctorKeyDown = (e: React.KeyboardEvent) => {
    if (!showDoctorDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDoctorIndex(prev => Math.min(prev + 1, filteredDoctors.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDoctorIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeDoctorIndex >= 0) {
      e.preventDefault();
      handleSelectDoctor(filteredDoctors[activeDoctorIndex]);
    } else if (e.key === 'Escape') {
      setShowDoctorDropdown(false);
    }
  };

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('medicine_deliveries')
        .select('*, patients(*)')
        .order('delivery_date', { ascending: false })
        .order('id', { ascending: false });

      if (fetchErr) throw fetchErr;
      const deliveriesData = data || [];
      setDeliveries(deliveriesData);

      // Fetch the last appointment for each patient
      const patientIds = deliveriesData.map((d) => d.patient_id).filter(Boolean);
      if (patientIds.length > 0) {
        const { data: appointmentsData, error: appErr } = await supabase
          .from('appointments')
          .select('patient_id, appointment_date')
          .in('patient_id', patientIds)
          .order('appointment_date', { ascending: false });

        if (!appErr && appointmentsData) {
          const appointmentMap: Record<string, string> = {};
          appointmentsData.forEach((app) => {
            if (!appointmentMap[app.patient_id]) {
              appointmentMap[app.patient_id] = app.appointment_date;
            }
          });
          setLastAppointments(appointmentMap);
        }
      }
    } catch (err: any) {
      console.error('Error fetching deliveries:', err);
      setError('ไม่สามารถโหลดข้อมูลประวัติส่งยาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchHn = async (query: string) => {
    setHnQuery(query);
    setPatientNotFound(false);
    setSelectedPatient(null);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchingHn(true);
      const q = `%${query.trim()}%`;
      const { data, error: searchErr } = await supabase
        .from('patients')
        .select('*')
        .or(`hn.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`)
        .eq('status', 'active')
        .limit(8);

      if (searchErr) throw searchErr;
      setSearchResults(data || []);
      setShowSearchResults(true);

      if (data && data.length === 0 && query.trim().length >= 2) {
        setPatientNotFound(true);
        setMiniPatientForm({ ...initialPatientForm, hn: query.trim() });
      }
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setSearchingHn(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setHnQuery(patient.hn);
    setSearchResults([]);
    setShowSearchResults(false);
    setPatientNotFound(false);
    setLastAppointmentDate(lastAppointments[patient.id] || '');
  };

  // Parse full name "นายกอไก่ ขอไข่" → { title, first_name, last_name }
  // Supports custom abbreviations, ranks, or special prefix titles (e.g. พญ., นพ., ดร., ร.ต.อ.)
  const parseTitleAndName = (input: string): { title: string; first_name: string; last_name: string } => {
    const trimmed = input.trim();
    if (!trimmed) {
      return { title: 'นาย', first_name: '', last_name: '' };
    }

    // 1. Check for titles/ranks ending with a dot (e.g., พญ., นพ., ดร., ร.ต.อ., พล.ต.ต.)
    // We use a greedy match on letters and dots ending with a dot to capture compound titles.
    const dotTitleRegex = /^([ก-ฮa-zA-Z\.]+\.)\s*(.*)$/;
    const dotMatch = trimmed.match(dotTitleRegex);
    if (dotMatch) {
      const title = dotMatch[1];
      const rest = dotMatch[2].trim();
      const parts = rest.split(/\s+/);
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ');
      return { title, first_name, last_name };
    }

    // 2. Check for standard Thai titles and other known prefix words without dots
    const standardTitles = [
      'นางสาว', 'นาง', 'นาย', 'เด็กหญิง', 'เด็กชาย', 'พระภิกษุ', 'พระ', 'คุณ',
      'นายแพทย์', 'แพทย์หญิง', 'ศาสตราจารย์', 'รองศาสตราจารย์', 'ผู้ช่วยศาสตราจารย์',
      'พลเอก', 'พลโท', 'พลตรี', 'พันเอก', 'พันโท', 'พันตรี', 'ร้อยเอก', 'ร้อยโท', 'ร้อยตรี',
      'พลตำรวจเอก', 'พลตำรวจโท', 'พลตำรวจตรี', 'พันตำรวจเอก', 'พันตำรวจโท', 'พันตำรวจตรี',
      'ร้อยตำรวจเอก', 'ร้อยตำรวจโท', 'ร้อยตำรวจตรี', 'ดาบตำรวจ', 'จ่าสิบตำรวจ', 'นายดาบ',
      'พญ', 'นพ', 'ดร', 'ศ', 'รศ', 'ผศ', 'ทพ', 'ทพญ', 'ภก', 'ภญ', 'สพญ', 'คุณครู', 'ครู'
    ];

    let title = '';
    let rest = trimmed;
    for (const t of standardTitles) {
      if (rest.startsWith(t)) {
        title = t;
        rest = rest.slice(t.length).trim();
        break;
      }
    }

    // Default to 'นาย' if no recognizable prefix is found
    if (!title) {
      title = 'นาย';
    }

    const parts = rest.split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ');
    return { title, first_name, last_name };
  };

  const genderFromTitle = (title: string): string => {
    const cleanTitle = title.trim();
    
    // Male prefixes
    if (
      ['นาย', 'เด็กชาย', 'พระภิกษุ', 'พระ', 'นพ', 'นพ.', 'นายแพทย์'].includes(cleanTitle) ||
      cleanTitle.includes('นาย') ||
      cleanTitle.includes('เด็กชาย')
    ) {
      return 'ชาย';
    }
    
    // Female prefixes
    if (
      ['นาง', 'นางสาว', 'เด็กหญิง', 'พญ', 'พญ.', 'แพทย์หญิง'].includes(cleanTitle) ||
      cleanTitle.includes('นาง') ||
      cleanTitle.includes('เด็กหญิง')
    ) {
      return 'หญิง';
    }
    
    return 'อื่นๆ';
  };

  const handleFullNameChange = (value: string) => {
    setFullNameInput(value);
    const parsed = parseTitleAndName(value);
    const gender = genderFromTitle(parsed.title);
    setMiniPatientForm(prev => ({
      ...prev,
      title: parsed.title,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      gender,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedPatient && !patientNotFound) {
      errors.patient = 'กรุณาค้นหาและเลือกคนไข้';
    }

    if (patientNotFound && !selectedPatient) {
      if (!miniPatientForm.hn.trim()) errors.hn = 'กรุณาระบุ HN';
      if (!miniPatientForm.first_name.trim()) errors.first_name = 'กรุณาระบุชื่อ (พิมพ์ชื่อเต็มด้านบน)';
      if (!miniPatientForm.primary_doctor.trim()) errors.primary_doctor = 'กรุณาระบุแพทย์เจ้าของไข้';
      if (!lastAppointmentDate) errors.last_appointment_date = 'กรุณาระบุวันนัดหมายล่าสุด';
      if (miniPatientForm.citizen_id.trim() && !/^\d{13}$/.test(miniPatientForm.citizen_id.trim())) {
        errors.citizen_id = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
      }
    }

    if (!deliveryForm.delivery_date) errors.delivery_date = 'กรุณาระบุวันที่ส่งยา';
    if (deliveryForm.prescription_count < 1) errors.prescription_count = 'จำนวนใบสั่งยาต้องมากกว่า 0';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      let patientId = selectedPatient?.id;

      // If patient not found, create new patient first
      if (patientNotFound && !selectedPatient) {
        const { data: newPatient, error: patientErr } = await supabase
          .from('patients')
          .insert({
            hn: miniPatientForm.hn.trim(),
            title: miniPatientForm.title,
            first_name: miniPatientForm.first_name.trim(),
            last_name: miniPatientForm.last_name.trim(),
            citizen_id: miniPatientForm.citizen_id.trim() || null,
            passport_number: miniPatientForm.passport_number.trim() || null,
            gender: miniPatientForm.gender,
            date_of_birth: miniPatientForm.date_of_birth || null,
            phone_number: miniPatientForm.phone_number.trim() || '',
            address: miniPatientForm.address.trim() || '',
            emergency_contact_name: miniPatientForm.emergency_contact_name.trim() || '',
            emergency_contact_phone: miniPatientForm.emergency_contact_phone.trim() || '',
            medical_right: miniPatientForm.medical_right,
            primary_doctor: miniPatientForm.primary_doctor.trim(),
            allergy_note: miniPatientForm.allergy_note.trim() || null,
            chronic_disease_note: miniPatientForm.chronic_disease_note.trim() || null,
            status: miniPatientForm.status,
          })
          .select()
          .single();

        if (patientErr) throw patientErr;
        patientId = newPatient.id;
        setSuccess(`ลงทะเบียนคนไข้ใหม่ HN: ${miniPatientForm.hn} สำเร็จ`);
      }

      if (!patientId) {
        setError('ไม่พบข้อมูลคนไข้');
        return;
      }

      // Save or update the last appointment date
      if (lastAppointmentDate) {
        const docName = selectedPatient ? selectedPatient.primary_doctor : miniPatientForm.primary_doctor;
        const { data: existingApps, error: fetchErr } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false })
          .limit(1);

        if (!fetchErr && existingApps && existingApps.length > 0) {
          const latestApp = existingApps[0];
          await supabase
            .from('appointments')
            .update({
              appointment_date: lastAppointmentDate,
              doctor_name: docName || latestApp.doctor_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', latestApp.id);
        } else {
          await supabase
            .from('appointments')
            .insert({
              patient_id: patientId,
              appointment_date: lastAppointmentDate,
              appointment_time: '09:00:00',
              department: 'อายุรกรรม (Medicine)',
              doctor_name: docName || 'ไม่ระบุแพทย์',
              reason: 'บันทึกการส่งยา',
              status: 'completed'
            });
        }
      }

      // Create delivery record
      const { error: deliveryErr } = await supabase
        .from('medicine_deliveries')
        .insert({
          patient_id: patientId,
          delivery_type: deliveryForm.delivery_type,
          delivery_date: deliveryForm.delivery_date,
          prescription_count: deliveryForm.prescription_count,
          note: deliveryForm.note || null,
          print_date: deliveryForm.print_date || null,
          status: 'sent_to_pharmacy',
        });

      if (deliveryErr) throw deliveryErr;

      setSuccess((prev) => (prev ? prev + ' | ' : '') + 'บันทึกรายการส่งยาสำเร็จ');
      fetchDeliveries();
      if (onRefreshStats) onRefreshStats();
      goToList();
    } catch (err: any) {
      console.error('Error saving delivery:', err);
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setError('HN นี้ถูกใช้งานแล้ว กรุณาตรวจสอบใหม่');
      } else {
        setError('ไม่สามารถบันทึกข้อมูลได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: DeliveryStatus) => {
    try {
      setError(null);
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      // Auto-set print_date when delivered
      if (newStatus === 'delivered') {
        updatePayload.print_date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      }

      const { error: updateErr } = await supabase
        .from('medicine_deliveries')
        .update(updatePayload)
        .eq('id', id);

      if (updateErr) throw updateErr;
      setSuccess('อัปเดตสถานะสำเร็จ');
      setEditingStatusId(null);
      fetchDeliveries();
    } catch (err: any) {
      setError('ไม่สามารถอัปเดตสถานะได้: ' + err.message);
    }
  };

  const handleDeleteDelivery = (id: number) => {
    setDeleteDeliveryId(id);
  };

  const executeDeleteDelivery = async (id: number) => {
    try {
      setError(null);
      setSuccess(null);
      const { error: deleteErr } = await supabase
        .from('medicine_deliveries')
        .delete()
        .eq('id', id);
      if (deleteErr) throw deleteErr;
      setSuccess('ลบรายการส่งยาสำเร็จ');
      fetchDeliveries();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setError('ไม่สามารถลบรายการได้: ' + err.message);
    }
  };

  const goToCreate = () => {
    setViewMode('create');
    setSelectedPatient(null);
    setHnQuery('');
    setSearchResults([]);
    setPatientNotFound(false);
    setDeliveryForm(initialDeliveryForm);
    setMiniPatientForm(initialPatientForm);
    setSelectedDoctor(null);
    setDoctorQuery('');
    setFormErrors({});
    setError(null);
    setFullNameInput('');
    setShowExtraFields(false);
    setLastAppointmentDate('');
    setShowDeliveryTypeDropdown(false);
  };

  const goToList = () => {
    setViewMode('list');
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setDoctorQuery('');
    setError(null);
    setShowDeliveryTypeDropdown(false);
  };

  // Filtered and sorted deliveries (sorted by last appointment date descending)
  const filteredDeliveries = deliveries
    .filter((d) => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterDate && d.delivery_date !== filterDate) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = lastAppointments[a.patient_id] || '';
      const dateB = lastAppointments[b.patient_id] || '';

      if (dateA && dateB) {
        const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const isFutureA = dateA >= todayStr;
        const isFutureB = dateB >= todayStr;

        if (isFutureA && isFutureB) {
          // Both are today or in the future: sort ascending (nearest first)
          return dateA.localeCompare(dateB);
        }
        if (!isFutureA && !isFutureB) {
          // Both are in the past: sort descending (most recent first)
          return dateB.localeCompare(dateA);
        }
        // Future/today dates come before past dates
        return isFutureA ? -1 : 1;
      }
      // Place empty/no-date items at the end
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      // Fallback: sort by delivery date descending, then ID descending
      const delA = a.delivery_date || '';
      const delB = b.delivery_date || '';
      if (delA !== delB) {
        return delB.localeCompare(delA);
      }
      return b.id - a.id;
    });

  // Paginate filtered deliveries
  const totalItems = filteredDeliveries.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + pageSize);

  // Calculate running sequence based on delivery_date
  const getSequence = (index: number): number => {
    return index + 1;
  };

  const formatThaiDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadExcel = () => {
    if (filteredDeliveries.length === 0) return;

    const headers = [
      'ลำดับ',
      'HN',
      'ชื่อคนไข้',
      'วันนัดล่าสุด',
      'แพทย์เจ้าของไข้',
      'ประเภทการส่ง',
      'วันที่ส่ง',
      'หมายเหตุ',
      'จำนวนใบสั่งยา',
      'สถานะ',
      'วันที่พิมพ์'
    ];

    const rows = filteredDeliveries.map((d, idx) => {
      const patient = d.patients;
      const patientName = patient ? `${patient.title}${patient.first_name} ${patient.last_name}` : '—';
      const lastAppDate = lastAppointments[d.patient_id] ? formatThaiDate(lastAppointments[d.patient_id]) : '—';
      const primaryDoctor = patient?.primary_doctor || '—';
      const deliveryType = DELIVERY_TYPE_LABELS[d.delivery_type] || '—';
      const deliveryDate = formatThaiDate(d.delivery_date);
      const note = d.note || '—';
      const prescriptionCount = d.prescription_count;
      const status = DELIVERY_STATUS_LABELS[d.status] || '—';
      const printDate = formatThaiDate(d.print_date);

      return [
        idx + 1,
        patient?.hn || '—',
        patientName,
        lastAppDate,
        primaryDoctor,
        deliveryType,
        deliveryDate,
        note,
        prescriptionCount,
        status,
        printDate
      ];
    });

    // Create Excel worksheet using xlsx library
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Calculate column widths based on maximum characters (wch)
    const colWidths = headers.map((header, colIdx) => {
      const maxLen = Math.max(
        header.length,
        ...rows.map(row => {
          const val = row[colIdx];
          return val !== null && val !== undefined ? String(val).length : 0;
        })
      );
      // wch is visual width in characters. Adding 3 characters padding, min 10
      return { wch: Math.max(maxLen + 3, 10) };
    });

    worksheet['!cols'] = colWidths;

    // Create workbook and download file
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ประวัติส่งยา');
    
    const fileName = `medicine_delivery_${filterDate || 'all'}_${filterStatus || 'all'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // ========= CREATE VIEW =========
  const renderCreate = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <button
        className="btn btn-secondary"
        style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
        onClick={goToList}
      >
        ← กลับไปหน้าประวัติส่งยา
      </button>

      <div className="dashboard-card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          เพิ่มรายการส่งยา
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Patient Search */}
          <div style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-color)',
            marginBottom: '1.5rem',
            background: 'var(--primary-subtle)',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 1: ค้นหาคนไข้ (กรอก HN หรือชื่อ)
            </h4>

            {selectedPatient ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-solid)', border: '1.5px solid var(--primary-glow)',
                }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>HN: {selectedPatient.hn}</strong>
                    <span style={{ marginLeft: '0.75rem' }}>
                      {selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                    <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      แพทย์: {selectedPatient.primary_doctor || '—'}
                    </span>
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => { setSelectedPatient(null); setHnQuery(''); setPatientNotFound(false); }}
                  >
                    เปลี่ยนคนไข้
                  </button>
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: '300px' }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>วันนัดหมายล่าสุด (พ.ศ.)</label>
                  <BuddhistDateInput
                    value={lastAppointmentDate}
                    onChange={(d) => setLastAppointmentDate(d)}
                    placeholder="แก้ไขวันนัดหมายล่าสุด (ถ้ามี)"
                  />
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="พิมพ์ HN หรือชื่อคนไข้เพื่อค้นหา..."
                    value={hnQuery}
                    onChange={(e) => handleSearchHn(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  />
                  {searchingHn && <span className="spinner" style={{ display: 'inline-block', width: 20, height: 20 }}></span>}
                </div>

                {/* Search results dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ zIndex: 50 }}>
                    {searchResults.map((p) => (
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

            {/* Patient Not Found — Registration Form */}
            {patientNotFound && !selectedPatient && (
              <div style={{
                marginTop: '1rem', padding: '1.25rem',
                borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--accent)',
                background: 'rgba(139, 92, 246, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>
                    ไม่พบคนไข้ในระบบ — กรอกข้อมูลเพื่อลงทะเบียนคนไข้ใหม่
                  </span>
                </div>

                {/* Row 1: HN + Full name (required) */}
                <div className="opd-form-grid" style={{ gridTemplateColumns: '160px 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">HN *</label>
                    <input type="text" className="form-input" value={miniPatientForm.hn}
                      onChange={(e) => setMiniPatientForm({ ...miniPatientForm, hn: e.target.value })}
                      style={{ fontWeight: 700 }}
                    />
                    {formErrors.hn && <span className="form-error">{formErrors.hn}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">ชื่อ-นามสกุล * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(พิมพ์ชื่อเต็มพร้อมคำนำหน้า เช่น นายกอไก่ ขอไข่)</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น นายกอไก่ ขอไข่ หรือ นางสาวสมใจ ดีใจ..."
                      value={fullNameInput}
                      onChange={(e) => handleFullNameChange(e.target.value)}
                    />
                    {formErrors.first_name && <span className="form-error">{formErrors.first_name}</span>}
                  </div>
                </div>

                {/* Row 2: Doctor + Last appointment (required) */}
                <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">แพทย์เจ้าของไข้ *</label>
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
                          onChange={(e) => { setDoctorQuery(e.target.value); setShowDoctorDropdown(true); setActiveDoctorIndex(-1); }}
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
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.specialty} • {doc.license_no}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {formErrors.primary_doctor && <span className="form-error">{formErrors.primary_doctor}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันนัดหมายล่าสุด *</label>
                    <BuddhistDateInput
                      value={lastAppointmentDate}
                      onChange={(d) => setLastAppointmentDate(d)}
                      placeholder="เลือกวันนัดหมายล่าสุด (พ.ศ.)"
                    />
                    {formErrors.last_appointment_date && <span className="form-error">{formErrors.last_appointment_date}</span>}
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
                <button
                  type="button"
                  onClick={() => setShowExtraFields(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600,
                    padding: '0.25rem 0', marginBottom: showExtraFields ? '0.75rem' : 0,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: showExtraFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  {showExtraFields ? 'ซ่อนข้อมูลเพิ่มเติม' : 'กรอกข้อมูลเพิ่มเติม (ไม่บังคับ)'}
                </button>

                {showExtraFields && (
                  <div>
                    {/* Manual override: title / first_name / last_name / gender */}
                    <div className="opd-form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 120px' }}>
                      <div className="form-group">
                        <label className="form-label">คำนำหน้า</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="เช่น นาย, นาง, พญ."
                          value={miniPatientForm.title}
                          onChange={(e) => {
                            const t = e.target.value;
                            setMiniPatientForm(prev => ({ ...prev, title: t, gender: genderFromTitle(t) }));
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">ชื่อจริง</label>
                        <input type="text" className="form-input" value={miniPatientForm.first_name}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, first_name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">นามสกุล</label>
                        <input type="text" className="form-input" value={miniPatientForm.last_name}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, last_name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">เพศ</label>
                        <select className="form-select" value={miniPatientForm.gender}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, gender: e.target.value })}
                        >
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">เลขบัตรประชาชน</label>
                        <input type="text" className="form-input" maxLength={13} placeholder="ตัวเลข 13 หลัก"
                          value={miniPatientForm.citizen_id}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, citizen_id: e.target.value.replace(/\D/g, '') })}
                        />
                        {formErrors.citizen_id && <span className="form-error">{formErrors.citizen_id}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">เลขหนังสือเดินทาง</label>
                        <input type="text" className="form-input" placeholder="สำหรับคนต่างชาติ"
                          value={miniPatientForm.passport_number}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, passport_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">วันเดือนปีเกิด</label>
                        <BuddhistDateInput
                          value={miniPatientForm.date_of_birth}
                          max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                          onChange={(d) => setMiniPatientForm({ ...miniPatientForm, date_of_birth: d })}
                          placeholder="เลือกวันเกิด (พ.ศ.)"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">เบอร์โทรศัพท์</label>
                        <input type="tel" className="form-input" value={miniPatientForm.phone_number}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, phone_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">สิทธิการรักษา</label>
                        <select className="form-select" value={miniPatientForm.medical_right}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, medical_right: e.target.value })}
                        >
                          {MEDICAL_RIGHTS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">สถานะคนไข้</label>
                        <select className="form-select" value={miniPatientForm.status}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, status: e.target.value as 'active' | 'inactive' })}
                        >
                          <option value="active">ใช้งานปกติ (Active)</option>
                          <option value="inactive">ระงับการใช้งาน (Inactive)</option>
                        </select>
                      </div>
                    </div>

                    <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">ชื่อผู้ติดต่อฉุกเฉิน</label>
                        <input type="text" className="form-input" value={miniPatientForm.emergency_contact_name}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, emergency_contact_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">เบอร์ผู้ติดต่อฉุกเฉิน</label>
                        <input type="tel" className="form-input" value={miniPatientForm.emergency_contact_phone}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, emergency_contact_phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">ที่อยู่ปัจจุบัน</label>
                      <textarea className="form-textarea" rows={2} placeholder="ระบุที่อยู่ปัจจุบัน..."
                        value={miniPatientForm.address}
                        onChange={(e) => setMiniPatientForm({ ...miniPatientForm, address: e.target.value })}
                      />
                    </div>

                    <div className="opd-form-grid">
                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--danger-foreground)' }}>ข้อมูลการแพ้ยา</label>
                        <textarea className="form-textarea" rows={2} placeholder="ระบุยาที่แพ้และอาการ..."
                          value={miniPatientForm.allergy_note}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, allergy_note: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">โรคประจำตัว</label>
                        <textarea className="form-textarea" rows={2} placeholder="ระบุโรคประจำตัว..."
                          value={miniPatientForm.chronic_disease_note}
                          onChange={(e) => setMiniPatientForm({ ...miniPatientForm, chronic_disease_note: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Delivery Details */}
          <div style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-color)',
            marginBottom: '1.5rem',
          }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              ขั้นตอนที่ 2: ข้อมูลการส่งยา
            </h4>

            <div className="opd-form-grid">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">ประเภทการส่ง *</label>
                <div className="autocomplete-wrapper">
                  <button
                    type="button"
                    className="form-select"
                    onClick={() => setShowDeliveryTypeDropdown(!showDeliveryTypeDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    <span>{DELIVERY_TYPE_LABELS[deliveryForm.delivery_type] || 'เลือกประเภทการส่ง'}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: showDeliveryTypeDropdown ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {showDeliveryTypeDropdown && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                        onClick={() => setShowDeliveryTypeDropdown(false)}
                      />
                      <div
                        className="autocomplete-dropdown"
                        style={{
                          zIndex: 100,
                          maxHeight: '300px',
                          overflowY: 'auto',
                          padding: '0.25rem',
                        }}
                      >
                        {Object.entries(DELIVERY_TYPE_LABELS).map(([key, label]) => {
                          const isSelected = deliveryForm.delivery_type === key;
                          return (
                            <div
                              key={key}
                              className={`autocomplete-item ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setDeliveryForm({ ...deliveryForm, delivery_type: key as DeliveryType });
                                setShowDeliveryTypeDropdown(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.625rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span style={{ fontWeight: isSelected ? 600 : 400 }}>{label}</span>
                              {isSelected && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="var(--primary)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">วันที่ส่ง *</label>
                <BuddhistDateInput
                  value={deliveryForm.delivery_date}
                  onChange={(d) => setDeliveryForm({ ...deliveryForm, delivery_date: d })}
                  placeholder="เลือกวันที่ส่ง (พ.ศ.)"
                />
                {formErrors.delivery_date && <span className="form-error">{formErrors.delivery_date}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">จำนวนใบสั่งยา *</label>
                <input type="number" className="form-input" min={1} value={deliveryForm.prescription_count}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, prescription_count: parseInt(e.target.value) || 1 })}
                  style={{ textAlign: 'center', fontWeight: 700 }}
                />
                {formErrors.prescription_count && <span className="form-error">{formErrors.prescription_count}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">วันที่พิมพ์</label>
                <BuddhistDateInput
                  value={deliveryForm.print_date}
                  onChange={(d) => setDeliveryForm({ ...deliveryForm, print_date: d })}
                  placeholder="เลือกวันที่พิมพ์ (ถ้ามี)"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.25rem' }}>
              <label className="form-label">หมายเหตุ</label>
              <textarea className="form-textarea" rows={2} placeholder="บันทึกหมายเหตุเพิ่มเติม..."
                value={deliveryForm.note}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, note: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={goToList}>ยกเลิก</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: 'auto' }}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการส่งยา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ========= LIST VIEW =========
  const renderList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ประวัติส่งยา (Medicine Delivery)</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadExcel}
            disabled={filteredDeliveries.length === 0}
            style={{
              width: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ดาวน์โหลด Excel
          </button>
          <button className="btn btn-primary" onClick={goToCreate} style={{ width: 'auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มรายการส่งยา
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>ตัวกรอง</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>วันที่ส่ง</label>
            <BuddhistDateInput
              value={filterDate}
              onChange={(d) => setFilterDate(d)}
              placeholder="เลือกวันที่ (พ.ศ.)"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>สถานะ</label>
            <select className="form-select" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        {(filterDate || filterStatus) && (
          <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem' }}
              onClick={() => { setFilterDate(''); setFilterStatus(''); }}
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="opd-table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ display: 'inline-block' }}></span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลประวัติส่งยา...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.4 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p style={{ fontWeight: 600 }}>ไม่พบข้อมูลประวัติส่งยา</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>กรุณากดปุ่ม "เพิ่มรายการส่งยา" เพื่อเริ่มบันทึก</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="opd-table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ width: '55px' }}>ลำดับ</th>
                  <th>HN</th>
                  <th>ชื่อคนไข้</th>
                  <th>วันนัดล่าสุด</th>
                  <th>แพทย์เจ้าของไข้</th>
                  <th>ประเภทการส่ง</th>
                  <th>วันที่ส่ง</th>
                  <th>หมายเหตุ</th>
                  <th style={{ textAlign: 'center' }}>จำนวนใบสั่งยา</th>
                  <th>สถานะ</th>
                  <th>วันที่พิมพ์</th>
                  <th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDeliveries.map((d, idx) => {
                  const patient = d.patients;
                  const statusClass =
                    d.status === 'delivered' ? 'badge-status-completed' :
                    d.status === 'cancelled' ? 'badge-status-cancelled' :
                    d.status === 'shipping' ? 'badge-status-active' :
                    'badge-status-waiting';

                  return (
                    <tr key={d.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{getSequence(startIndex + idx)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{patient?.hn || '—'}</td>
                      <td>{patient ? `${patient.title}${patient.first_name} ${patient.last_name}` : '—'}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatThaiDate(lastAppointments[d.patient_id])}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{patient?.primary_doctor || '—'}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: d.delivery_type === 'post' ? 'rgba(59,130,246,0.1)' :
                                     d.delivery_type === 'rider' ? 'rgba(16,185,129,0.1)' :
                                     d.delivery_type === 'pickup' ? 'rgba(245,158,11,0.1)' : 'var(--primary-subtle)',
                          color: d.delivery_type === 'post' ? '#2563eb' :
                                 d.delivery_type === 'rider' ? '#059669' :
                                 d.delivery_type === 'pickup' ? '#d97706' : 'var(--text-secondary)',
                        }}>
                          {DELIVERY_TYPE_LABELS[d.delivery_type]}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatThaiDate(d.delivery_date)}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.note || '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.prescription_count}</td>
                      <td>
                        {editingStatusId === d.id ? (
                          <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minWidth: '120px' }}
                            value={d.status}
                            onChange={(e) => handleUpdateStatus(d.id, e.target.value as DeliveryStatus)}
                            onBlur={() => setEditingStatusId(null)}
                            autoFocus
                          >
                            {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${statusClass}`} style={{ cursor: 'pointer' }}
                            onClick={() => setEditingStatusId(d.id)}
                            title="คลิกเพื่อเปลี่ยนสถานะ"
                          >
                            {DELIVERY_STATUS_LABELS[d.status]}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{formatThaiDate(d.print_date)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-secondary"
                            style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.7rem' }}
                            onClick={() => setEditingStatusId(d.id === editingStatusId ? null : d.id)}
                          >
                            เปลี่ยนสถานะ
                          </button>
                          {canDelete && (
                            <button
                              className="btn btn-danger"
                              style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.7rem' }}
                              onClick={() => handleDeleteDelivery(d.id)}
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredDeliveries.length > 0 && (
        <div className="tail-pagination">
          <div className="tail-pagination-left">
            <div className="tail-pagination-info">
              แสดง {startIndex + 1} ถึง {Math.min(startIndex + pageSize, totalItems)} จากทั้งหมด {totalItems} รายการ
            </div>
            <div className="tail-pagination-select-wrapper">
              <span>แสดงหน้าละ:</span>
              <select
                className="tail-pagination-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="tail-pagination-actions">
            <button
              type="button"
              className="tail-pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              title="หน้าแรก"
            >
              &laquo;
            </button>
            <button
              type="button"
              className="tail-pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              title="ก่อนหน้า"
            >
              &lsaquo;
            </button>

            {/* Display page buttons dynamically */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                // Show first page, last page, current page, and pages around current page
                return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1;
              })
              .map((p, idx, arr) => {
                const elements = [];
                // Add ellipsis if there's a gap between page numbers
                if (idx > 0 && p - arr[idx - 1] > 1) {
                  elements.push(
                    <span key={`ellipsis-${p}`} style={{ padding: '0 0.5rem', color: 'var(--text-muted)' }}>
                      ...
                    </span>
                  );
                }
                elements.push(
                  <button
                    type="button"
                    key={p}
                    className={`tail-pagination-btn ${safeCurrentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                );
                return elements;
              })}

            <button
              type="button"
              className="tail-pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              title="ถัดไป"
            >
              &rsaquo;
            </button>
            <button
              type="button"
              className="tail-pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              title="หน้าสุดท้าย"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ========= MAIN RENDER =========
  return (
    <div>
      {success && (
        <div className="alert alert-success" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {viewMode === 'create' && renderCreate()}
      {viewMode === 'list' && renderList()}

      <ConfirmModal
        isOpen={deleteDeliveryId !== null}
        onClose={() => setDeleteDeliveryId(null)}
        onConfirm={() => {
          if (deleteDeliveryId !== null) {
            executeDeleteDelivery(deleteDeliveryId);
          }
        }}
        title="ยืนยันการลบประวัติส่งยา"
        message="คุณต้องการลบรายการส่งยานี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถกู้คืนได้"
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
      />
    </div>
  );
};

export default MedicineDeliveryPage;
