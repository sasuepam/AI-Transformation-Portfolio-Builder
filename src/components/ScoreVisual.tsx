import React from 'react';
import { SCORE_LEGEND, scoreTier, scoreExplanation } from '../utils/scoring';
import type { ScoreResult } from '../utils/scoring';

const GAUGE_MIN = -50;
const GAUGE_MAX = 500;

function gaugePos(roi: number): number {
  const clamped = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, roi));
  return ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
}

export function ScoreLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 11, color: '#666' }}>
      {SCORE_LEGEND.map((band, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: band.color, display: 'inline-block' }} />
          <b style={{ color: band.color }}>{band.tier}</b>
          <span style={{ color: '#999' }}>
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

  const primaryStats = [
    {
      label: 'RAW SCORE',
      value: String(score.raw),
      sub: 'A ranking number, not a percentage',
    },
    {
      label: 'ROI',
      value: `${score.roi}%`,
      sub: `Net annual return ÷ build cost`,
    },
    {
      label: 'BREAK-EVEN BY',
      value: m.paybackMonths != null ? `~${m.paybackMonths} mo` : 'Not reached',
      sub: 'When returns repay build cost',
    },
  ];

  const secondaryStats = [
    { label: 'BENEFIT / YEAR', value: `$${m.value.toLocaleString()}` },
    { label: 'RUNNING COST / YEAR', value: `$${m.opex.toLocaleString()}` },
    { label: 'NET RETURN / YEAR', value: `$${m.netAnnual.toLocaleString()}` },
    { label: 'BUILD COST', value: `$${m.capex.toLocaleString()}` },
  ];

  const boundaries = [0, 50, 150, 400];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Sample financial outlook</h3>
        {tier && (
          <span style={{ fontSize: 13, fontWeight: 600, color: tier.color }}>
            {tier.tier} tier
          </span>
        )}
      </div>

      {/* Primary stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
        {primaryStats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: '#999', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: '#111', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: 20, marginBottom: 20 }}>
        {/* Narrative */}
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 20px' }}>
          {tier && <><b style={{ color: tier.color }}>{tier.tier}</b> — {tier.note}. </>}
          At ${m.rate}/hr: benefit ~${m.value.toLocaleString()}/yr, running cost ~${m.opex.toLocaleString()}/yr, and net annual return ~${m.netAnnual.toLocaleString()}/yr against a build cost of ~${m.capex.toLocaleString()}.
        </p>

        {/* ROI colour gauge */}
        <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 4 }}>
          {SCORE_LEGEND.map((band, i) => {
            const from = i === 0 ? gaugePos(GAUGE_MIN) : gaugePos(SCORE_LEGEND[i - 1].max);
            const to = gaugePos(band.max === Infinity ? GAUGE_MAX : band.max);
            return (
              <div key={i} style={{ position: 'absolute', left: `${from}%`, width: `${to - from}%`, top: 0, bottom: 0, background: band.color, opacity: 0.85 }} />
            );
          })}
          <div style={{ position: 'absolute', left: `calc(${gaugePos(score.roi ?? 0)}% - 2px)`, top: -3, width: 4, height: 16, borderRadius: 2, background: '#111', boxShadow: '0 0 0 2px #fff' }} />
        </div>
        <div style={{ position: 'relative', height: 16, fontSize: 10, color: '#aaa', marginBottom: 8 }}>
          {boundaries.map((b) => (
            <span key={b} style={{ position: 'absolute', left: `${gaugePos(b)}%`, transform: 'translateX(-50%)' }}>{b}%</span>
          ))}
        </div>
        <ScoreLegend />
      </div>

      {/* Secondary stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, paddingTop: 4 }}>
        {secondaryStats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: '#999', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: '#aaa' }}>
        Confidence: {score.confidence || 'not set'} (×{score.weight} weight). At ${m.rate}/hr — the median of the rates you tested.
      </div>
    </div>
  );
}
