import type { FieldDef } from '../types/index';
import { MODEL_PRICING } from './scoring';

export const UC_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Use case name', group: 'Header', q: 'What do you want to call this use case?' },
  { key: 'owner', label: 'Owner', group: 'Header', q: 'Who owns this use case?' },
  { key: 'pipeline', label: 'Pipeline category', group: 'Header', type: 'select', options: ['Requirements', 'API design', 'Development', 'Validation', 'Governance', 'Other'], q: 'Which stage of the development pipeline does this use case belong to?' },
  { key: 'problem', label: 'Problem it solves', group: 'The problem', q: 'In one sentence, what problem does this solve — without mentioning the tool?' },
  { key: 'instanceLabel', label: "What's one occurrence called?", group: 'The problem', q: 'What do you call one occurrence of this — a bug, a ticket, a case, a call? This label is used throughout the tool\'s outputs instead of the generic word "instance."' },
  { key: 'jobs', label: 'Jobs to be done', group: 'The problem', type: 'list', q: 'What is one job to be done — an underlying goal the person is trying to accomplish? Add as many as apply.' },
  { key: 'painPoints', label: 'Known pain points', group: 'The problem', type: 'list', q: "What's a known pain point with how this works today? Add as many as apply." },
  { key: 'notFor', label: 'Explicitly not trying to do', group: 'The problem', q: 'What is this use case explicitly not trying to solve?' },
  { key: 'whoAffected', label: 'Who has this problem today', group: "Who's affected", q: 'Who has this problem today?' },
  { key: 'numImpacted', label: 'Number of people impacted', group: "Who's affected", q: 'Roughly how many people are impacted?' },
  { key: 'howCounted', label: 'How was this number arrived at', group: "Who's affected", q: 'How did you arrive at that number — estimate, headcount, survey?' },
  { key: 'currentHow', label: "How it's solved now", group: 'Current state', q: 'How is this solved today, without AI?' },
  { key: 'resources', label: 'Resources engaged per instance', group: 'Current state', type: 'resources', q: 'Add each resource or role engaged in one instance, with the time each spends and how many people in that role.' },
  { key: 'frequencyValue', label: 'Frequency count', group: 'Current state', type: 'number', q: 'How many times does this happen per period — just the number?' },
  { key: 'frequencyUnit', label: 'Frequency period', group: 'Current state', type: 'select', options: ['per day', 'per week', 'per sprint', 'per month'], q: 'Per what period — day, week, sprint, or month?' },
  { key: 'targetState', label: 'What solved looks like', group: 'Target state', q: 'What does solved look like — the specific outcome or metric?' },
  { key: 'processOutline', label: 'Process outline', group: 'Proposal', type: 'list', q: 'Add one step of the proposed process at a time — trigger, what the AI does, what stays human.' },
  { key: 'keyBenefits', label: 'Key benefits', group: 'Proposal', type: 'list', q: 'Add one key benefit of the proposed solution at a time.' },
  { key: 'risks', label: 'Risks & considerations', group: 'Proposal', type: 'list', q: 'Add one risk or consideration at a time — over-reliance, false positives, dependency on unmeasured estimates, etc.' },
  { key: 'customMetrics', label: 'Additional metrics', group: 'Additional metrics', type: 'custom', q: "Add any other metric specific to this use case — a name, a value, and how it's measured." },
];

export const BC_FIELDS: FieldDef[] = [
  { key: 'argument', label: 'Why this deserves resources now', group: 'The argument', q: 'Why does this deserve resources right now?' },
  { key: 'believer', label: 'Who has to keep believing this is worth it', group: 'The argument', q: 'Name the actual stakeholder who has to keep believing this is worth it.' },
  { key: 'stakeholders', label: 'Stakeholders', group: 'The argument', type: 'list', q: 'Add each stakeholder for this business case — name and role, e.g. "Jane Smith, Delivery Manager." Add as many as apply.' },
  { key: 'evidence', label: 'Evidence they need', group: 'The argument', q: 'What evidence do they need to keep believing it — and what would make them pull support?' },
  { key: 'pollTimes', label: 'Manual effort poll (minutes, one entry per response)', group: 'Time & effort data', type: 'numlist', q: 'Add each poll response — how many minutes manual effort takes, one number per person asked.' },
  { key: 'aiAssisted', label: 'AI-assisted time estimate (minutes, low–high)', group: 'Time & effort data', type: 'range', q: "What's the estimated AI-assisted time range, in minutes?" },
  { key: 'sprintCounts', label: 'Instances per sprint (list across observed sprints)', group: 'Time & effort data', type: 'numlist', q: 'Add the instance count for each sprint you have data for.' },
  { key: 'sprintCadenceWeeks', label: 'Sprint cadence (weeks)', group: 'Time & effort data', type: 'number', q: 'How many weeks is one sprint?' },
  { key: 'hourlyRates', label: 'Hourly rates to test (cost–benefit range)', group: 'Cost inputs', type: 'numlist', q: 'Add each hourly rate you want the value calculated against — a low, mid, and high guess is enough.' },
  { key: 'buildDays', label: 'Build effort (days, low–high)', group: 'Cost inputs', type: 'range', q: 'How many engineer-days will this take to build, low to high?' },
  { key: 'monitoringHrs', label: 'Ongoing monitoring (hrs/week, low–high)', group: 'Cost inputs', type: 'range', q: 'How many hours a week of ongoing monitoring or maintenance, low to high?' },
  { key: 'resourceConflict', label: 'Resourcing conflict', group: 'Cost inputs', q: 'Does this compete with another initiative for the same infrastructure, attention, or budget?' },
  { key: 'buildModel', label: 'Model — build phase', group: 'AI token cost', type: 'select', options: Object.keys(MODEL_PRICING), q: 'Which model for build-phase token cost — pick a model. Meta Llama rates vary by hosting provider; the figure shown is a representative rate, not a fixed one.' },
  { key: 'buildCustomRate', label: "Build model custom rate ($ in/out per MTok, if 'Other')", group: 'AI token cost', type: 'range', q: "If you picked 'Other' above, enter the input/output rate per million tokens." },
  { key: 'buildTokensInputM', label: 'Build-phase input tokens (millions, low–high)', group: 'AI token cost', type: 'range', q: 'Roughly how many million input tokens will the build phase consume, low to high?' },
  { key: 'buildTokensOutputM', label: 'Build-phase output tokens (millions, low–high)', group: 'AI token cost', type: 'range', q: 'Roughly how many million output tokens will the build phase consume, low to high?' },
  { key: 'runningModel', label: 'Model — running', group: 'AI token cost', type: 'select', options: Object.keys(MODEL_PRICING), q: 'Which model will run in production — pick a model. Meta Llama rates vary by hosting provider; the figure shown is a representative rate, not a fixed one.' },
  { key: 'runningCustomRate', label: "Running model custom rate ($ in/out per MTok, if 'Other')", group: 'AI token cost', type: 'range', q: "If you picked 'Other' above, enter the input/output rate per million tokens." },
  { key: 'runningTokensInputPerCall', label: 'Running input tokens per instance', group: 'AI token cost', type: 'number', q: 'Roughly how many input tokens per instance once running?' },
  { key: 'runningTokensOutputPerCall', label: 'Running output tokens per instance', group: 'AI token cost', type: 'number', q: 'Roughly how many output tokens per instance once running?' },
  { key: 'confidence', label: 'Confidence level', group: 'Expected return', q: 'Pre-filled from data volume (see Computed outputs) — override if you know the data quality does not match.', type: 'select', options: ['measured', 'estimate', 'speculative'] },
  { key: 'goal', label: 'Goal', group: 'Goal', q: 'What does worth-continuing look like for this case, specific and checkable?' },
  { key: 'reviewCadence', label: 'Review cadence', group: 'Goal', q: 'When should this business case be re-argued, not just re-read?' },
  { key: 'customMetrics', label: 'Additional metrics', group: 'Additional metrics', type: 'custom', q: "Add any other metric relevant to this case — a name, a value, and how it's measured. Not included in the score automatically." },
];

export const FRAME_SUBTITLES: Record<string, string> = {
  Header: 'Identify this use case',
  'The problem': "What we're solving, and what we're not",
  "Who's affected": 'Scope of impact',
  'Current state': 'The baseline picture',
  'Target state': 'Where we want to land',
  Proposal: 'How the AI solution actually works',
  'The argument': 'Why this deserves resources',
  'Time & effort data': 'Raw numbers — the tool computes the rest',
  'Cost inputs': 'Raw numbers — the tool computes the rest',
  'AI token cost': 'Pick a model — cost is computed, not typed in',
  'Computed outputs': 'Everything below is derived, not typed in',
  'Expected return': 'How sure we are, overall',
  Goal: 'What worth-continuing looks like',
  'Additional metrics': "Anything specific to this case that doesn't fit the standard fields",
};

export function groupFields(fields: FieldDef[]): Array<{ name: string; fields: FieldDef[] }> {
  const groups: Array<{ name: string; fields: FieldDef[] }> = [];
  for (const f of fields) {
    let g = groups.find((g) => g.name === f.group);
    if (!g) {
      g = { name: f.group, fields: [] };
      groups.push(g);
    }
    g.fields.push(f);
  }
  return groups;
}
