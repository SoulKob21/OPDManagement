import React from 'react';

interface DmSummaryViewProps {
  selectedYear: number;
  hba1cResults: any[];
  latestHbA1cMap: Map<string, any>;
  prevHbA1cMap: Map<string, any>;
  loading: boolean;
  error: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

const DonutChart: React.FC<{
  data: ChartData[];
  totalLabel: string;
}> = ({ data, totalLabel }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {total === 0 ? (
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />
          ) : (
            data.map((item, index) => {
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              if (percent === 0) return null;
              const strokeDasharray = `${percent} ${100 - percent}`;
              const strokeDashoffset = 100 - accumulatedPercent;
              accumulatedPercent += percent;
              return (
                <circle
                  key={index}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3.5"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease' }}
                />
              );
            })
          )}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {totalLabel}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, minWidth: '160px' }}>
        {data.map((item, index) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {item.value} ราย ({percent.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DmSummaryView: React.FC<DmSummaryViewProps> = ({
  selectedYear,
  latestHbA1cMap,
  prevHbA1cMap,
  loading,
  error
}) => {
  // 1. Calculate Chart 1 Data: HbA1c < 7 vs HbA1c >= 7
  let hba1cUnder7 = 0;
  let hba1cOverEqual7 = 0;

  latestHbA1cMap.forEach((rec) => {
    const val = parseFloat(rec.result_value);
    if (!isNaN(val)) {
      if (val < 7.0) {
        hba1cUnder7++;
      } else {
        hba1cOverEqual7++;
      }
    }
  });

  const chart1Data: ChartData[] = [
    { label: 'HbA1c < 7.0% (ดี/ปกติ)', value: hba1cUnder7, color: '#10b981' },
    { label: 'HbA1c >= 7.0% (สูง/ผิดปกติ)', value: hba1cOverEqual7, color: '#ef4444' },
  ];

  // 2. Calculate Chart 2 Data: HbA1c Trend (คงเดิม, สูงขึ้น, น้อยลง) compared with previous year
  let trendUnchanged = 0;
  let trendIncreased = 0;
  let trendDecreased = 0;

  latestHbA1cMap.forEach((latestRec, pid) => {
    const prevRec = prevHbA1cMap.get(pid);
    if (prevRec) {
      const latestVal = parseFloat(latestRec.result_value);
      const prevVal = parseFloat(prevRec.result_value);

      if (!isNaN(latestVal) && !isNaN(prevVal)) {
        if (latestVal > prevVal) {
          trendIncreased++;
        } else if (latestVal < prevVal) {
          trendDecreased++;
        } else {
          trendUnchanged++;
        }
      }
    }
  });

  const chart2Data: ChartData[] = [
    { label: 'ลดลงจากปีที่แล้ว (ดีขึ้น)', value: trendDecreased, color: '#10b981' },
    { label: 'คงเดิมจากปีที่แล้ว', value: trendUnchanged, color: '#9ca3af' },
    { label: 'สูงขึ้นจากปีที่แล้ว (แย่ลง)', value: trendIncreased, color: '#f59e0b' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0', color: 'var(--text-secondary)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span>กำลังโหลดข้อมูลสรุปและประมวลผลกราฟ...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Dynamic Fiscal Year Title */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
              ยอดสรุปผลผู้ป่วยเบาหวาน รายปี (ปีงบประมาณ {selectedYear})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
              รายงานวิเคราะห์แนวโน้มและสถิติผลระดับน้ำตาลสะสม HbA1C ของผู้ป่วยสะสมในระบบ
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Two Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
          
          {/* Chart 1 Box */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              เปรียบเทียบระดับน้ำตาลสะสม (HbA1c)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
              สัดส่วนจำนวนผู้ป่วยที่มีระดับน้ำตาลสะสมอยู่ในเกณฑ์ปกติ (&lt; 7.0%) และกลุ่มที่มีระดับน้ำตาลสะสมสูง (&ge; 7.0%)
            </p>
            <DonutChart data={chart1Data} totalLabel="ผู้ป่วยทั้งหมด" />
          </div>

          {/* Chart 2 Box */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-2)' }}><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
              แนวโน้มระดับน้ำตาลสะสม (เทียบกับปีงบประมาณก่อนหน้า)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
              การเปรียบเทียบผลตรวจล่าสุดของปีงบประมาณนี้กับปีงบประมาณที่แล้วเพื่อแสดงแนวโน้มที่ดีขึ้น คงที่ หรือแย่ลง
            </p>
            <DonutChart data={chart2Data} totalLabel="มีข้อมูลเทียบ" />
          </div>

        </div>
      </div>

      {/* Evaluation Criteria Section */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          เกณฑ์ที่ใช้ประเมินทั้งหมด
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          
          {/* Criterion 1: HbA1c */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Card Header */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1rem' }}>🩸</span>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                เกณฑ์ระดับ HbA1c
              </h4>
            </div>
            {/* Card Body */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem', fontSize: '0.8125rem', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>ปกติ</span>
                <span style={{ fontWeight: 700 }}>&le; 5.6 %</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>กลุ่มเสี่ยง (Pre-diabetes)</span>
                <span style={{ fontWeight: 700 }}>5.7 – 6.4 %</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Diabetes (เบาหวาน)</span>
                <span style={{ fontWeight: 700 }}>&ge; 6.5 %</span>
              </div>
            </div>
          </div>

          {/* Criterion 2: FBS */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Card Header */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1rem' }}>🍬</span>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                เกณฑ์ระดับ FBS
              </h4>
            </div>
            {/* Card Body */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem', fontSize: '0.8125rem', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>ปกติ</span>
                <span style={{ fontWeight: 700 }}>70 – 100 mg/dL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>Pre-diabetes (กลุ่มเสี่ยง)</span>
                <span style={{ fontWeight: 700 }}>101 – 125 mg/dL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Diabetes (เบาหวาน)</span>
                <span style={{ fontWeight: 700 }}>&ge; 126 mg/dL</span>
              </div>
            </div>
          </div>

          {/* Criterion 3: Foot Exam */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Card Header */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1rem' }}>🦶</span>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                เกณฑ์การตรวจเท้า (Monofilament)
              </h4>
            </div>
            {/* Card Body */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem', fontSize: '0.8125rem', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>ปกติ</span>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>รับรู้ครบ 4 จุด และชีพจรเท้าปกติ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>ผิดปกติ</span>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>สูญเสียสัมผัส &ge; 1 จุด หรือชีพจรเบา</span>
              </div>
            </div>
          </div>

          {/* Criterion 4: ABI */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Card Header */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1rem' }}>🩺</span>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                เกณฑ์การตรวจหลอดเลือดแดง (ABI)
              </h4>
            </div>
            {/* Card Body */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem', fontSize: '0.8125rem', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>ปกติ</span>
                <span style={{ fontWeight: 700 }}>1.00 - 1.40 ทั้ง 2 ข้าง</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '0.25rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>ผิดปกติ (ตีบ/แข็ง)</span>
                <span style={{ fontWeight: 700 }}>&lt; 1.00 หรือ &gt; 1.40</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
