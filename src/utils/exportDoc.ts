import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx';
import type { UseCase } from '../types/index';
import {
  computeBusinessCaseOutputs, computeScore, scoreTier,
  guardrailSuggestions, instanceTerm, deriveQualitativeBenefits, computeCumulative,
} from './scoring';

export async function exportDoc(useCase: UseCase): Promise<void> {
  const bc = useCase.businessCase || {};
  const out = computeBusinessCaseOutputs(bc);
  const score = computeScore(useCase);
  const tier = score ? scoreTier(score.roi) : null;
  const term = instanceTerm(useCase);
  const termPl = instanceTerm(useCase, true);

  const H = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
  const H2 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
  const P = (text: string) => new Paragraph({ children: [new TextRun({ text })], spacing: { after: 120 } });
  const bullet = (text: string) => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } });
  const warn = (text: string) => new Paragraph({
    children: [new TextRun({ text: '⚠ ' + text, italics: true, color: 'A3691C' })],
    spacing: { after: 120 },
  });

  function statTable(rows: [string, string][]): Table {
    return new Table({
      width: { size: 9200, type: WidthType.DXA },
      columnWidths: [4600, 4600],
      rows: rows.map(([label, val]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 4600, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: 'F4F2EA' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: label, color: '5F5E5A', size: 20 })] })],
          }),
          new TableCell({
            width: { size: 4600, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: String(val), bold: true, size: 22 })] })],
          }),
        ],
      })),
    });
  }

  function costBenefitTable(): Table {
    const header = ['Hourly rate', 'Benefit/yr', 'Running cost/yr', 'Net return/yr', 'Build cost', 'Payback', 'ROI'];
    const widths = [1400, 1500, 1700, 1600, 1400, 1200, 1400];
    const rows = (out ? out.perRate : []).map((r) => [
      `$${r.rate}/hr`, `$${r.value}`, `$${r.opex}`, `$${r.netAnnual}`, `$${r.capex}`,
      r.paybackMonths != null ? `${r.paybackMonths.toFixed(1)} mo` : 'n/a',
      r.capex ? `${Math.round((r.netAnnual / r.capex) * 100)}%` : 'n/a',
    ] as string[]);
    const mkRow = (cells: string[], isHeader: boolean) => new TableRow({
      children: cells.map((c, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: isHeader ? { type: ShadingType.CLEAR, fill: '2C2C2A' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: c, bold: isHeader, color: isHeader ? 'FFFFFF' : '2C2C2A', size: 18 })] })],
      })),
    });
    return new Table({
      width: { size: 10200, type: WidthType.DXA },
      columnWidths: widths,
      rows: [mkRow(header, true), ...rows.map((r) => mkRow(r, false))],
    });
  }

  function cumulativeTable(): Table {
    const colWidths = [3200, 2200, 2200, 2200];
    const total = colWidths.reduce((a, b) => a + b, 0);
    const cum = out && out.mid ? computeCumulative(out.mid, 3) : [];
    const f = out?.mid;
    if (!f || !cum.length) {
      return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: colWidths, rows: [] });
    }
    const mkCell = (text: string, isHeader: boolean, w: number) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: '2C2C2A' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader, color: isHeader ? 'FFFFFF' : '2C2C2A', size: 18 })] })],
    });
    const mkRow = (cells: [string, string, string, string], isHeader: boolean) =>
      new TableRow({ children: cells.map((c, i) => mkCell(c, isHeader, colWidths[i])) });
    const roi = (i: number) => cum[i]?.cumRoi != null ? `${cum[i].cumRoi}%` : 'n/a';
    return new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [
        mkRow(['Metric', 'Year 1', 'Year 2', 'Year 3'], true),
        mkRow(['Build cost (one-off)', `$${f.capex}`, '—', '—'], false),
        mkRow(['Running cost / yr', `$${f.opex}`, `$${f.opex}`, `$${f.opex}`], false),
        mkRow(['Cost saving / yr', `$${f.value}`, `$${f.value}`, `$${f.value}`], false),
        mkRow(['Cumulative ROI', roi(0), roi(1), roi(2)], false),
      ],
    });
  }

  const guidance = useCase.caseGuardrails && useCase.caseGuardrails.length
    ? useCase.caseGuardrails.map((it) => `${it.category} — ${it.text}`)
    : guardrailSuggestions(useCase);

  const termPlCap = termPl.charAt(0).toUpperCase() + termPl.slice(1);

  const children = [
    new Paragraph({ children: [new TextRun({ text: useCase.name || 'Untitled use case', bold: true, size: 40 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: 'Business Case', italics: true, color: '8A8880', size: 22 })], spacing: { after: 300 } }),

    H('1. Executive Summary'),
    P(useCase.problem || 'No problem statement recorded yet.'),
    score && score.raw != null
      ? P(`Projected ROI: ${score.roi}% (${tier ? tier.tier : 'unscored'}) at $${score.mid.rate}/hr, the median rate tested, with ${score.mid.paybackMonths != null ? `a payback of roughly ${score.mid.paybackMonths} months` : 'payback not yet reached at this rate'}.`)
      : warn("This case hasn't been scored yet — fill in the business case's raw inputs and a goal to compute a business case."),

    H('2. Current State'),
    useCase.instanceLabel
      ? P(`One occurrence of this problem is referred to throughout as: "${useCase.instanceLabel}."`)
      : warn(`No occurrence label set — figures below use the generic term "instance." Consider defining what one occurrence is called (e.g. bug, ticket, case) on the use case board.`),
    statTable([
      ["How it's solved now", useCase.currentHow || '—'],
      ['Manual effort (avg)', out ? `${Math.round(out.manualAvg * 10) / 10} min/${term}` : '—'],
      [`${termPlCap} per sprint (avg)`, out ? `${Math.round(out.avgPerSprint * 10) / 10}` : '—'],
      ['Sprint cadence', bc.sprintCadenceWeeks ? `${bc.sprintCadenceWeeks} weeks` : '—'],
      ['Known pain points', (useCase.painPoints || []).join('; ') || '—'],
    ]),
    !out ? warn('Not enough raw data entered yet to compute time-saved and cost figures — poll times, AI-assisted estimate, sprint counts, and cadence are all needed.') : new Paragraph({ text: '' }),

    H('3. Proposed Solution'),
    H2('Process outline'),
    ...((useCase.processOutline || []).length ? useCase.processOutline!.map(bullet) : [P('Not yet defined.')]),
    H2('Key benefits'),
    ...((useCase.keyBenefits || []).length ? useCase.keyBenefits!.map(bullet) : [P('Not yet defined.')]),
    H2('Explicitly out of scope'),
    P(useCase.notFor || 'Not yet defined.'),

    H('4. Cost–Benefit'),
    H2('Time saved'),
    statTable([
      ['Manual effort (avg)', out ? `${Math.round(out.manualAvg * 10) / 10} min/${term}` : '—'],
      ['AI-assisted estimate (mid)', out ? `${Math.round(out.aiMid * 10) / 10} min/${term}` : '—'],
      [`Time saved per ${term}`, out ? `${Math.round(out.savedPerInstance * 10) / 10} min` : '—'],
      ['Time saved per year', out ? `~${out.savedPerYearHrs} hours (~${out.instancesPerYear} ${termPl}/yr)` : '—'],
    ]),
    H2('AI token cost (computed from model + token counts)'),
    statTable([
      [`Build phase — ${bc.buildModel || 'not selected'}`, out ? `$${Math.round(out.buildTokMid)}` : '—'],
      [`Running phase — ${bc.runningModel || 'not selected'}`, out ? `$${out.runningTokMid}/yr` : '—'],
    ]),
    H2('Cost–benefit by hourly rate'),
    out && out.perRate.length ? costBenefitTable() : P('No hourly rates entered yet.'),
    new Paragraph({ text: '', spacing: { after: 160 } }),
    H2('Cumulative view (3-year, at the median rate tested)'),
    out && out.mid ? cumulativeTable() : P('No hourly rates entered yet.'),
    out && out.mid
      ? P(`Build cost is one-off — shown only in Year 1. Running cost and savings are shown as annual figures; cumulative ROI compounds across years from those same numbers. Treat this as directional, not a financial forecast.`)
      : new Paragraph({ text: '' }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
    H2('Score'),
    score && score.raw != null
      ? statTable([
          ['ROI (median rate)', `${score.roi}% — ${tier ? tier.tier : '—'}`],
          ['Confidence', `${score.confidence || 'not set'} — \xd7${score.weight} weight`],
          ['Raw score (portfolio ranking only)', `${score.raw}`],
        ])
      : P('Not yet scored.'),
    bc.confidence && bc.confidence !== 'measured'
      ? warn(`Confidence level is "${bc.confidence}" — treat these figures as pending validation, not measured fact.`)
      : new Paragraph({ text: '' }),

    H('5. Qualitative Benefits'),
    P("Value this case delivers that isn't captured in the ROI figures above — derived from the Proposal's key benefits and the problem statement's known pain points, not entered separately."),
    ...(() => {
      const qb = deriveQualitativeBenefits(useCase);
      return qb.length ? qb.map(bullet) : [warn('No key benefits or pain points recorded on the use case board yet to derive this from.')];
    })(),

    H('6. Success Metrics'),
    statTable([
      ['Goal', bc.goal || 'Not yet defined.'],
      ['Target state', useCase.targetState || 'Not yet defined.'],
    ]),
    ...((useCase.customMetrics || []).length
      ? [H2('Additional metrics'), ...useCase.customMetrics!.map((m) => bullet(`${m.name}${m.val ? `: ${m.val}` : ''}${m.measure ? ` (${m.measure})` : ''}`))]
      : []),

    H('7. Things to Keep in Mind'),
    ...guidance.map(P),
    new Paragraph({
      children: [new TextRun({
        text: useCase.caseGuardrails && useCase.caseGuardrails.length
          ? 'Generated for this specific case by AI, saved with it — review before relying on it.'
          : 'Generic guidance — no case-specific AI guidance has been generated for this use case yet.',
        italics: true, size: 18, color: '8A8880',
      })],
      spacing: { after: 120 },
    }),

    H('8. Next Steps'),
    ...[bc.evidence, bc.reviewCadence, bc.resourceConflict].filter(Boolean).map((s) => bullet(s!)),
    bc.believer ? P(`Sponsor / approver: ${bc.believer}`) : warn('No sponsor/approver named yet.'),

    H('9. Stakeholders'),
    ...((bc.stakeholders || []).length ? bc.stakeholders!.map(bullet) : [warn('No stakeholders listed yet.')]),

    H('10. Approval'),
    new Table({
      width: { size: 9200, type: WidthType.DXA },
      columnWidths: [2900, 2200, 2100, 2000],
      rows: [
        new TableRow({
          children: ['Name', 'Role', 'Decision', 'Date'].map((t) => new TableCell({
            shading: { type: ShadingType.CLEAR, fill: '2C2C2A' },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: 'FFFFFF', size: 18 })] })],
          })),
        }),
        new TableRow({
          children: [0, 1, 2, 3].map(() => new TableCell({
            margins: { top: 200, bottom: 200, left: 100, right: 100 },
            children: [new Paragraph({ text: '' })],
          })),
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (useCase.name || 'use-case').replace(/[^a-z0-9\- ]/gi, '').trim() || 'use-case';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName} - Business Case.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
