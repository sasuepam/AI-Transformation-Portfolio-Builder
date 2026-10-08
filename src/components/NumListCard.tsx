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
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 8 }}>{f.label}</div>
      <div style={{ border: '1px solid #e5e3dc', borderRadius: 6, background: '#fff', padding: '10px 12px' }}>
        {items.length === 0 && (
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 6 }}>{f.q}</div>
        )}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {items.map((it, i) => (
              <span
                key={i}
                onClick={() => remove(i)}
                style={{ background: '#f5f4f0', border: '1px solid #eae8e2', borderRadius: 14, padding: '3px 10px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {it} <span style={{ color: '#aaa', fontSize: 14 }}>×</span>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type="number"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add a number, then Enter or +"
            style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 10px', border: '1px solid #e0ddd5', borderRadius: 5, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={add} style={{ fontSize: 13, padding: '7px 12px', border: '1px solid #e0ddd5', borderRadius: 5, background: '#fff', cursor: 'pointer', fontWeight: 500 }}>+</button>
        </div>
      </div>
    </div>
  );
}
