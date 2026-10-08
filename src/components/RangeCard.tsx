import React from 'react';
import type { FieldDef, RangeValue } from '../types/index';

interface RangeCardProps {
  f: FieldDef;
  value: RangeValue | undefined;
  onChange: (key: string, value: RangeValue) => void;
}

export function RangeCard({ f, value, onChange }: RangeCardProps) {
  const v = value || { low: '', high: '' };
  const setLow = (low: string) => onChange(f.key, { ...v, low });
  const setHigh = (high: string) => onChange(f.key, { ...v, high });

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    padding: '9px 12px',
    border: '1px solid #e5e3dc',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'inherit',
    background: '#fff',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 8 }}>{f.label}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Low</div>
          <input value={v.low} onChange={(e) => setLow(e.target.value)} type="number" placeholder="Low" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>High</div>
          <input value={v.high} onChange={(e) => setHigh(e.target.value)} type="number" placeholder="High" style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
