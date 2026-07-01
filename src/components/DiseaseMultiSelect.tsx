import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Disease } from '../types/opd';

interface DiseaseMultiSelectProps {
  value: string;
  onChange: (newValue: string) => void;
  onDiseaseAdded?: () => void;
}

export const DiseaseMultiSelect: React.FC<DiseaseMultiSelectProps> = ({ value, onChange, onDiseaseAdded }) => {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add disease form state
  const [newCode, setNewCode] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameTh, setNewNameTh] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [savingDisease, setSavingDisease] = useState(false);
  const [modalError, setModalError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch diseases from db
  const fetchDiseases = async () => {
    try {
      const { data, error } = await supabase
        .from('diseases')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      if (data) setDiseases(data);
    } catch (err) {
      console.error('Error fetching diseases:', err);
    }
  };

  useEffect(() => {
    fetchDiseases();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse currently selected keys
  const selectedKeys = value
    ? value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const handleToggleSelect = (codeOrName: string) => {
    let newSelected: string[];
    // Find matching catalog disease to normalize matching
    const matched = diseases.find(
      d => d.code.toLowerCase() === codeOrName.toLowerCase() ||
           d.nameth.toLowerCase() === codeOrName.toLowerCase() ||
           d.nameen.toLowerCase() === codeOrName.toLowerCase()
    );
    const keyToUse = matched ? matched.code : codeOrName;

    const isSelected = selectedKeys.some(
      k => k.toLowerCase() === keyToUse.toLowerCase() ||
           (matched && (k.toLowerCase() === matched.nameth.toLowerCase() || k.toLowerCase() === matched.nameen.toLowerCase()))
    );

    if (isSelected) {
      newSelected = selectedKeys.filter(
        k => k.toLowerCase() !== keyToUse.toLowerCase() &&
             (!matched || (k.toLowerCase() !== matched.nameth.toLowerCase() && k.toLowerCase() !== matched.nameen.toLowerCase()))
      );
    } else {
      newSelected = [...selectedKeys, keyToUse];
    }
    onChange(newSelected.join(', '));
  };

  const handleRemoveKey = (keyToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = selectedKeys.filter(k => k !== keyToRemove);
    onChange(newSelected.join(', '));
  };

  // Add new disease to DB
  const handleAddDiseaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newNameEn.trim() || !newNameTh.trim()) {
      setModalError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    
    setSavingDisease(true);
    setModalError('');
    try {
      const codeUpper = newCode.trim().toUpperCase();
      const { error } = await supabase
        .from('diseases')
        .insert({
          code: codeUpper,
          nameen: newNameEn.trim(),
          nameth: newNameTh.trim(),
          description: newDesc.trim() || null
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('unique') || error.code === '23505') {
          throw new Error(`รหัสโรค "${codeUpper}" นี้มีอยู่แล้วในระบบ`);
        }
        throw error;
      }

      // Add to selected list
      const newSelected = [...selectedKeys, codeUpper];
      onChange(newSelected.join(', '));

      // Refresh list, close modal, reset form
      await fetchDiseases();
      if (onDiseaseAdded) {
        onDiseaseAdded();
      }
      setShowAddModal(false);
      setNewCode('');
      setNewNameEn('');
      setNewNameTh('');
      setNewDesc('');
    } catch (err: any) {
      console.error('Error creating disease:', err);
      setModalError(err.message || 'เกิดข้อผิดพลาดในการบันทึกโรคประจำตัว');
    } finally {
      setSavingDisease(false);
    }
  };

  const filteredDiseases = diseases.filter(d => 
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.nameen.toLowerCase().includes(search.toLowerCase()) ||
    d.nameth.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Multi-select Box */}
        <div 
          className="form-input" 
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            minHeight: '38px', 
            height: 'auto',
            padding: '4px 8px',
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '4px', 
            alignItems: 'center',
            cursor: 'pointer',
            background: 'var(--bg-surface-solid)',
            borderColor: isOpen ? 'var(--border-focus)' : 'var(--border-color)',
            boxShadow: isOpen ? '0 0 0 2px var(--primary-glow)' : 'none',
            position: 'relative',
            paddingRight: '24px'
          }}
        >
          {selectedKeys.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2px 0' }}>เลือกโรคประจำตัว...</span>
          ) : (
            selectedKeys.map(key => {
              // Try to find display label
              const matched = diseases.find(
                d => d.code.toLowerCase() === key.toLowerCase() ||
                     d.nameth.toLowerCase() === key.toLowerCase() ||
                     d.nameen.toLowerCase() === key.toLowerCase()
              );
              const label = matched ? `${matched.code} - ${matched.nameth}` : key;
              return (
                <span 
                  key={key} 
                  style={{
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {label}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveKey(key, e)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      padding: 0,
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 700
                    }}
                  >
                    &times;
                  </button>
                </span>
              );
            })
          )}
          
          {/* Caret icon */}
          <span style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            transition: 'transform 0.15s ease',
            transformOrigin: 'center',
            display: 'inline-block'
          }}>
            ▼
          </span>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              marginTop: '4px',
              background: 'var(--bg-surface-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            {/* Search Input */}
            <div style={{ padding: '6px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-surface-solid)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="ค้นหาชื่อโรค..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ height: '30px', fontSize: '0.8125rem', padding: '4px 8px' }}
              />
            </div>

            {/* Options List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredDiseases.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  ไม่พบโรคที่ค้นหา
                </div>
              ) : (
                filteredDiseases.map(d => {
                  const isSelected = selectedKeys.some(
                    k => k.toLowerCase() === d.code.toLowerCase() ||
                         k.toLowerCase() === d.nameth.toLowerCase() ||
                         k.toLowerCase() === d.nameen.toLowerCase()
                  );
                  return (
                    <div
                      key={d.id}
                      onClick={() => handleToggleSelect(d.code)}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.8125rem',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{d.code} - {d.nameth}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.nameen}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Disease Button */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowAddModal(true)}
        style={{
          width: 'auto',
          padding: '0 12px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontSize: '0.8125rem',
          flexShrink: 0
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        เพิ่มโรค
      </button>

      {/* Add Disease Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '460px',
              boxShadow: 'var(--shadow-xl)',
              animation: 'scaleUp 0.2s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>➕ เพิ่มข้อมูลโรคประจำตัวเข้าระบบ</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-foreground)', fontSize: '0.8125rem' }}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleAddDiseaseSubmit}>
              <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="form-label">รหัสโรค (เช่น DM, HT, DLP, CKD) *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="รหัสอ้างอิงภาษาอังกฤษตัวพิมพ์ใหญ่ เช่น DM"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="form-label">ชื่อภาษาอังกฤษ (nameen) *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="เช่น Diabetes Mellitus"
                  value={newNameEn}
                  onChange={e => setNewNameEn(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="form-label">ชื่อภาษาไทย (nameth) *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="เช่น โรคเบาหวาน"
                  value={newNameTh}
                  onChange={e => setNewNameTh(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">คำอธิบายเพิ่มเติม</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="รายละเอียดอาการหรือพยาธิวิทยาของโรค (ระบุหรือไม่ระบุก็ได้)..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ width: 'auto' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDisease}
                  className="btn btn-primary"
                  style={{ width: 'auto' }}
                >
                  {savingDisease ? 'กำลังบันทึก...' : 'บันทึกโรคใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
