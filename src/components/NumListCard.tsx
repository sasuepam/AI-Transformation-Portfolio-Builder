import React, { useState } from 'react';
import type { FieldDef } from '../types/index';

interface NumListCardProps {
  f: FieldDef;
  value: string[];
  onChange: (key: string, value: string[]) => void;
}

export function NumListCard({ f, value, onChange }: NumListCardProps) {
  const items = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState('');

  const add = () => {
    if (!draft || isNaN(parseFloat(draft))) return;
    onChange(f.key, [...items, draft]);
    setDraft('');
  };

  const remove = (i: number) => onChange(f.key, items.filter((_, idx) => idx !== i));

  return (
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>{f.label}</div>
      {items.length === 0 && <div style={{ fontSize: 11, color: '#a3a199', textAlign: 'center', marginBottom: 6 }}>{f.q}</div>}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {items.map((it, i) => (
            <span
              key={i}
              onClick={() => remove(i)}
              style={{ background: '#fff', border: '1px solid #e6e3d8', borderRadius: 10, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
            >
              {it} ×
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          type="number"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a number"
          style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <button onClick={add} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}
