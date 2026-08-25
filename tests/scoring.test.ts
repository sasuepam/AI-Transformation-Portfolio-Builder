import { describe, it, expect } from 'vitest';
import { num, computeScore, computeTotalTimeCost, computeBusinessCaseOutputs, ucGateOk, bcGateOk, guardrailSuggestions, scoreExplanation } from '../src/utils/scoring';
import type { UseCase, BusinessCase } from '../src/types/index';

const createTestCase = (overrides?: Partial<UseCase>): UseCase => ({
  id: 'test-1',
  name: 'Test Case',
  owner: 'Test Owner',
  problem: 'Test problem',
  jobs: [],
  notFor: '',
  whoAffected: '',
  numImpacted: '',
  howCounted: '',
  currentHow: '',
  resources: [],
  frequencyValue: '',
  frequencyUnit: 'per week',
  targetState: '',
  ucComplete: false,
  businessCase: {},
  bcComplete: false,
  createdAt: Date.now(),
  ...overrides,
});

const createTestBC = (overrides?: Partial<BusinessCase>): BusinessCase => ({
  pollTimes: ['30', '25', '35'],
  aiAssisted: { low: '5', high: '10' },
  sprintCounts: ['8', '10', '6'],
  sprintCadenceWeeks: '2',
  hourlyRates: ['50', '75', '100'],
  buildDays: { low: '10', high: '20' },
  monitoringHrs: { low: '1', high: '2' },
  goal: 'Reduce triage time by 50%',
  confidence: 'measured',
  ...overrides,
});

describe('Scoring utils', () => {
  describe('num()', () => {
    it('parses numeric strings', () => {
      expect(num('100')).toBe(100);
      expect(num('45.5')).toBe(45.5);
    });

    it('removes non-numeric characters', () => {
      expect(num('$100k')).toBe(100);
      expect(num('50%')).toBe(50);
    });

    it('returns 0 for non-numeric input', () => {
      expect(num('abc')).toBe(0);
      expect(num('')).toBe(0);
      expect(num(null)).toBe(0);
    });
  });

  describe('computeBusinessCaseOutputs()', () => {
    it('returns null if required inputs are missing', () => {
      expect(computeBusinessCaseOutputs({})).toBeNull();
      expect(computeBusinessCaseOutputs({ pollTimes: ['30'] })).toBeNull();
    });

    it('computes manual average from poll times', () => {
      const bc = createTestBC({ pollTimes: ['30', '40', '50'] });
      const out = computeBusinessCaseOutputs(bc);
      expect(out).not.toBeNull();
      expect(out!.manualAvg).toBe(40);
    });

    it('computes AI mid from range', () => {
      const bc = createTestBC({ aiAssisted: { low: '10', high: '20' } });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.aiMid).toBe(15);
    });

    it('computes time saved per instance', () => {
      const bc = createTestBC({
        pollTimes: ['30'],
        aiAssisted: { low: '10', high: '10' },
        sprintCounts: ['5'],
        sprintCadenceWeeks: '1',
      });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.savedPerInstance).toBe(20); // 30 - 10
    });

    it('computes instancesPerYear', () => {
      const bc = createTestBC({
        sprintCounts: ['10'],
        sprintCadenceWeeks: '2',
      });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.instancesPerYear).toBe(260); // 10 instances/sprint × 26 sprints/year
    });

    it('computes perRate for each hourly rate', () => {
      const bc = createTestBC({ hourlyRates: ['50', '100'] });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.perRate.length).toBe(2);
      expect(out!.perRate[0].rate).toBe(50);
      expect(out!.perRate[1].rate).toBe(100);
    });

    it('picks median as mid for odd number of rates', () => {
      const bc = createTestBC({ hourlyRates: ['50', '75', '100'] });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.mid!.rate).toBe(75); // index 1 of [50, 75, 100]
    });

    it('picks lower-middle as mid for even number of rates', () => {
      const bc = createTestBC({ hourlyRates: ['50', '100'] });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.mid!.rate).toBe(50); // index 0 of [50, 100]
    });

    it('computes build token cost from model and token counts', () => {
      const bc = createTestBC({
        buildModel: 'Claude Haiku 4.5', // inRate: 1, outRate: 5
        buildTokensInputM: { low: '2', high: '2' }, // mid = 2M
        buildTokensOutputM: { low: '1', high: '1' }, // mid = 1M
      });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.buildTokMid).toBe(7); // 2*1 + 1*5
    });

    it('computes running token cost per year from model, tokens, and instances', () => {
      const bc = createTestBC({
        runningModel: 'Claude Haiku 4.5', // inRate: 1, outRate: 5 per MTok
        runningTokensInputPerCall: '1000',  // 1000 tokens = 0.001M
        runningTokensOutputPerCall: '500',  // 500 tokens = 0.0005M
        // instancesPerYear = avg(sprintCounts) * 52/cadence = 8 * 26 = 208
      });
      const out = computeBusinessCaseOutputs(bc);
      // cost per instance = (1000/1e6)*1 + (500/1e6)*5 = 0.001 + 0.0025 = 0.0035
      // runningTokMid = round(0.0035 * 208 * 100) / 100 = round(0.728) = 0.73
      expect(out!.runningTokMid).toBe(0.73);
    });

    it('uses zero token cost when no model is set', () => {
      const bc = createTestBC({ buildModel: undefined, runningModel: undefined });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.buildTokMid).toBe(0);
      expect(out!.runningTokMid).toBe(0);
    });

    it('suggests measured confidence with 3+ poll and sprint data points', () => {
      const bc = createTestBC({
        pollTimes: ['30', '25', '35'],
        sprintCounts: ['8', '10', '6'],
      });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.suggestedConfidence).toBe('measured');
    });

    it('suggests estimate confidence with 1-2 data points', () => {
      const bc = createTestBC({
        pollTimes: ['30'],
        sprintCounts: ['8'],
      });
      const out = computeBusinessCaseOutputs(bc);
      expect(out!.suggestedConfidence).toBe('estimate');
    });

    it('suggests speculative confidence with no data points', () => {
      const bc2 = createTestBC({ sprintCounts: [] });
      expect(computeBusinessCaseOutputs(bc2)).toBeNull();
    });
  });

  describe('computeScore()', () => {
    it('returns null if no goal', () => {
      const uc = createTestCase({ businessCase: createTestBC({ goal: undefined }) });
      expect(computeScore(uc)).toBeNull();
    });

    it('returns null if insufficient BC data for computation', () => {
      const uc = createTestCase({ businessCase: { goal: 'Some goal' } });
      expect(computeScore(uc)).toBeNull();
    });

    it('returns null if no hourly rates (mid is null)', () => {
      const uc = createTestCase({ businessCase: createTestBC({ hourlyRates: [] }) });
      expect(computeScore(uc)).toBeNull();
    });

    it('computes score using mid rate and confidence weight', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'measured' }) });
      const score = computeScore(uc);
      expect(score).not.toBeNull();
      expect(score!.weight).toBe(1);
      expect(typeof score!.raw).toBe('number');
    });

    it('returns roi percentage', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'measured' }) });
      const score = computeScore(uc);
      expect(score!.roi).not.toBeNull();
      expect(typeof score!.roi).toBe('number');
    });

    it('returns confidence string', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'estimate' }) });
      const score = computeScore(uc);
      expect(score!.confidence).toBe('estimate');
    });

    it('applies estimate confidence weight (0.6)', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'estimate' }) });
      const score = computeScore(uc);
      expect(score!.weight).toBe(0.6);
    });

    it('applies speculative confidence weight (0.3)', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'speculative' }) });
      const score = computeScore(uc);
      expect(score!.weight).toBe(0.3);
    });
  });

  describe('scoreExplanation()', () => {
    it('returns null when score.raw is null', () => {
      const uc = createTestCase({ businessCase: createTestBC({ buildDays: { low: '0', high: '0' } }) });
      const score = computeScore(uc);
      if (score) score.raw = null;
      expect(scoreExplanation(score as any)).toBeNull();
    });

    it('includes rate, value, opex, netAnnual, capex, roi, confidence in explanation', () => {
      const uc = createTestCase({ businessCase: createTestBC({ confidence: 'measured' }) });
      const score = computeScore(uc);
      if (!score || score.raw == null) return;
      const ex = scoreExplanation(score);
      expect(ex).toContain('/hr');
      expect(ex).toContain('ROI');
      expect(ex).toContain('Confidence');
      expect(ex).toContain('measured');
    });
  });

  describe('computeTotalTimeCost()', () => {
    it('returns null if no resources', () => {
      const uc = createTestCase({ resources: [], frequencyValue: '10' });
      expect(computeTotalTimeCost(uc)).toBeNull();
    });

    it('returns null if no frequency', () => {
      const uc = createTestCase({
        resources: [{ role: 'dev', timeValue: '2', timeUnit: 'hours', people: '1' }],
        frequencyValue: '',
      });
      expect(computeTotalTimeCost(uc)).toBeNull();
    });

    it('calculates time cost with single resource', () => {
      const uc = createTestCase({
        resources: [{ role: 'dev', timeValue: '2', timeUnit: 'hours', people: '1' }],
        frequencyValue: '5',
        frequencyUnit: 'per week',
      });
      const ttc = computeTotalTimeCost(uc);
      expect(ttc).not.toBeNull();
      expect(ttc!.perInstance).toBe(2);
      expect(ttc!.hours).toBe(10);
      expect(ttc!.label).toBe('10 person-hours per week');
    });

    it('calculates time cost with multiple resources', () => {
      const uc = createTestCase({
        resources: [
          { role: 'dev', timeValue: '2', timeUnit: 'hours', people: '2' },
          { role: 'qa', timeValue: '1', timeUnit: 'hours', people: '1' },
        ],
        frequencyValue: '5',
        frequencyUnit: 'per week',
      });
      const ttc = computeTotalTimeCost(uc);
      expect(ttc!.perInstance).toBe(5); // (2*2) + 1
      expect(ttc!.hours).toBe(25);
    });

    it('converts minutes to hours correctly', () => {
      const uc = createTestCase({
        resources: [{ role: 'qa', timeValue: '30', timeUnit: 'minutes', people: '1' }],
        frequencyValue: '2',
        frequencyUnit: 'per day',
      });
      const ttc = computeTotalTimeCost(uc);
      expect(ttc!.perInstance).toBe(0.5);
      expect(ttc!.hours).toBe(1);
    });
  });

  describe('ucGateOk()', () => {
    it('returns false if no time cost', () => {
      const uc = createTestCase({ targetState: 'Solved' });
      expect(ucGateOk(uc)).toBe(false);
    });

    it('returns false if no target state', () => {
      const uc = createTestCase({
        resources: [{ role: 'dev', timeValue: '2', timeUnit: 'hours', people: '1' }],
        frequencyValue: '5',
      });
      expect(ucGateOk(uc)).toBe(false);
    });

    it('returns true if both time cost and target state present', () => {
      const uc = createTestCase({
        resources: [{ role: 'dev', timeValue: '2', timeUnit: 'hours', people: '1' }],
        frequencyValue: '5',
        targetState: 'Reduced processing time by 50%',
      });
      expect(ucGateOk(uc)).toBe(true);
    });
  });

  describe('bcGateOk()', () => {
    it('returns false if no goal', () => {
      expect(bcGateOk(createTestBC({ goal: undefined }))).toBe(false);
    });

    it('returns false if goal present but no computed outputs possible', () => {
      expect(bcGateOk({ goal: 'Some goal' })).toBe(false);
    });

    it('returns false if computable outputs exist but no hourly rates (mid is null)', () => {
      expect(bcGateOk(createTestBC({ hourlyRates: [] }))).toBe(false);
    });

    it('returns true if goal, computable outputs, and at least one rate all present', () => {
      expect(bcGateOk(createTestBC())).toBe(true);
    });
  });

  describe('guardrailSuggestions()', () => {
    it('always includes guardrail and human-in-the-loop suggestions', () => {
      const uc = createTestCase();
      const suggestions = guardrailSuggestions(uc);
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      expect(suggestions[0]).toContain('Guardrail');
    });

    it('includes data-exposure for data-related use cases', () => {
      const uc = createTestCase({ problem: 'Process customer data' });
      const suggestions = guardrailSuggestions(uc);
      expect(suggestions.some((s) => s.includes('Data exposure'))).toBe(true);
    });

    it('includes governance for decision-making use cases', () => {
      const uc = createTestCase({ problem: 'Auto-approve loan decisions' });
      const suggestions = guardrailSuggestions(uc);
      expect(suggestions.some((s) => s.includes('Governance'))).toBe(true);
    });
  });
});
