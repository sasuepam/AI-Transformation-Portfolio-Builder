import React, { useState, useEffect } from 'react';
import { ListCard } from './ListCard';
import { ResourceCard } from './ResourceCard';
import { NumListCard } from './NumListCard';
import { RangeCard } from './RangeCard';
import { CustomMetricCard } from './CustomMetricCard';
import type { FieldDef } from '../types/index';

const CARD_MIN_HEIGHT = 56;

interface BoardCardProps {
  f: FieldDef;
  value: any;
  onChange: (key: string, value: any) => void;
}

export function BoardCard({ f, value, onChange }: BoardCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  if (f.type === 'list') return <ListCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'resources') return <ResourceCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'numlist') return <NumListCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'range') return <RangeCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'custom') return <CustomMetricCard f={f} value={value} onChange={onChange} />;

  const commit = () => {
    onChange(f.key, draft);
    setEditing(false);
  };

  if (f.type === 'select') {
    return (
      <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', minHeight: CARD_MIN_HEIGHT, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{f.label}</div>
        <select
          value={value || ''}
          onChange={(e) => onChange(f.key, e.target.value)}
          style={{ fontSize: 11, border: '1px solid #d8d6cd', borderRadius: 4, padding: '3px 6px', background: '#fff', maxWidth: '100%' }}
        >
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      onClick={() => !editing && setEditing(true)}
      style={{
        background: '#f4f2ea',
        border: '1px solid #e6e3d8',
        borderRadius: 4,
        padding: '10px 12px',
        minHeight: CARD_MIN_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        cursor: editing ? 'text' : 'pointer',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{f.label}</div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
          }}
          rows={f.type === 'number' ? 1 : 3}
          style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 11, fontFamily: 'inherit', textAlign: 'center', color: '#2c2c2a', lineHeight: 1.4 }}
        />
      ) : (
        <div style={{ fontSize: 11, color: value ? '#4a4a44' : '#a3a199', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.4, width: '100%' }}>
          {value || f.q}
        </div>
      )}
    </div>
  );
}
