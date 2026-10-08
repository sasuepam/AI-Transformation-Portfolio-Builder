import React, { useState, useEffect } from 'react';
import { ListCard } from './ListCard';
import { ResourceCard } from './ResourceCard';
import { NumListCard } from './NumListCard';
import { RangeCard } from './RangeCard';
import { CustomMetricCard } from './CustomMetricCard';
import { BuildEstimateCard } from './BuildEstimateCard';
import { computeTotalTimeCost, computeBusinessCaseOutputs, instanceTerm } from '../utils/scoring';
import { groupFields, FRAME_SUBTITLES, BC_FIELDS } from '../utils/fields';
import type { FieldDef, UseCase, BusinessCase } from '../types/index';

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  border: '#e5e3dc',
  borderSubtle: '#f0ede5',
  text: '#111',
  textSecondary: '#666',
  textMuted: '#999',
  greenBg: '#d4f0e0',
  greenText: '#1a6e3a',
  redBg: '#fce8e3',
  redText: '#b5350e',
  blueBg: '#e8f0fe',
  blueText: '#1f3a5f',
  radius: 12,
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  background: '#fff',
  color: T.text,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function withInstanceTerm(f: FieldDef, ctx: UseCase | null | undefined): FieldDef {
  if (!ctx) return f;
  const singular = instanceTerm(ctx), plural = instanceTerm(ctx, true);
  const sub = (s: string) => s.replace(/\binstances\b/gi, plural).replace(/\binstance\b/gi, singular);
  return { ...f, label: sub(f.label), q: sub(f.q) };
}

function hasValue(f: FieldDef, data: any): boolean {
  const v = data?.[f.key];
  if (f.type === 'list' || f.type === 'numlist' || f.type === 'resources')
    return Array.isArray(v) && v.length > 0;
  if (f.type === 'range') {
    const rv = v as any;
    return rv != null && (rv.low != null && rv.low !== '' || rv.high != null && rv.high !== '');
  }
  if (f.type === 'custom') return Array.isArray(v) && v.length > 0;
  return v != null && v !== '';
}

function sectionStatus(fields: FieldDef[], data: any): 'complete' | 'needs-attention' | 'empty' {
  // Exclude purely optional types from the completion check
  const scorable = fields.filter((f) => f.type !== 'custom');
  const filled = scorable.filter((f) => hasValue(f, data)).length;
  if (filled === 0) return 'empty';
  if (filled === scorable.length) return 'complete';
  if (filled === fields.length) return 'complete';
  return 'needs-attention';
}

function isFullWidth(f: FieldDef): boolean {
  return !f.type || f.type === 'list' || f.type === 'resources' || f.type === 'custom';
}

// ── Status pill ───────────────────────────────────────────────────────────────
function SectionPill({ status }: { status: 'complete' | 'needs-attention' | 'empty' }) {
  if (status === 'complete') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, background: T.greenBg, color: T.greenText, borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.greenText, display: 'inline-block' }} />
        Complete
      </span>
    );
  }
  if (status === 'needs-attention') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, background: T.redBg, color: T.redText, borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.redText, display: 'inline-block' }} />
        Needs attention
      </span>
    );
  }
  return null;
}

// ── Field renderer ────────────────────────────────────────────────────────────
function AccordionField({ f, value, onChange }: { f: FieldDef; value: any; onChange: (k: string, v: any) => void }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => { setDraft(value ?? ''); }, [value]);

  // These components render their own label
  if (f.type === 'list') return <ListCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'resources') return <ResourceCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'numlist') return <NumListCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'range') return <RangeCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'custom') return <CustomMetricCard f={f} value={value} onChange={onChange} />;
  if (f.type === 'select') return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{f.label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(f.key, e.target.value)}
        style={{ ...inputBase, cursor: 'pointer', appearance: 'auto' }}
      >
        <option value="">Select…</option>
        {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  if (f.type === 'number') return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{f.label}</label>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(f.key, draft)}
        placeholder={f.q}
        style={inputBase}
      />
    </div>
  );
  // Default: textarea
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{f.label}</label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(f.key, draft)}
        placeholder={f.q}
        rows={3}
        style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
      />
    </div>
  );
}

// ── Computed outputs section (BC only) ────────────────────────────────────────
function ComputedSection({ data, useCase, index }: { data: BusinessCase; useCase: UseCase; index: number }) {
  const [open, setOpen] = useState(false);
  const bcOut = computeBusinessCaseOutputs(data);
  const ucForTerm = useCase;

  const items: Array<{ label: string; value: string; highlight?: boolean }> = [];
  if (!bcOut) {
    items.push({ label: 'Waiting on inputs', value: 'Fill poll times, AI-assisted estimate, sprint counts, and cadence to calculate' });
  } else {
    items.push({ label: 'Manual effort (avg)', value: `${Math.round(bcOut.manualAvg * 10) / 10} min` });
    items.push({ label: 'AI-assisted (mid)', value: `${Math.round(bcOut.aiMid * 10) / 10} min` });
    items.push({ label: `Time saved / ${instanceTerm(ucForTerm)}`, value: `${Math.round(bcOut.savedPerInstance * 10) / 10} min` });
    items.push({ label: `Avg ${instanceTerm(ucForTerm, true)} / sprint`, value: `${Math.round(bcOut.avgPerSprint * 10) / 10}` });
    items.push({ label: 'Time saved / year', value: `~${bcOut.savedPerYearHrs} hours (~${bcOut.instancesPerYear} ${instanceTerm(ucForTerm, true)}/yr)` });
    items.push({ label: 'Build-phase token cost', value: `$${Math.round(bcOut.buildTokMid)}` });
    items.push({ label: `Running token cost / year`, value: `$${bcOut.runningTokMid}` });
    items.push({ label: 'Suggested confidence', value: `${bcOut.suggestedConfidence} (${bcOut.pollN} poll responses, ${bcOut.sprintN} sprints)`, highlight: true });
    if (bcOut.perRate.length === 0) {
      items.push({ label: 'Value by rate', value: 'Add at least one hourly rate to calculate value, cost, and payback' });
    } else {
      bcOut.perRate.forEach((r) => {
        items.push({ label: `At $${r.rate}/hr`, value: `Value: $${r.value}/yr · Build cost: $${r.capex} · Running: $${r.opex}/yr · Payback: ${r.paybackMonths != null ? r.paybackMonths + ' mo' : 'n/a'}`, highlight: true });
      });
    }
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', background: open ? '#fff' : '#fafaf8', border: 'none', padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, minWidth: 24 }}>
          {String(index).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Computed outputs</div>
          <div style={{ fontSize: 13, color: T.textSecondary }}>{FRAME_SUBTITLES['Computed outputs']}</div>
        </div>
        <span style={{ color: T.textMuted, fontSize: 18, lineHeight: 1 }}>{open ? '∧' : '∨'}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${T.borderSubtle}`, padding: '20px 24px' }}>
          {useCase && (
            <div style={{ fontSize: 12, color: useCase.instanceLabel ? '#5f6b52' : '#a3691c', marginBottom: 16, padding: '8px 12px', background: useCase.instanceLabel ? '#f0f5ec' : '#fef3e2', borderRadius: 6 }}>
              {useCase.instanceLabel
                ? `Figures below are per ${instanceTerm(useCase)} — "${useCase.instanceLabel}," as defined on the use case board.`
                : `No occurrence label set — go to '1. Use case' and find 'What's one occurrence called?' in The problem section.`}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '10px 14px', background: it.highlight ? T.blueBg : '#fafaf8', borderRadius: 6, border: `1px solid ${it.highlight ? '#c0d4f5' : T.borderSubtle}` }}>
                <span style={{ fontSize: 13, color: T.textSecondary, flexShrink: 0 }}>{it.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: it.highlight ? T.blueText : T.text, textAlign: 'right' }}>{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Accordion section ─────────────────────────────────────────────────────────
interface SectionProps {
  index: number;
  name: string;
  fields: FieldDef[];
  data: any;
  onChange: (k: string, v: any) => void;
  instanceCtx?: UseCase | null;
  extraAfter?: React.ReactNode;
}

function AccordionSection({ index, name, fields, data, onChange, instanceCtx, extraAfter }: SectionProps) {
  const [open, setOpen] = useState(index === 1);
  const mappedFields = fields.map((f) => withInstanceTerm(f, instanceCtx ?? null));
  const status = sectionStatus(fields, data);

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', background: open ? '#fff' : '#fafaf8', border: 'none', padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, minWidth: 24 }}>
          {String(index).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: T.textSecondary }}>{FRAME_SUBTITLES[name] || ''}</div>
        </div>
        <SectionPill status={status} />
        <span style={{ color: T.textMuted, fontSize: 18, lineHeight: 1, marginLeft: 8 }}>{open ? '∧' : '∨'}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${T.borderSubtle}`, padding: '24px 24px 20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px 32px',
            }}
          >
            {mappedFields.map((f, i) => (
              <div
                key={f.key}
                style={{ gridColumn: isFullWidth(f) ? '1 / -1' : 'auto' }}
              >
                <AccordionField f={f} value={data?.[f.key]} onChange={onChange} />
              </div>
            ))}
          </div>
          {extraAfter && <div style={{ marginTop: 20 }}>{extraAfter}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface AccordionModeProps {
  fields: FieldDef[];
  data: any;
  onChange: (key: string, value: any) => void;
  useCase?: UseCase;
  onApplyBuildEstimate?: (patch: Partial<BusinessCase>) => void;
  rootHandle?: FileSystemDirectoryHandle | null;
}

export function AccordionMode({ fields, data, onChange, useCase, onApplyBuildEstimate, rootHandle }: AccordionModeProps) {
  const groups = groupFields(fields);
  const isBC = fields === BC_FIELDS;
  const instanceCtx: UseCase | null = isBC ? (useCase ?? null) : (data as UseCase);
  const ucForTerm: UseCase = useCase ?? (data as UseCase);

  // UC: show total time cost inline after "Current state"
  const ttc = !isBC ? computeTotalTimeCost(data as UseCase) : null;

  let sectionIndex = 1;

  return (
    <div>
      {groups.map((g) => {
        const idx = sectionIndex++;
        const extra: React.ReactNode[] = [];

        // Total time cost after UC's "Current state" section
        if (!isBC && g.name === 'Current state' && ttc) {
          extra.push(
            <div key="ttc" style={{ padding: '10px 14px', background: T.blueBg, border: `1px solid #c0d4f5`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: T.textSecondary }}>Total time cost</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.blueText }}>{ttc.label} ({ttc.perInstance} hrs/{instanceTerm(data as UseCase)})</span>
            </div>
          );
        }

        // Build estimate AI card after BC's "Cost inputs" section
        if (isBC && g.name === 'Cost inputs' && useCase && onApplyBuildEstimate !== undefined) {
          extra.push(
            <BuildEstimateCard
              key="build-estimate"
              useCase={useCase}
              bc={data as BusinessCase}
              rootHandle={rootHandle ?? null}
              onApply={onApplyBuildEstimate}
            />
          );
        }

        return (
          <AccordionSection
            key={g.name}
            index={idx}
            name={g.name}
            fields={g.fields}
            data={data}
            onChange={onChange}
            instanceCtx={instanceCtx}
            extraAfter={extra.length > 0 ? <>{extra}</> : undefined}
          />
        );
      })}

      {/* Computed outputs section — BC only */}
      {isBC && useCase && (
        <ComputedSection
          data={data as BusinessCase}
          useCase={ucForTerm}
          index={sectionIndex}
        />
      )}
    </div>
  );
}
