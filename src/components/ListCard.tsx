import React, { useState, useEffect } from 'react';
import type { FieldDef } from '../types/index';

const CARD_MIN_HEIGHT = 56;

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
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>{f.label}</div>
      {items.length === 0 && <div style={{ fontSize: 11, color: '#a3a199', textAlign: 'center', marginBottom: 6 }}>{f.q}</div>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, background: '#fff', border: '1px solid #e6e3d8', borderRadius: 4, padding: '4px 8px', marginBottom: 4, fontSize: 11 }}>
          <span style={{ overflowWrap: 'anywhere' }}>{it}</span>
          <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#a3a199', flexShrink: 0 }}>×</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add item"
          style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <button onClick={add} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}
