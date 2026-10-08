import React, { useState } from 'react';
import type { FieldDef } from '../types/index';

interface ListCardProps {
  f: FieldDef;
  value: string[];
  onChange: (key: string, value: string[]) => void;
}

export function ListCard({ f, value, onChange }: ListCardProps) {
  const items = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange(f.key as string, [...items, draft.trim()]);
    setDraft('');
  };
  const remove = (i: number) => onChange(f.key as string, items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 8 }}>{f.label}</div>
      <div style={{ border: '1px solid #e5e3dc', borderRadius: 6, background: '#fff', padding: '10px 12px' }}>
        {items.length === 0 && (
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 6 }}>{f.q}</div>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, background: '#f5f4f0', border: '1px solid #eae8e2', borderRadius: 5, padding: '5px 10px', marginBottom: 6, fontSize: 13 }}>
            <span style={{ overflowWrap: 'anywhere', lineHeight: 1.4 }}>{it}</span>
            <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#aaa', flexShrink: 0, fontSize: 15, lineHeight: 1 }}>×</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: items.length > 0 ? 4 : 0 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add item, then Enter or +"
            style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 10px', border: '1px solid #e0ddd5', borderRadius: 5, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={add} style={{ fontSize: 13, padding: '7px 12px', border: '1px solid #e0ddd5', borderRadius: 5, background: '#fff', cursor: 'pointer', fontWeight: 500 }}>+</button>
        </div>
      </div>
    </div>
  );
}
