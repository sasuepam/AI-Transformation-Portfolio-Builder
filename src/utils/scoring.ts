import type { UseCase, BusinessCase, RangeValue } from '../types/index';

const CONF_WEIGHT: Record<string, number> = { measured: 1, estimate: 0.6, speculative: 0.3 };

export const MODEL_PRICING: Record<string, { inRate: number | null; outRate: number | null }> = {
  'Claude Haiku 4.5': { inRate: 1, outRate: 5 },
  'Claude Sonnet 5': { inRate: 2, outRate: 10 },
  'Claude Sonnet 4.6': { inRate: 3, outRate: 15 },
  'Claude Opus 5': { inRate: 5, outRate: 25 },
  'Claude Opus 4.8': { inRate: 5, outRate: 25 },
  'Claude Fable 5': { inRate: 10, outRate: 50 },
  'OpenAI GPT-5.6 Luna': { inRate: 0.2, outRate: 1.2 },
  'OpenAI GPT-5.6 Terra': { inRate: 2, outRate: 12 },
  'OpenAI GPT-5.6 Sol': { inRate: 4, outRate: 20 },
  'Google Gemini 2.5 Flash-Lite': { inRate: 0.1, outRate: 0.4 },
  'Google Gemini 3.6 Flash': { inRate: 0.75, outRate: 3.75 },
  'Google Gemini 3.1 Pro': { inRate: 2, outRate: 12 },
  'Meta Llama 4 Scout (hosted, rate varies by provider)': { inRate: 0.08, outRate: 0.3 },
  'Meta Llama 4 Maverick (hosted, rate varies by provider)': { inRate: 0.2, outRate: 0.6 },
  'Other (enter rate below)': { inRate: null, outRate: null },
};

export function num(v: any): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function avg(arr: any[]): number {
  const nums = (arr || []).map(num).filter((n) => n > 0);
  return nums.length ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : 0;
}

function rangeMid(r: RangeValue | undefined): number {
  return r ? (num(r.low) + num(r.high)) / 2 : 0;
}

function modelRate(modelName: string | undefined, customRateRange: RangeValue | undefined): { inRate: number; outRate: number } {
  if (!modelName) return { inRate: 0, outRate: 0 };
  const known = MODEL_PRICING[modelName];
  if (!known) return { inRate: 0, outRate: 0 };
  if (known.inRate != null) return { inRate: known.inRate, outRate: known.outRate! };
  return { inRate: num(customRateRange?.low), outRate: num(customRateRange?.high) };
}

export interface RateResult {
  rate: number;
  capex: number;
  opex: number;
  value: number;
  netAnnual: number;
  paybackMonths: number | null;
}

export interface BusinessCaseOutputs {
  manualAvg: number;
  aiMid: number;
  savedPerInstance: number;
  avgPerSprint: number;
  sprintsPerYear: number;
  savedPerYearHrs: number;
  instancesPerYear: number;
  buildTokMid: number;
  runningTokMid: number;
  perRate: RateResult[];
  mid: RateResult | null;
  suggestedConfidence: 'measured' | 'estimate' | 'speculative';
  pollN: number;
  sprintN: number;
}

export function computeBusinessCaseOutputs(bc: BusinessCase): BusinessCaseOutputs | null {
  if (!bc) return null;
  const manualAvg = avg(bc.pollTimes || []);
  const aiMid = rangeMid(bc.aiAssisted);
  const avgPerSprint = avg(bc.sprintCounts || []);
  const cadence = num(bc.sprintCadenceWeeks);
  if (!manualAvg || !aiMid || !avgPerSprint || !cadence) return null;

  const savedPerInstance = manualAvg - aiMid;
  const sprintsPerYear = 52 / cadence;
  const savedPerSprintHrs = (avgPerSprint * savedPerInstance) / 60;
  const savedPerYearHrs = Math.round(savedPerSprintHrs * sprintsPerYear * 10) / 10;
  const instancesPerYear = Math.round(avgPerSprint * sprintsPerYear);

  const buildDaysMid = rangeMid(bc.buildDays);
  const monitoringHrsMid = rangeMid(bc.monitoringHrs);

  const buildRate = modelRate(bc.buildModel, bc.buildCustomRate);
  const buildTokMid = rangeMid(bc.buildTokensInputM) * buildRate.inRate + rangeMid(bc.buildTokensOutputM) * buildRate.outRate;
  const runningRate = modelRate(bc.runningModel, bc.runningCustomRate);
  const runningCostPerInstance =
    (num(bc.runningTokensInputPerCall) / 1e6) * runningRate.inRate +
    (num(bc.runningTokensOutputPerCall) / 1e6) * runningRate.outRate;
  const runningTokMid = Math.round(runningCostPerInstance * instancesPerYear * 100) / 100;

  const rates = (bc.hourlyRates || []).map(num).filter((n) => n > 0);
  const perRate: RateResult[] = rates.map((rate) => {
    const dayRate = rate * 8;
    const capex = Math.round(buildDaysMid * dayRate + buildTokMid);
    const opex = Math.round(monitoringHrsMid * 52 * rate + runningTokMid);
    const value = Math.round(savedPerYearHrs * rate);
    const netAnnual = value - opex;
    const paybackMonths = netAnnual > 0 && capex > 0 ? Math.round((capex / netAnnual) * 12 * 10) / 10 : null;
    return { rate, capex, opex, value, netAnnual, paybackMonths };
  });

  const mid = perRate.length ? perRate[Math.floor((perRate.length - 1) / 2)] : null;

  const pollN = (bc.pollTimes || []).length;
  const sprintN = (bc.sprintCounts || []).length;
  let suggestedConfidence: 'measured' | 'estimate' | 'speculative' = 'speculative';
  if (pollN >= 3 && sprintN >= 3) suggestedConfidence = 'measured';
  else if (pollN >= 1 && sprintN >= 1) suggestedConfidence = 'estimate';

  return { manualAvg, aiMid, savedPerInstance, avgPerSprint, sprintsPerYear, savedPerYearHrs, instancesPerYear, buildTokMid, runningTokMid, perRate, mid, suggestedConfidence, pollN, sprintN };
}

export interface ScoreResult {
  raw: number | null;
  roi: number | null;
  mid: RateResult;
  weight: number;
  confidence: string;
  out: BusinessCaseOutputs;
}

export function computeScore(uc: UseCase): ScoreResult | null {
  const bc = uc.businessCase || {};
  if (!bc.goal) return null;
  const out = computeBusinessCaseOutputs(bc);
  if (!out || !out.mid) return null;
  const weight = CONF_WEIGHT[bc.confidence || ''] || 0.3;
  const roi = out.mid.capex ? Math.round((out.mid.netAnnual / out.mid.capex) * 100) : null;
  const raw = out.mid.capex ? Math.round((out.mid.netAnnual / out.mid.capex) * weight * 100) / 100 : null;
  return { raw, roi, mid: out.mid, weight, confidence: bc.confidence || 'speculative', out };
}

export interface ScoreTier {
  max: number;
  tier: string;
  color: string;
  pptxColor: string;
  note: string;
}

export const SCORE_LEGEND: ScoreTier[] = [
  { max: 0, tier: 'Negative', color: '#a33', pptxColor: 'AA3333', note: 'Costs more than it saves at the tested rate' },
  { max: 50, tier: 'Marginal', color: '#a3691c', pptxColor: 'A3691C', note: "A modest return — worth doing only if there's a strategic reason beyond the economics" },
  { max: 150, tier: 'Solid', color: '#5f6b52', pptxColor: '5F6B52', note: 'A fundable case on its own numbers' },
  { max: 400, tier: 'Strong', color: '#2d6a4f', pptxColor: '2D6A4F', note: 'A clear priority candidate' },
  { max: Infinity, tier: 'Exceptional', color: '#1d4ed8', pptxColor: '1D4ED8', note: 'Very high return — worth double-checking the inputs before trusting it fully' },
];

export function scoreTier(roi: number | null): ScoreTier | null {
  if (roi == null) return null;
  return SCORE_LEGEND.find((band) => roi < band.max) || SCORE_LEGEND[SCORE_LEGEND.length - 1];
}

export function scoreExplanation(score: ScoreResult): string | null {
  if (!score || score.raw == null) return null;
  const m = score.mid;
  const tier = scoreTier(score.roi);
  return `${tier ? `${tier.tier} — ${tier.note}. ` : ''}At $${m.rate}/hr (median of the rates tested): benefit ~$${m.value}/yr, running cost ~$${m.opex}/yr, net annual return ~$${m.netAnnual}/yr against a build cost of ~$${m.capex}. ROI ~${score.roi}%${m.paybackMonths != null ? `, payback in ~${m.paybackMonths} months` : ', payback not reached at this rate'}. Confidence: ${score.confidence} (×${score.weight} weight). The raw score (${score.raw}) is ROI × confidence weight — it's a ranking number for sorting the portfolio, not a percentage or currency figure on its own.`;
}

export interface TimeCostResult {
  hours: number;
  label: string;
  perInstance: number;
}

const TIME_UNIT_HOURS: Record<string, number> = { minutes: 1 / 60, hours: 1 };

export function computeTotalTimeCost(data: UseCase): TimeCostResult | null {
  const resources = Array.isArray(data.resources) ? data.resources : [];
  const f = num(data.frequencyValue);
  if (!resources.length || !f) return null;
  const perInstance = resources.reduce((sum, r) => {
    const hrs = num(r.timeValue) * (TIME_UNIT_HOURS[r.timeUnit] || 1);
    return sum + hrs * (num(r.people) || 1);
  }, 0);
  if (!perInstance) return null;
  const total = Math.round(perInstance * f * 100) / 100;
  const period = data.frequencyUnit || 'per week';
  return { hours: total, label: `${total} person-hours ${period}`, perInstance: Math.round(perInstance * 100) / 100 };
}

export function ucGateOk(uc: UseCase): boolean {
  return !!(computeTotalTimeCost(uc) && uc.targetState);
}

export function bcGateOk(bc: BusinessCase): boolean {
  const out = computeBusinessCaseOutputs(bc);
  return !!(bc && bc.goal && out && out.mid);
}

export function instanceTerm(useCase: UseCase, plural?: boolean): string {
  const label = (useCase?.instanceLabel?.trim()) || 'instance';
  if (!plural) return label;
  return /[sxz]$|[cs]h$/i.test(label) ? `${label}es` : `${label}s`;
}

export function deriveQualitativeBenefits(useCase: UseCase): string[] {
  const benefits = (useCase.keyBenefits || []).slice();
  const addressed = (useCase.painPoints || []).map((p) => `Addresses: ${p}`);
  return [...benefits, ...addressed];
}

export interface CumulativeRow {
  year: number;
  cumCapex: number;
  cumOpex: number;
  cumSavings: number;
  cumNet: number;
  cumRoi: number | null;
}

export function computeCumulative(rateFigures: RateResult, years?: number): CumulativeRow[] {
  const n = years || 3;
  const rows: CumulativeRow[] = [];
  for (let y = 1; y <= n; y++) {
    const cumOpex = Math.round(rateFigures.opex * y);
    const cumSavings = Math.round(rateFigures.value * y);
    const cumCapex = rateFigures.capex;
    const cumNet = cumSavings - cumOpex - cumCapex;
    const cumRoi = cumCapex ? Math.round((cumNet / cumCapex) * 100) : null;
    rows.push({ year: y, cumCapex, cumOpex, cumSavings, cumNet, cumRoi });
  }
  return rows;
}

export function guardrailSuggestions(uc: UseCase): string[] {
  const bc = uc.businessCase || {};
  const text = `${uc.problem || ''} ${(uc.jobs || []).join(' ')} ${bc.argument || ''}`.toLowerCase();
  const items = ['Guardrail — define what this system may draft or recommend versus what it may decide unilaterally.'];
  if (text.match(/data|log|record|ticket|customer|personal/)) {
    items.push('Data exposure — identify what data this touches and whether it crosses an existing security or compliance boundary.');
  }
  items.push('Human in the loop — name the point in the process where a person reviews before anything becomes final.');
  items.push('Failure mode — describe what happens if the output is wrong, and how visible or reversible that is.');
  if (text.match(/decision|approve|reject|score|assess|triage|risk/)) {
    items.push('Governance relevance — this use case may involve automated assessment; check whether it needs a heavier documentation trail.');
  }
  return items;
}
