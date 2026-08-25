import React from 'react';

interface ModeToggleProps {
  mode: 'form' | 'conversational';
  setMode: (mode: 'form' | 'conversational') => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #d8d6cd', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
      {['form', 'conversational'].map((m) => (
        <button
          key={m}
          onClick={() => setMode(m as 'form' | 'conversational')}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            background: mode === m ? '#2c2c2a' : '#fff',
            color: mode === m ? '#fff' : '#2c2c2a',
          }}
        >
          {m === 'form' ? 'Board' : 'Conversational'}
        </button>
      ))}
    </div>
  );
}
