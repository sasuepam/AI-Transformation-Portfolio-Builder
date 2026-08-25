export const SCHEMA_VERSION = 3;

export interface GuardrailItem {
  category: string;
  text: string;
}

export interface Resource {
  role: string;
  timeValue: string;
  timeUnit: 'minutes' | 'hours';
  people: string;
}

export interface RangeValue {
  low: string;
  high: string;
}

export interface CustomMetric {
  name: string;
  val: string;
  measure: string;
}

export interface BusinessCase {
  argument?: string;
  believer?: string;
  stakeholders?: string[];
  evidence?: string;
  pollTimes?: string[];
  aiAssisted?: RangeValue;
  sprintCounts?: string[];
  sprintCadenceWeeks?: string;
  hourlyRates?: string[];
  buildDays?: RangeValue;
  monitoringHrs?: RangeValue;
  resourceConflict?: string;
  buildModel?: string;
  buildCustomRate?: RangeValue;
  buildTokensInputM?: RangeValue;
  buildTokensOutputM?: RangeValue;
  runningModel?: string;
  runningCustomRate?: RangeValue;
  runningTokensInputPerCall?: string;
  runningTokensOutputPerCall?: string;
  confidence?: 'measured' | 'estimate' | 'speculative';
  goal?: string;
  reviewCadence?: string;
  customMetrics?: CustomMetric[];
}

export interface UseCase {
  id: string;
  name?: string;
  owner?: string;
  pipeline?: string;
  problem?: string;
  instanceLabel?: string;
  jobs: string[];
  painPoints?: string[];
  notFor?: string;
  whoAffected?: string;
  numImpacted?: string;
  howCounted?: string;
  currentHow?: string;
  resources: Resource[];
  frequencyValue?: string;
  frequencyUnit?: string;
  targetState?: string;
  processOutline?: string[];
  keyBenefits?: string[];
  risks?: string[];
  customMetrics?: CustomMetric[];
  ucComplete: boolean;
  businessCase: BusinessCase;
  bcComplete: boolean;
  caseGuardrails?: GuardrailItem[] | null;
  createdAt: number;
}


export interface FieldDef {
  key: string;
  label: string;
  group: string;
  q: string;
  type?: 'list' | 'resources' | 'select' | 'number' | 'numlist' | 'range' | 'custom';
  options?: string[];
}
