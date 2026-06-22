import React from 'react';

interface DmSummaryViewProps {
  onNavigate: (view: string) => void;
}

export const DmSummaryView: React.FC<DmSummaryViewProps> = ({ onNavigate }) => (
  <div>
    <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            สรุปผลคัดกรองเบาหวาน รายปี
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            ภาพรวมการคัดกรองเบาหวานประจำปี
          </p>
        </div>
        <select
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          defaultValue="2569"
        >
          <option value="2569">พ.ศ. 2569</option>
          <option value="2568">พ.ศ. 2568</option>
          <option value="2567">พ.ศ. 2567</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* Left Box: Targets & Coverage */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              ความครอบคลุมการคัดกรองเป้าหมาย
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
              สถิติการดำเนินงานคัดกรองเชิงรุกตามเป้าหมายของเขตบริการสุขภาพประจำปี พ.ศ. 2569
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>69.3%</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>1,248 / 1,800 ราย</span>
            </div>

            {/* Premium Gradient Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ width: '69.3%', height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '9999px' }}></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>เป้าหมายประชากรกลุ่มเสี่ยง</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>1,800 ราย</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>คงเหลือตามเป้าหมาย</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-2)' }}>552 ราย</div>
            </div>
          </div>
        </div>

        {/* Right Box: FBS Interpretation Guide */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-2)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            เกณฑ์การแปลผล Fasting Blood Sugar (FBS)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            เกณฑ์มาตรฐานการตรวจระดับน้ำตาลในเลือดหลังจากงดน้ำและอาหารอย่างน้อย 8 ชั่วโมง
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.875rem' }}>ปกติ (ความเสี่ยงต่ำ)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>ไม่มีอาการแสดง มีภาวะสุขภาพปกติ</div>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--success)' }}>&lt; 100 mg/dL</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--accent-2)', fontSize: '0.875rem' }}>กลุ่มเสี่ยงสูง (Pre-diabetes)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>ควรปรับเปลี่ยนพฤติกรรม ตรวจติดตามซ้ำ</div>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--accent-2)' }}>100 - 125 mg/dL</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>สงสัยเป็นเบาหวาน (DM ยืนยัน)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>ส่งพบแพทย์เพื่อตรวจระดับน้ำตาลซ้ำและวินิจฉัย</div>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--danger)' }}>&ge; 126 mg/dL</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
);
