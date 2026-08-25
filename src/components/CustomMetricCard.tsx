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
    setName('');
    setVal('');
    setMeasure('');
  };

  const remove = (i: number) => onChange(f.key, items.filter((_, idx) => idx !== i));

  return (
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>{f.label}</div>
      {items.length === 0 && <div style={{ fontSize: 11, color: '#a3a199', textAlign: 'center', marginBottom: 6 }}>{f.q}</div>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, background: '#fff', border: '1px solid #e6e3d8', borderRadius: 4, padding: '4px 8px', marginBottom: 4, fontSize: 11 }}>
          <span style={{ overflowWrap: 'anywhere' }}>
            {it.name}{it.val ? `: ${it.val}` : ''}{it.measure ? ` (${it.measure})` : ''}
          </span>
          <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#a3a199', flexShrink: 0 }}>×</span>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Metric name, e.g. error rate"
          style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Value, e.g. 4%"
          style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <input
          value={measure}
          onChange={(e) => setMeasure(e.target.value)}
          placeholder="How it's measured"
          style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <button onClick={add} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
          Add metric
        </button>
      </div>
    </div>
  );
}
