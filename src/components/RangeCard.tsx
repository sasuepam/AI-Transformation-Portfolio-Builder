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

  return (
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>{f.label}</div>
      {!v.low && !v.high && <div style={{ fontSize: 11, color: '#a3a199', textAlign: 'center', marginBottom: 6 }}>{f.q}</div>}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={v.low}
          onChange={(e) => setLow(e.target.value)}
          type="number"
          placeholder="Low"
          style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4, textAlign: 'center' }}
        />
        <input
          value={v.high}
          onChange={(e) => setHigh(e.target.value)}
          type="number"
          placeholder="High"
          style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4, textAlign: 'center' }}
        />
      </div>
    </div>
  );
}
