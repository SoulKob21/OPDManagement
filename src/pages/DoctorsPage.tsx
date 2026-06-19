import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Doctor } from '../types/opd';
import { DEPARTMENTS } from '../types/opd';

type ViewMode = 'list' | 'create' | 'edit';

interface DoctorFormState {
  id: string;
  name: string;
  specialty: string;
  license_no: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}

const SPECIALTIES = DEPARTMENTS.map(d => d.split(' (')[0]);

const initialFormState: DoctorFormState = {
  id: '',
  name: '',
  specialty: SPECIALTIES[0],
  license_no: '',
  phone: '',
  email: '',
  status: 'active',
};

export const DoctorsPage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState<DoctorFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DoctorFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('doctors')
        .select('*')
        .order('id', { ascending: true });

      if (fetchErr) throw fetchErr;
      setDoctors(data || []);
    } catch (err: any) {
      console.error('Error fetching doctors:', err);
      setError('ไม่สามารถโหลดข้อมูลแพทย์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const filteredDoctors = doctors.filter(doc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(doc.id).includes(q) ||
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.license_no.toLowerCase().includes(q) ||
      (doc.phone || '').includes(q)
    );
  });

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof DoctorFormState, string>> = {};

    if (!formData.id.trim()) {
      errors.id = 'กรุณาระบุรหัสแพทย์ (ID)';
    } else if (!/^\d+$/.test(formData.id.trim())) {
      errors.id = 'ID ต้องเป็นตัวเลขเท่านั้น';
    }
    if (!formData.name.trim()) errors.name = 'กรุณาระบุชื่อแพทย์';
    if (!formData.license_no.trim()) errors.license_no = 'กรุณาระบุเลขใบอนุญาตประกอบวิชาชีพ';

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

      const payload = {
        id: parseInt(formData.id.trim(), 10),
        name: formData.name.trim(),
        specialty: formData.specialty,
        license_no: formData.license_no.trim(),
        phone: formData.phone || null,
        email: formData.email || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      if (viewMode === 'edit' && editingDoctor) {
        const { error: updateErr } = await supabase
          .from('doctors')
          .update(payload)
          .eq('id', editingDoctor.id);

        if (updateErr) throw updateErr;
        setSuccess(`บันทึกข้อมูล ${formData.name} สำเร็จ`);
      } else {
        const { error: insertErr } = await supabase
          .from('doctors')
          .insert(payload);

        if (insertErr) throw insertErr;
        setSuccess(`เพิ่มแพทย์ ${formData.name} สำเร็จ`);
      }

      fetchDoctors();
      if (onRefreshStats) onRefreshStats();
      setViewMode('list');
      setEditingDoctor(null);
    } catch (err: any) {
      console.error('Error saving doctor:', err);
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setError('ID หรือเลขใบอนุญาตนี้ถูกใช้งานแล้ว กรุณาตรวจสอบใหม่');
      } else {
        setError('ไม่สามารถบันทึกข้อมูลแพทย์ได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc: Doctor) => {
    if (!window.confirm(`ยืนยันการลบข้อมูลแพทย์ "${doc.name}" (${doc.license_no}) ใช่หรือไม่?\n\nการดำเนินการนี้ไม่สามารถกู้คืนได้`)) return;

    try {
      setError(null);
      setSuccess(null);
      const { error: deleteErr } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doc.id);

      if (deleteErr) throw deleteErr;
      setSuccess(`ลบข้อมูลแพทย์ "${doc.name}" สำเร็จ`);
      fetchDoctors();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error deleting doctor:', err);
      setError('ไม่สามารถลบข้อมูลแพทย์ได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
    }
  };

  const goToCreate = () => {
    setFormData(initialFormState);
    setFormErrors({});
    setEditingDoctor(null);
    setSuccess(null);
    setError(null);
    setViewMode('create');
  };

  const goToEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFormData({
      id: String(doc.id),
      name: doc.name,
      specialty: doc.specialty,
      license_no: doc.license_no,
      phone: doc.phone || '',
      email: doc.email || '',
      status: doc.status,
    });
    setFormErrors({});
    setSuccess(null);
    setError(null);
    setViewMode('edit');
  };

  const goToList = () => {
    setViewMode('list');
    setEditingDoctor(null);
    setSuccess(null);
    setError(null);
  };

  // ========= FORM VIEW (Create / Edit) =========
  const renderForm = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <button
        className="btn btn-secondary"
        style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
        onClick={goToList}
      >
        ← กลับไปหน้ารายชื่อแพทย์
      </button>

      <div className="dashboard-card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {viewMode === 'edit' ? `แก้ไขข้อมูลแพทย์ — ${editingDoctor?.name}` : 'เพิ่มแพทย์ใหม่'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Core info */}
          <div className="opd-form-grid" style={{ gridTemplateColumns: '100px 1fr 1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น 1"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.replace(/\D/g, '') })}
                disabled={viewMode === 'edit'}
                style={{ fontWeight: 700, textAlign: 'center' }}
              />
              {formErrors.id && <span className="form-error">{formErrors.id}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">ชื่อแพทย์ (พร้อมคำนำหน้า) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น นพ.สมศักดิ์ รักษาดี"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">เลขใบอนุญาต (ว.) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น ว.12345"
                value={formData.license_no}
                onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                disabled={viewMode === 'edit'}
              />
              {formErrors.license_no && <span className="form-error">{formErrors.license_no}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">สาขาเฉพาะทาง *</label>
              <select
                className="form-select"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              >
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>ข้อมูลติดต่อ</h4>

          <div className="opd-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label className="form-label">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                className="form-input"
                placeholder="เบอร์โทรแพทย์"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">อีเมล</label>
              <input
                type="email"
                className="form-input"
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">สถานะ</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">ปฏิบัติงานอยู่ (Active)</option>
                <option value="inactive">หยุดปฏิบัติงาน (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={goToList}>ยกเลิก</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: 'auto' }}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>จัดการแพทย์ (Doctors Management)</h2>
        <button className="btn btn-primary" onClick={goToCreate} style={{ width: 'auto' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          เพิ่มแพทย์ใหม่
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="ค้นหาด้วย ID, ชื่อ, สาขา, เลขใบอนุญาต หรือเบอร์โทร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setSearchQuery('')}>
            ล้างตัวกรอง
          </button>
        )}
      </form>

      {/* Doctor Table */}
      <div className="opd-table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ display: 'inline-block' }}></span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลแพทย์...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.4 }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <p style={{ fontWeight: 600 }}>ไม่พบข้อมูลแพทย์</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>กรุณากดปุ่ม "เพิ่มแพทย์ใหม่" เพื่อลงทะเบียนแพทย์ในระบบ</p>
          </div>
        ) : (
          <table className="opd-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>ชื่อแพทย์</th>
                <th>สาขาเฉพาะทาง</th>
                <th>เลขใบอนุญาต (ว.)</th>
                <th>เบอร์โทรศัพท์</th>
                <th>อีเมล</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      color: 'white', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {doc.id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{doc.name}</td>
                  <td>{doc.specialty}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', background: 'var(--primary-subtle)', padding: '2px 8px', borderRadius: '4px' }}>
                      {doc.license_no}
                    </span>
                  </td>
                  <td>{doc.phone || '—'}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{doc.email || '—'}</td>
                  <td>
                    <span className={`badge ${doc.status === 'active' ? 'badge-status-active' : 'badge-status-inactive'}`}>
                      {doc.status === 'active' ? 'ปฏิบัติงาน' : 'หยุดปฏิบัติงาน'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => goToEdit(doc)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(doc)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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

      {(viewMode === 'create' || viewMode === 'edit') && renderForm()}
      {viewMode === 'list' && renderList()}
    </div>
  );
};

export default DoctorsPage;
