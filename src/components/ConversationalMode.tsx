import React, { useState, useEffect } from 'react';
import type { FieldDef } from '../types/index';
import { ListCard } from './ListCard';
import { ResourceCard } from './ResourceCard';
import { NumListCard } from './NumListCard';
import { RangeCard } from './RangeCard';

const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #d8d6cd', borderRadius: 6, fontFamily: 'inherit', resize: 'vertical' };
const btnStyle: React.CSSProperties = { padding: '7px 14px', fontSize: 13, border: '1px solid #d8d6cd', borderRadius: 6, background: '#fff', cursor: 'pointer' };

interface ConversationalModeProps {
  fields: FieldDef[];
  data: any;
  onChange: (key: string, value: any) => void;
}

export function ConversationalMode({ fields, data, onChange }: ConversationalModeProps) {
  const isFilled = (f: FieldDef) => {
    if (f.type === 'custom') return true; // optional, additive — filled via board view
    if (f.type === 'list' || f.type === 'resources' || f.type === 'numlist') return !!(data[f.key] && data[f.key].length);
    if (f.type === 'range') return !!(data[f.key] && data[f.key].low && data[f.key].high);
    return !!data[f.key];
  };

  const remaining = fields.filter((f) => !isFilled(f));
  const current = remaining[0];
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
  }, [current?.key]);

  if (!current) {
    return <div style={{ padding: '20px 0', color: '#6b6b66', fontSize: 14 }}>All questions answered. Switch to board view to review or edit any field.</div>;
  }

  const submit = () => {
    if (!draft.trim()) return;
    if (current.type === 'list') {
      onChange(current.key, [...(data[current.key] || []), draft.trim()]);
      setDraft('');
      return;
    }
    onChange(current.key, draft.trim());
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: '#8a8880', marginBottom: 6 }}>
        {current.group} — question {fields.length - remaining.length + 1} of {fields.length}
      </div>
      <div style={{ fontSize: 16, marginBottom: 12 }}>{current.q}</div>

      {current.type === 'resources' ? (
        <div style={{ maxWidth: 260 }}>
          <ResourceCard f={current} value={data[current.key]} onChange={onChange} />
          {(data[current.key] || []).length > 0 && (
            <button onClick={() => onChange(current.key, data[current.key])} style={{ ...btnStyle, marginTop: 8 }}>
              Done adding resources
            </button>
          )}
        </div>
      ) : current.type === 'numlist' ? (
        <div style={{ maxWidth: 260 }}>
          <NumListCard f={current} value={data[current.key]} onChange={onChange} />
          {(data[current.key] || []).length > 0 && (
            <button onClick={() => onChange(current.key, data[current.key])} style={{ ...btnStyle, marginTop: 8 }}>
              Done adding numbers
            </button>
          )}
        </div>
      ) : current.type === 'range' ? (
        <div style={{ maxWidth: 260 }}>
          <RangeCard f={current} value={data[current.key]} onChange={onChange} />
          {data[current.key]?.low && data[current.key]?.high && (
            <button onClick={() => onChange(current.key, data[current.key])} style={{ ...btnStyle, marginTop: 8 }}>
              Confirm range
            </button>
          )}
        </div>
      ) : current.type === 'list' ? (
        <div>
          {(data[current.key] || []).length > 0 && (
            <div style={{ marginBottom: 10, fontSize: 13, color: '#5f5e5a' }}>Added so far: {(data[current.key] || []).join('; ')}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Type your answer, then press Enter"
            />
            <button onClick={submit} style={{ ...btnStyle, alignSelf: 'flex-end' }}>Add</button>
          </div>
          {(data[current.key] || []).length > 0 && (
            <button onClick={() => onChange(current.key, data[current.key])} style={{ ...btnStyle, marginTop: 8 }}>
              Done adding items
            </button>
          )}
        </div>
      ) : current.options ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {current.options.map((o) => (
            <button key={o} onClick={() => onChange(current.key, o)} style={btnStyle}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Type your answer, then press Enter"
          />
          <button onClick={submit} style={{ ...btnStyle, alignSelf: 'flex-end' }}>Next</button>
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: '#a3a199' }}>{fields.length - remaining.length} of {fields.length} answered</div>
    </div>
  );
}
