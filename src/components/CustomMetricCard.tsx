import React, { useState } from 'react';
import type { FieldDef, CustomMetric } from '../types/index';

interface CustomMetricCardProps {
  f: FieldDef;
  value: CustomMetric[];
  onChange: (key: string, value: CustomMetric[]) => void;
}

export function CustomMetricCard({ f, value, onChange }: CustomMetricCardProps) {
  const items = Array.isArray(value) ? value : [];
  const [name, setName] = useState('');
  const [val, setVal] = useState('');
  const [measure, setMeasure] = useState('');

  const add = () => {
    if (!name.trim()) return;
    onChange(f.key, [...items, { name: name.trim(), val: val.trim(), measure: measure.trim() }]);
    setName(''); setVal(''); setMeasure('');
  };

  const remove = (i: number) => onChange(f.key, items.filter((_, idx) => idx !== i));

  const inp: React.CSSProperties = {
    boxSizing: 'border-box', width: '100%', fontSize: 13, padding: '7px 10px',
    border: '1px solid #e0ddd5', borderRadius: 5, outline: 'none', fontFamily: 'inherit', background: '#fff',
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 8 }}>{f.label}</div>
      <div style={{ border: '1px solid #e5e3dc', borderRadius: 6, background: '#fff', padding: '12px 14px' }}>
        {items.length === 0 && (
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>{f.q}</div>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: '#f5f4f0', border: '1px solid #eae8e2', borderRadius: 5, padding: '6px 10px', marginBottom: 6, fontSize: 13 }}>
            <span style={{ overflowWrap: 'anywhere', lineHeight: 1.4 }}>
              {it.name}{it.val ? `: ${it.val}` : ''}{it.measure ? ` (${it.measure})` : ''}
            </span>
            <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#aaa', flexShrink: 0, fontSize: 15 }}>×</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: items.length > 0 ? 8 : 0 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Metric name, e.g. error rate" style={inp} />
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Value, e.g. 4%" style={inp} />
          <input value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="How it's measured" style={inp} />
          <button onClick={add} style={{ fontSize: 13, padding: '7px 12px', border: '1px solid #e0ddd5', borderRadius: 5, background: '#fff', cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start' }}>
            Add metric
          </button>
        </div>
      </div>
    </div>
  );
}
