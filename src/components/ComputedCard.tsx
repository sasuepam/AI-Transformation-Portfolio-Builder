import React from 'react';

const CARD_MIN_HEIGHT = 56;

interface ComputedCardProps {
  label: string;
  text: string;
}

export function ComputedCard({ label, text }: ComputedCardProps) {
  return (
    <div
      style={{
        background: '#c9dcf7',
        border: '1px solid #a9c4ea',
        borderRadius: 4,
        padding: '10px 12px',
        minHeight: CARD_MIN_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#1f3a5f', overflowWrap: 'anywhere', lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}
