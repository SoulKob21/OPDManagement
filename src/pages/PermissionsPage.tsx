import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

type ViewMode = 'list' | 'create' | 'edit';

interface UserPermission {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string | null;
  allowed_menus: string[];
  created_at: string;
  updated_at: string;
}

const MENU_OPTIONS = [
  { id: 'overview', name: 'ภาพรวมระบบ', desc: 'หน้าหลักแสดงสถิติและข้อมูลทั่วไปของโรงพยาบาล' },
  { id: 'patients', name: 'ลงทะเบียนผู้ป่วย', desc: 'ค้นหา เพิ่ม แก้ไขข้อมูลระเบียนประวัติผู้ป่วย (HN)' },
  { id: 'appointments', name: 'นัดหมายผู้ป่วย', desc: 'บันทึกวัน-เวลา และสาขาที่นัดหมายแพทย์ล่วงหน้า' },
  { id: 'queues', name: 'จัดการคิว OPD', desc: 'รันลำดับคิวประจำวัน คัดกรองอาการ ส่งต่อรักษา และจ่ายยา' },
  { id: 'deliveries', name: 'ประวัติส่งยา', desc: 'จัดการประวัติการส่งยาและดาวน์โหลดไฟล์ส่งข้อมูลทางไปรษณีย์' },
  { id: 'diabetes-screening', name: 'คัดกรองเบาหวาน', desc: 'แบบประเมินและคัดกรองความเสี่ยงเบาหวานรายปี' },
  { id: 'questionnaire', name: 'ทำแบบสอบถาม', desc: 'หน้ากรอกแบบประเมินและแบบสอบถามสุขภาพคนไข้' },
  { id: 'doctors', name: 'จัดการแพทย์', desc: 'ฐานข้อมูลรายชื่อและตารางปฏิบัติงานของแพทย์' },
  { id: 'permissions', name: 'จัดการสิทธิ์การใช้งาน', desc: 'กำหนดสิทธิ์การมองเห็นเมนูต่าง ๆ ตาม User ID' }
];

export const PermissionsPage: React.FC = () => {
  const { user, fetchUserPermissions } = useAuth();
  
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbWarning, setDbWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<UserPermission | null>(null);

  // Form states
  const [userIdInput, setUserIdInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [userIdError, setUserIdError] = useState<string | null>(null);

  // Delete modal state
  const [deleteRecord, setDeleteRecord] = useState<UserPermission | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchErr } = await supabase
        .from('user_permissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        if (fetchErr.message.includes('public.user_permissions') || fetchErr.message.includes('schema cache')) {
          setDbWarning(true);
        }
        throw fetchErr;
      }

      setPermissions(data || []);
      setDbWarning(false);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      if (!dbWarning) {
        setError('ไม่สามารถโหลดข้อมูลสิทธิ์ผู้ใช้งานได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const filteredPermissions = permissions.filter(perm => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      perm.user_id.toLowerCase().includes(q) ||
      (perm.display_name || '').toLowerCase().includes(q) ||
      (perm.role || '').toLowerCase().includes(q)
    );
  });

  const handleSelectAll = () => {
    setSelectedMenus(MENU_OPTIONS.map(opt => opt.id));
  };

  const handleClearAll = () => {
    setSelectedMenus([]);
  };

  const handleToggleMenu = (menuId: string) => {
    if (selectedMenus.includes(menuId)) {
      setSelectedMenus(selectedMenus.filter(id => id !== menuId));
    } else {
      setSelectedMenus([...selectedMenus, menuId]);
    }
  };

  const validateForm = (): boolean => {
    setUserIdError(null);
    if (!userIdInput.trim()) {
      setUserIdError('กรุณาระบุ User ID หรือ Email');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const targetUserId = userIdInput.trim();

    // Safeguard: Check if user is editing their own permissions
    const isSelf = user && (targetUserId === user.id || targetUserId === user.email);
    if (isSelf && !selectedMenus.includes('permissions')) {
      setError('คุณไม่สามารถยกเลิกสิทธิ์ "จัดการสิทธิ์การใช้งาน" ของบัญชีตัวเองได้ เพื่อป้องกันไม่ให้ถูกล็อกออกจากหน้าจอนี้');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = {
        user_id: targetUserId,
        display_name: displayNameInput.trim() || null,
        role: roleInput.trim() || null,
        allowed_menus: selectedMenus,
        updated_at: new Date().toISOString()
      };

      if (viewMode === 'edit' && editingRecord) {
        const { error: updateErr } = await supabase
          .from('user_permissions')
          .update(payload)
          .eq('id', editingRecord.id);

        if (updateErr) throw updateErr;
        setSuccess(`บันทึกข้อมูลสิทธิ์ของ ${targetUserId} สำเร็จ`);
      } else {
        // Check duplication first
        const { data: existing } = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', targetUserId);

        if (existing && existing.length > 0) {
          setUserIdError('User ID หรือ Email นี้ได้รับการกำหนดสิทธิ์ไว้แล้ว กรุณาใช้การแก้ไขข้อมูลแทน');
          setSubmitting(false);
          return;
        }

        const { error: insertErr } = await supabase
          .from('user_permissions')
          .insert([payload]);

        if (insertErr) throw insertErr;
        setSuccess(`เพิ่มข้อมูลสิทธิ์ของ ${targetUserId} สำเร็จ`);
      }

      // If updating current user's permission, refresh the local state immediately
      if (user && (targetUserId === user.id || targetUserId === user.email)) {
        await fetchUserPermissions(user.id, user.email);
      }

      fetchPermissions();
      setViewMode('list');
      setEditingRecord(null);
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      setError('ไม่สามารถบันทึกข้อมูลสิทธิ์ได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (perm: UserPermission) => {
    // Prevent delete self entirely if it blocks their own permissions
    if (user && (perm.user_id === user.id || perm.user_id === user.email)) {
      setError('คุณไม่สามารถลบข้อมูลสิทธิ์ของบัญชีตัวเองได้โดยตรง (คุณสามารถแก้ไขเมนูที่เกี่ยวข้องได้แทน)');
      return;
    }
    setDeleteRecord(perm);
  };

  const executeDelete = async (perm: UserPermission) => {
    try {
      setError(null);
      setSuccess(null);
      
      const { error: deleteErr } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', perm.id);

      if (deleteErr) throw deleteErr;
      
      setSuccess(`ลบข้อมูลสิทธิ์ของ "${perm.user_id}" สำเร็จ`);
      fetchPermissions();
    } catch (err: any) {
      console.error('Error deleting permissions:', err);
      setError('ไม่สามารถลบข้อมูลสิทธิ์ได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
    }
  };

  const goToCreate = () => {
    setUserIdInput('');
    setDisplayNameInput('');
    setRoleInput('');
    setSelectedMenus(['overview']); // Start with overview allowed
    setUserIdError(null);
    setEditingRecord(null);
    setSuccess(null);
    setError(null);
    setViewMode('create');
  };

  const goToEdit = (perm: UserPermission) => {
    setEditingRecord(perm);
    setUserIdInput(perm.user_id);
    setDisplayNameInput(perm.display_name || '');
    setRoleInput(perm.role || '');
    setSelectedMenus(perm.allowed_menus);
    setUserIdError(null);
    setSuccess(null);
    setError(null);
    setViewMode('edit');
  };

  const goToList = () => {
    setViewMode('list');
    setEditingRecord(null);
    setSuccess(null);
    setError(null);
  };

  if (dbWarning) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div className="alert alert-danger" style={{ display: 'inline-flex', marginBottom: '1.5rem', textAlign: 'left' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 8 }} aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>ฐานข้อมูลสำหรับระบบสิทธิ์ยังไม่พร้อมใช้งาน!</strong> <br />
            กรุณาคัดลอกโค้ด SQL ส่วนเพิ่มจากไฟล์ <a href="file:///f:/Github/OPDManagement/supabase/opd-schema.sql" style={{ color: 'inherit', fontWeight: 'bold', textDecoration: 'underline' }}>supabase/opd-schema.sql</a> ไปรันในหน้า <strong>SQL Editor</strong> ของ Supabase เพื่อสร้างตาราง `user_permissions` และ RLS นโยบายของสิทธิ์การใช้งาน
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>เมื่อรัน SQL สคริปต์เสร็จเรียบร้อยแล้ว กรุณากดปุ่มรีเฟรชด้านล่างเพื่ออัปเดตระบบสิทธิ์</p>
        <button className="btn btn-primary" onClick={fetchPermissions} style={{ width: 'auto', marginTop: '1rem' }}>
          รีเฟรชระบบตรวจจับ
        </button>
      </div>
    );
  }

  return (
    <div>
      {success && (
        <div className="alert alert-success" role="alert" style={{ animation: 'fadeIn 0.2s' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger" role="alert" style={{ animation: 'fadeIn 0.2s' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {viewMode === 'list' ? (
        <div style={{ animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>กำหนดสิทธิ์ผู้ใช้งาน (User Menu Permissions)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                กำหนดการเข้าถึงหน้าจอและปุ่มเมนูบนระบบตาม User ID หรือ Email ของผู้ใช้ พร้อมตั้งชื่อและตำแหน่งงาน
              </p>
            </div>
            <button className="btn btn-primary" onClick={goToCreate} style={{ width: 'auto' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              เพิ่มการกำหนดสิทธิ์
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="search-bar">
            <div className="search-input-wrapper">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="ค้นหาด้วย User ID, Email, ชื่อ หรือตำแหน่ง..."
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

          {/* Table */}
          <div className="opd-table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <span className="spinner" style={{ display: 'inline-block' }}></span>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลสิทธิ์...</p>
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.4 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p style={{ fontWeight: 600 }}>ไม่พบรายชื่อผู้ใช้ที่ระบุสิทธิ์เฉพาะ</p>
                <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  ผู้ใช้อื่น ๆ ที่ไม่มีระเบียนในตารางนี้ จะถือว่ามีสิทธิ์เข้าถึงทุกเมนูเป็นค่าเริ่มต้น
                </p>
              </div>
            ) : (
              <table className="opd-table">
                <thead>
                  <tr>
                    <th>ชื่อและตำแหน่ง</th>
                    <th>User ID / Email</th>
                    <th>เมนูที่ได้รับอนุญาต</th>
                    <th style={{ width: '180px', textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map(perm => {
                    const isSelf = user && (perm.user_id === user.id || perm.user_id === user.email);
                    return (
                      <tr key={perm.id} style={isSelf ? { backgroundColor: 'var(--primary-subtle)', borderLeft: '3px solid var(--primary)' } : {}}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{perm.display_name || '—'}</span>
                            {perm.role && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ตำแหน่ง: {perm.role}</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{perm.user_id}</span>
                            {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>บัญชีของคุณ (กำลังใช้งาน)</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {perm.allowed_menus.map(menuId => {
                              const menuOpt = MENU_OPTIONS.find(o => o.id === menuId);
                              return (
                                <span key={menuId} className="badge badge-status-active" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                  {menuOpt ? menuOpt.name : menuId}
                                </span>
                              );
                            })}
                            {perm.allowed_menus.length === 0 && (
                              <span className="badge badge-status-inactive" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                ไม่มีสิทธิ์เมนูเลย
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => goToEdit(perm)}
                            >
                              แก้ไขสิทธิ์
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => handleDelete(perm)}
                              disabled={isSelf ?? false}
                              title={isSelf ? 'ไม่สามารถลบสิทธิ์บัญชีตัวเองได้' : ''}
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        // CREATE OR EDIT FORM VIEW
        <div style={{ animation: 'fadeIn 0.2s' }}>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
            onClick={goToList}
          >
            ← กลับไปหน้าจัดการสิทธิ์
          </button>

          <div className="dashboard-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {viewMode === 'edit' ? `แก้ไขข้อมูลสิทธิ์การใช้งาน — ${editingRecord?.user_id}` : 'เพิ่มการกำหนดสิทธิ์ใหม่'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
              ระบุข้อมูลผู้ใช้และเลือกเมนูใช้งานระบบให้สอดคล้องกับขอบเขตหน้าที่
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ maxWidth: '600px', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>User ID หรือ Email ของผู้ใช้ *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น f3b3e21c-a991-419b... หรือ staff@hospital.com"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  disabled={viewMode === 'edit'}
                  style={viewMode === 'edit' ? { backgroundColor: 'var(--primary-subtle)', cursor: 'not-allowed' } : {}}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  ระบุ UUID จาก Supabase Auth หรือระบุ Email ของผู้ใช้ หรือระบุ 'dev-user' หากต้องการทดสอบในโหมด Dev
                </span>
                {userIdError && <span className="form-error">{userIdError}</span>}
              </div>

              {/* Row for Name & Role */}
              <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', maxWidth: '800px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>ชื่อผู้ใช้งาน (Name)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น นายสมชาย ปฏิบัติงาน"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    ระบุชื่อจริงหรือชื่อเล่นสำหรับให้แสดงผล
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>ตำแหน่ง / ฝ่าย (Position)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น พยาบาลคัดกรอง, เภสัชกร, เจ้าหน้าที่เวชระเบียน"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    ระบุตำแหน่งงานเพื่อประโยชน์ในการค้นหาและแบ่งแยกหน้างาน
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>กำหนดเมนูการเข้าถึง</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: '0.7rem' }} onClick={handleSelectAll}>เลือกทั้งหมด</button>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: '0.7rem' }} onClick={handleClearAll}>ล้างทั้งหมด</button>
                </div>
              </div>

              {/* Menu Grid Checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {MENU_OPTIONS.map(menu => {
                  const isChecked = selectedMenus.includes(menu.id);
                  const isSelf = user && (userIdInput.trim() === user.id || userIdInput.trim() === user.email);
                  const isSelfAndPermissions = isSelf && menu.id === 'permissions';
                  
                  return (
                    <div 
                      key={menu.id} 
                      onClick={() => !isSelfAndPermissions && handleToggleMenu(menu.id)}
                      style={{
                        border: isChecked ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem',
                        cursor: isSelfAndPermissions ? 'not-allowed' : 'pointer',
                        background: isChecked ? 'var(--primary-subtle)' : 'var(--card-bg)',
                        opacity: isSelfAndPermissions ? 0.7 : 1,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handle change via click on parent container
                        disabled={isSelfAndPermissions ?? false}
                        style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px', cursor: isSelfAndPermissions ? 'not-allowed' : 'pointer' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {menu.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {menu.desc}
                        </span>
                        {isSelfAndPermissions && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                            * บัญชีปัจจุบันต้องการสิทธิ์นี้เพื่อป้องกันการล็อกเอาต์ตัวเอง
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={goToList}>ยกเลิก</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: 'auto' }}>
                  {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteRecord !== null}
        onClose={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord !== null) {
            executeDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        title="ยืนยันการลบสิทธิ์การใช้งาน"
        message={
          deleteRecord && (
            <>
              คุณต้องการลบการตั้งค่าสิทธิ์ของ <strong>"{deleteRecord.user_id}"</strong> ใช่หรือไม่?
              <br />
              ผู้ใช้นี้จะสูญเสียการกำหนดสิทธิ์พิเศษและกลับไปใช้การตั้งค่าเข้าถึงได้ทุกเมนูเป็นค่าเริ่มต้น
            </>
          )
        }
        confirmText="ลบข้อมูลสิทธิ์"
        cancelText="ยกเลิก"
      />
    </div>
  );
};

export default PermissionsPage;
