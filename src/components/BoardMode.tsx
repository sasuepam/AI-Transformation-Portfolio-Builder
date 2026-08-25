import React, { useEffect } from 'react';
import { BoardCard } from './BoardCard';
import { ComputedCard } from './ComputedCard';
import { BuildEstimateCard } from './BuildEstimateCard';
import { computeTotalTimeCost, computeBusinessCaseOutputs, instanceTerm } from '../utils/scoring';
import { groupFields, FRAME_SUBTITLES, BC_FIELDS } from '../utils/fields';
import type { FieldDef, UseCase, BusinessCase } from '../types/index';

function withInstanceTerm(f: FieldDef, ctx: UseCase | null | undefined): FieldDef {
  if (!ctx) return f;
  const singular = instanceTerm(ctx), plural = instanceTerm(ctx, true);
  const sub = (s: string) => s.replace(/\binstances\b/gi, plural).replace(/\binstance\b/gi, singular);
  return { ...f, label: sub(f.label), q: sub(f.q) };
}

interface BoardModeProps {
  title: string;
  fields: FieldDef[];
  data: any;
  onChange: (key: string, value: any) => void;
  useCase?: UseCase;
  onApplyBuildEstimate?: (patch: Partial<BusinessCase>) => void;
  rootHandle?: FileSystemDirectoryHandle | null;
}

export function BoardMode({ title, fields, data, onChange, useCase, onApplyBuildEstimate, rootHandle }: BoardModeProps) {
  const groups = groupFields(fields);
  const isBC = fields === BC_FIELDS;
  const ttc = !isBC ? computeTotalTimeCost(data as UseCase) : null;
  const bcOut = isBC ? computeBusinessCaseOutputs(data as BusinessCase) : null;
  const instanceCtx: UseCase | null = isBC ? (useCase ?? null) : (data as UseCase);
  const ucForTerm: UseCase = useCase ?? (data as UseCase);

  useEffect(() => {
    if (bcOut && !data.confidence) {
      onChange('confidence', bcOut.suggestedConfidence);
    }
  }, [bcOut?.suggestedConfidence]);

  return (
    <div style={{ background: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{title}</div>
      <div style={{ display: 'flex', gap: 28, overflowX: 'auto', paddingBottom: 12 }}>
        {groups.map((g) => (
          <div key={g.name} style={{ minWidth: 210, flex: '0 0 210px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{g.name}</div>
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 10 }}>{FRAME_SUBTITLES[g.name] || ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.fields.map((f) => (
                <BoardCard key={f.key} f={withInstanceTerm(f, instanceCtx)} value={data[f.key]} onChange={onChange} />
              ))}
              {g.name === 'Current state' && (
                <ComputedCard
                  label="Total time cost"
                  text={ttc ? `${ttc.label} (${ttc.perInstance} hrs/${instanceTerm(data as UseCase)})` : 'Add resources and frequency to calculate'}
                />
              )}
              {isBC && g.name === 'Cost inputs' && useCase && onApplyBuildEstimate !== undefined && (
                <BuildEstimateCard
                  useCase={useCase}
                  bc={data as BusinessCase}
                  rootHandle={rootHandle ?? null}
                  onApply={onApplyBuildEstimate}
                />
              )}
            </div>
          </div>
        ))}

        {isBC && (
          <div style={{ minWidth: 210, flex: '0 0 210px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Computed outputs</div>
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 10 }}>{FRAME_SUBTITLES['Computed outputs']}</div>
            {useCase && (
              <div style={{ fontSize: 10, color: useCase.instanceLabel ? '#5f6b52' : '#a3691c', marginBottom: 10, lineHeight: 1.4 }}>
                {useCase.instanceLabel
                  ? `Figures below are per ${instanceTerm(useCase)} — "${useCase.instanceLabel}," as defined on the use case board.`
                  : `No occurrence label set — go to '1. Use case' and find 'What's one occurrence called?' in The problem section.`}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!bcOut ? (
                <ComputedCard
                  label="Waiting on inputs"
                  text="Fill poll times, AI-assisted estimate, sprint counts, and cadence to calculate"
                />
              ) : (
                <>
                  <ComputedCard label="Manual effort (avg)" text={`${Math.round(bcOut.manualAvg * 10) / 10} min`} />
                  <ComputedCard label="AI-assisted (mid)" text={`${Math.round(bcOut.aiMid * 10) / 10} min`} />
                  <ComputedCard label={`Time saved / ${instanceTerm(ucForTerm)}`} text={`${Math.round(bcOut.savedPerInstance * 10) / 10} min`} />
                  <ComputedCard label={`Avg ${instanceTerm(ucForTerm, true)} / sprint`} text={`${Math.round(bcOut.avgPerSprint * 10) / 10}`} />
                  <ComputedCard label="Time saved / year" text={`~${bcOut.savedPerYearHrs} hours (~${bcOut.instancesPerYear} ${instanceTerm(ucForTerm, true)}/yr)`} />
                  <ComputedCard label="Build-phase token cost" text={`$${Math.round(bcOut.buildTokMid)} (from model + token count)`} />
                  <ComputedCard label={`Running token cost / year`} text={`$${bcOut.runningTokMid} (from model + token count × ${instanceTerm(ucForTerm, true)}/yr)`} />
                  <ComputedCard
                    label="Suggested confidence"
                    text={`${bcOut.suggestedConfidence} (based on ${bcOut.pollN} poll responses, ${bcOut.sprintN} sprints of data — logic can measure sample size, not data quality; confirm or override in the Expected return frame)`}
                  />
                  {bcOut.perRate.length === 0 && (
                    <ComputedCard label="Value by rate" text="Add at least one hourly rate to calculate value, cost, and payback" />
                  )}
                  {bcOut.perRate.map((r) => (
                    <ComputedCard
                      key={r.rate}
                      label={`At $${r.rate}/hr`}
                      text={`Value: $${r.value}/yr · Build cost: $${r.capex} · Running cost: $${r.opex}/yr · Payback: ${r.paybackMonths != null ? r.paybackMonths + ' months' : 'n/a'}`}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
