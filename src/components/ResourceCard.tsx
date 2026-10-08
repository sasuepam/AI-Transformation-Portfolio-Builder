import React, { useState } from 'react';
import type { FieldDef, Resource } from '../types/index';

interface ResourceCardProps {
  f: FieldDef;
  value: Resource[];
  onChange: (key: string, value: Resource[]) => void;
}

export function ResourceCard({ f, value, onChange }: ResourceCardProps) {
  const items = Array.isArray(value) ? value : [];
  const [role, setRole] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [timeUnit, setTimeUnit] = useState<'minutes' | 'hours'>('minutes');
  const [people, setPeople] = useState('');

  const add = () => {
    if (!role.trim() || !timeValue || !people) return;
    onChange(f.key as string, [...items, { role: role.trim(), timeValue, timeUnit, people }]);
    setRole(''); setTimeValue(''); setTimeUnit('minutes'); setPeople('');
  };

  const remove = (i: number) => onChange(f.key as string, items.filter((_, idx) => idx !== i));

  const inp: React.CSSProperties = {
    fontSize: 13, padding: '7px 10px', border: '1px solid #e0ddd5', borderRadius: 5,
    outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 8 }}>{f.label}</div>
      <div style={{ border: '1px solid #e5e3dc', borderRadius: 6, background: '#fff', padding: '12px 14px' }}>
        {items.length === 0 && (
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>Add each role, time, and headcount.</div>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: '#f5f4f0', border: '1px solid #eae8e2', borderRadius: 5, padding: '6px 10px', marginBottom: 6, fontSize: 13 }}>
            <span style={{ overflowWrap: 'anywhere', lineHeight: 1.4 }}>
              {it.role} — {it.timeValue} {it.timeUnit}, {it.people} {parseInt(it.people) === 1 ? 'person' : 'people'}
            </span>
            <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#aaa', flexShrink: 0, fontSize: 15 }}>×</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: items.length > 0 ? 8 : 0 }}>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. developer)" style={{ ...inp, width: '100%' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={timeValue} onChange={(e) => setTimeValue(e.target.value)} type="number" placeholder="Time" style={{ ...inp, flex: 1 }} />
            <select value={timeUnit} onChange={(e) => setTimeUnit(e.target.value as 'minutes' | 'hours')} style={{ ...inp, flexShrink: 0, cursor: 'pointer' }}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
            <input value={people} onChange={(e) => setPeople(e.target.value)} type="number" placeholder="# people" style={{ ...inp, flex: 1 }} />
          </div>
          <button onClick={add} style={{ fontSize: 13, padding: '7px 12px', border: '1px solid #e0ddd5', borderRadius: 5, background: '#fff', cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start' }}>
            Add resource
          </button>
        </div>
      </div>
    </div>
  );
}
