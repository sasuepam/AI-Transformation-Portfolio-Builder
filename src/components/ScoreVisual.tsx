import React from 'react';
import { SCORE_LEGEND, scoreTier } from '../utils/scoring';
import type { ScoreResult } from '../utils/scoring';

const GAUGE_MIN = -50;
const GAUGE_MAX = 500;

function gaugePos(roi: number): number {
  const clamped = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, roi));
  return ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
}

export function ScoreLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 10, color: '#5f5e5a' }}>
      {SCORE_LEGEND.map((band, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: band.color, display: 'inline-block' }} />
          <b style={{ color: band.color }}>{band.tier}</b>
          <span>
            ({i === 0 ? '<0%' : band.max === Infinity ? `${SCORE_LEGEND[i - 1].max}%+` : `${SCORE_LEGEND[i - 1].max}–${band.max}%`})
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  score: ScoreResult;
}

export function ScoreVisual({ score }: Props) {
  if (score.raw == null) return null;
  const m = score.mid;
  const tier = scoreTier(score.roi);
  const stats = [
    { label: 'Benefit / yr', value: `$${m.value}` },
    { label: 'Running cost / yr', value: `$${m.opex}` },
    { label: 'Net return / yr', value: `$${m.netAnnual}` },
    { label: 'Build cost', value: `$${m.capex}` },
    { label: 'Payback', value: m.paybackMonths != null ? `${m.paybackMonths} mo` : 'not reached' },
    { label: 'Confidence', value: `${score.confidence || 'not set'} (×${score.weight})` },
  ];
  const boundaries = [0, 50, 150, 400];

  return (
    <div style={{ marginTop: 14, maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: tier ? tier.color : '#2c2c2a' }}>{score.roi}%</span>
        <span style={{ fontSize: 13, color: '#8a8880' }}>ROI at ${m.rate}/hr, the median rate tested</span>
        {tier && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#fff', background: tier.color, borderRadius: 12, padding: '3px 10px' }}>
            {tier.tier}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 4 }}>
        {SCORE_LEGEND.map((band, i) => {
          const from = i === 0 ? gaugePos(GAUGE_MIN) : gaugePos(SCORE_LEGEND[i - 1].max);
          const to = gaugePos(band.max === Infinity ? GAUGE_MAX : band.max);
          return (
            <div
              key={i}
              style={{ position: 'absolute', left: `${from}%`, width: `${to - from}%`, top: 0, bottom: 0, background: band.color, opacity: 0.85 }}
            />
          );
        })}
        <div
          style={{ position: 'absolute', left: `calc(${gaugePos(score.roi ?? 0)}% - 2px)`, top: -3, width: 4, height: 16, borderRadius: 2, background: '#2c2c2a', boxShadow: '0 0 0 2px #fff' }}
        />
      </div>
      <div style={{ position: 'relative', height: 14, fontSize: 9, color: '#a3a199', marginBottom: 14 }}>
        {boundaries.map((b) => (
          <span key={b} style={{ position: 'absolute', left: `${gaugePos(b)}%`, transform: 'translateX(-50%)' }}>{b}%</span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#8a8880' }}>
        {tier ? tier.note : ''} Raw score (used to sort the portfolio): <b>{score.raw}</b> = ROI × confidence weight — not a percentage or dollar figure on its own.
      </div>
      <ScoreLegend />
    </div>
  );
}
