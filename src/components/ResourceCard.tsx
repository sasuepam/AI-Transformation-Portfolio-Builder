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
    setRole('');
    setTimeValue('');
    setTimeUnit('minutes');
    setPeople('');
  };

  const remove = (i: number) => onChange(f.key as string, items.filter((_, idx) => idx !== i));

  return (
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>{f.label}</div>
      {items.length === 0 && <div style={{ fontSize: 11, color: '#a3a199', textAlign: 'center', marginBottom: 6 }}>{f.q}</div>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, background: '#fff', border: '1px solid #e6e3d8', borderRadius: 4, padding: '4px 8px', marginBottom: 4, fontSize: 11 }}>
          <span style={{ overflowWrap: 'anywhere' }}>{it.role} — {it.timeValue} {it.timeUnit}, {it.people} people</span>
          <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: '#a3a199', flexShrink: 0 }}>×</span>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role, e.g. developer"
          style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            type="number"
            placeholder="Time"
            style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
          />
          <select
            value={timeUnit}
            onChange={(e) => setTimeUnit(e.target.value as 'minutes' | 'hours')}
            style={{ fontSize: 11, border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', flexShrink: 0 }}
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
          </select>
        </div>
        <input
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          type="number"
          placeholder="Number of people"
          style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4 }}
        />
        <button onClick={add} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
          Add resource
        </button>
      </div>
    </div>
  );
}
