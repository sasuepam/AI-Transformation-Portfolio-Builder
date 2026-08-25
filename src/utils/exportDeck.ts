import PptxGenJS from 'pptxgenjs';
import type { UseCase } from '../types/index';
import { computeScore, scoreTier, guardrailSuggestions, computeCumulative, deriveQualitativeBenefits } from './scoring';

export function exportDeck(useCase: UseCase): void {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const ink = '2C2C2A', muted = '5F5E5A', cream = 'F4F2EA', line = 'E6E3D8';

  // --- Slide 1: Use case ---
  const s1 = pptx.addSlide();
  s1.background = { color: 'FFFFFF' };
  s1.addText(useCase.name || 'Untitled use case', { x: 0.5, y: 0.35, w: 9, h: 0.7, fontSize: 26, bold: true, color: ink });
  s1.addText(`Owner: ${useCase.owner || '—'}`, { x: 0.5, y: 1.0, w: 9, h: 0.3, fontSize: 11, color: muted });

  const s1Body: PptxGenJS.TextProps[] = [];
  if (useCase.problem) {
    s1Body.push({ text: 'Problem', options: { bold: true, breakLine: true, fontSize: 13 } });
    s1Body.push({ text: useCase.problem, options: { breakLine: true, fontSize: 12, color: muted, paraSpaceAfter: 10 } });
  }
  if ((useCase.painPoints || []).length) {
    s1Body.push({ text: 'Known pain points', options: { bold: true, breakLine: true, fontSize: 13 } });
    useCase.painPoints!.forEach((p) => s1Body.push({ text: p, options: { bullet: true, breakLine: true, fontSize: 12, color: muted } }));
    s1Body.push({ text: '', options: { breakLine: true, fontSize: 4 } });
  }
  if ((useCase.keyBenefits || []).length) {
    s1Body.push({ text: 'Key benefits', options: { bold: true, breakLine: true, fontSize: 13 } });
    useCase.keyBenefits!.forEach((b) => s1Body.push({ text: b, options: { bullet: true, breakLine: true, fontSize: 12, color: muted } }));
    s1Body.push({ text: '', options: { breakLine: true, fontSize: 4 } });
  }
  if (useCase.targetState) {
    s1Body.push({ text: 'Target state', options: { bold: true, breakLine: true, fontSize: 13 } });
    s1Body.push({ text: useCase.targetState, options: { breakLine: true, fontSize: 12, color: muted } });
  }
  if (s1Body.length) s1.addText(s1Body, { x: 0.5, y: 1.5, w: 9, h: 4.8, valign: 'top' });

  // --- Slide 2: Business case ---
  const s2 = pptx.addSlide();
  s2.background = { color: 'FFFFFF' };
  s2.addText('Business Case', { x: 0.5, y: 0.35, w: 9, h: 0.7, fontSize: 26, bold: true, color: ink });

  const score = computeScore(useCase);
  if (score && score.raw != null) {
    const tier = scoreTier(score.roi);
    const m = score.mid;
    const cum3 = computeCumulative(m, 3);
    const cumRoi3 = cum3[2] ? cum3[2].cumRoi : null;
    s2.addText(`${score.roi}%`, { x: 0.5, y: 1.15, w: 3, h: 0.9, fontSize: 40, bold: true, color: tier ? tier.pptxColor : ink });
    s2.addText(tier ? tier.tier.toUpperCase() : '', { x: 0.5, y: 1.9, w: 3, h: 0.35, fontSize: 12, bold: true, color: tier ? tier.pptxColor : muted });
    s2.addText('ROI at the median rate tested', { x: 0.5, y: 2.25, w: 3.5, h: 0.4, fontSize: 10, color: muted });

    const stats: [string, string][] = [
      ['Benefit / yr', `$${m.value}`],
      ['Running cost / yr', `$${m.opex}`],
      ['Net return / yr', `$${m.netAnnual}`],
      ['Build cost', `$${m.capex}`],
      ['Payback', m.paybackMonths != null ? `${m.paybackMonths} mo` : 'not reached'],
      ['Confidence', `${score.confidence || 'not set'} (×${score.weight})`],
      ['3-yr cumulative ROI', cumRoi3 != null ? `${cumRoi3}%` : 'n/a'],
    ];
    const sx = 4.2, sy = 1.15;
    stats.forEach(([label, val], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = sx + col * 2.6, y = sy + row * 0.85;
      s2.addShape('rect' as PptxGenJS.SHAPE_NAME, { x, y, w: 2.4, h: 0.7, fill: { color: cream }, line: { color: line, width: 0.75 } });
      s2.addText(label, { x: x + 0.1, y: y + 0.06, w: 2.2, h: 0.25, fontSize: 9, color: muted });
      s2.addText(val, { x: x + 0.1, y: y + 0.3, w: 2.2, h: 0.35, fontSize: 13, bold: true, color: ink });
    });
  } else {
    s2.addText('Not yet scored — fill in the business case\'s raw inputs and a goal to compute this.', { x: 0.5, y: 1.3, w: 9, h: 0.6, fontSize: 13, color: muted, italic: true });
  }

  const bc = useCase.businessCase || {};
  const s2Body: PptxGenJS.TextProps[] = [];
  if (bc.argument) {
    s2Body.push({ text: 'Why this deserves resources', options: { bold: true, breakLine: true, fontSize: 13 } });
    s2Body.push({ text: bc.argument, options: { breakLine: true, fontSize: 12, color: muted, paraSpaceAfter: 10 } });
  }
  if (bc.goal) {
    s2Body.push({ text: 'Goal', options: { bold: true, breakLine: true, fontSize: 13 } });
    s2Body.push({ text: bc.goal, options: { breakLine: true, fontSize: 12, color: muted, paraSpaceAfter: 10 } });
  }
  if ((bc.stakeholders || []).length) {
    s2Body.push({ text: 'Stakeholders', options: { bold: true, breakLine: true, fontSize: 13 } });
    bc.stakeholders!.forEach((s) => s2Body.push({ text: s, options: { bullet: true, breakLine: true, fontSize: 12, color: muted } }));
    s2Body.push({ text: '', options: { breakLine: true, fontSize: 4 } });
  }
  const qualBenefits = deriveQualitativeBenefits(useCase);
  if (qualBenefits.length) {
    s2Body.push({ text: 'Qualitative benefits', options: { bold: true, breakLine: true, fontSize: 13 } });
    qualBenefits.forEach((b) => s2Body.push({ text: b, options: { bullet: true, breakLine: true, fontSize: 12, color: muted } }));
  }
  if (s2Body.length) s2.addText(s2Body, { x: 0.5, y: 3.3, w: 9, h: 1.9, valign: 'top' });

  // --- Slide 3: Things to keep in mind ---
  const s3 = pptx.addSlide();
  s3.background = { color: 'FFFFFF' };
  s3.addText('Things to Keep in Mind', { x: 0.5, y: 0.35, w: 9, h: 0.7, fontSize: 26, bold: true, color: ink });

  const guidance: Array<{ heading: string; text: string }> =
    useCase.caseGuardrails && useCase.caseGuardrails.length
      ? useCase.caseGuardrails.map((it) => ({ heading: it.category, text: it.text }))
      : guardrailSuggestions(useCase).map((s) => {
          const parts = s.split(' — ');
          return { heading: parts[0], text: parts.slice(1).join(' — ') };
        });

  const s3Body: PptxGenJS.TextProps[] = [];
  guidance.forEach((g) => {
    s3Body.push({ text: g.heading, options: { bold: true, breakLine: true, fontSize: 13, color: ink } });
    s3Body.push({ text: g.text, options: { breakLine: true, fontSize: 12, color: muted, paraSpaceAfter: 12 } });
  });
  if (s3Body.length) s3.addText(s3Body, { x: 0.5, y: 1.3, w: 9, h: 5, valign: 'top' });

  s3.addText(
    useCase.caseGuardrails && useCase.caseGuardrails.length
      ? 'Generated for this specific case by AI — review before relying on it.'
      : 'Generic guidance — no case-specific AI guidance has been generated for this use case yet.',
    { x: 0.5, y: 6.4, w: 9, h: 0.3, fontSize: 9, italic: true, color: muted },
  );

  const safeName = (useCase.name || 'use-case').replace(/[^a-z0-9\- ]/gi, '').trim() || 'use-case';
  pptx.writeFile({ fileName: `${safeName} - Pitch Deck.pptx` });
}
