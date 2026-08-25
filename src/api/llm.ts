import type { UseCase, BusinessCase, GuardrailItem } from '../types/index';
export type { GuardrailItem };

export interface BuildAndTokenEstimate {
  buildDaysLow: number;
  buildDaysHigh: number;
  buildTokensInputMLow: number;
  buildTokensInputMHigh: number;
  buildTokensOutputMLow: number;
  buildTokensOutputMHigh: number;
  runningTokensInputPerCall: number;
  runningTokensOutputPerCall: number;
  rationale: string;
}


export async function suggestBuildAndTokenEstimate(
  apiKey: string,
  useCase: UseCase,
  bc: BusinessCase,
): Promise<BuildAndTokenEstimate> {
  const proposalText = [
    useCase.problem ? `Problem: ${useCase.problem}` : '',
    (useCase.painPoints || []).length ? `Known pain points: ${useCase.painPoints!.join('; ')}` : '',
    (useCase.processOutline || []).length ? `Process outline: ${useCase.processOutline!.join('; ')}` : '',
    (useCase.keyBenefits || []).length ? `Key benefits: ${useCase.keyBenefits!.join('; ')}` : '',
    (useCase.risks || []).length ? `Risks: ${useCase.risks!.join('; ')}` : '',
    (useCase.resources || []).length
      ? `Resources involved today: ${useCase.resources.map((r) => r.role).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!proposalText.trim()) {
    throw new Error(
      "Fill in the Proposal frame on the use case board first — there's nothing here yet to review.",
    );
  }

  const buildModel = bc.buildModel || 'an unspecified model';
  const runningModel = bc.runningModel || 'an unspecified model';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are scoping the build for the AI solution described below, assuming an AI-assisted build (e.g. Claude Code), not a fully manual build.

${proposalText}

Estimate FOUR things, being conservative and using the proposal's own scope and complexity to judge them — don't default to generic round numbers:
1. Engineer-days to build this, low–high.
2. Build-phase token consumption for "${buildModel}" — the AI usage during development/testing itself (in millions of tokens), input and output, low–high. Longer or more complex builds (more process steps, more integration points) should mean more tokens; a heavier/more capable model does not by itself mean more tokens — reason about the actual work, not the model name.
3. Running-phase token consumption for "${runningModel}" per single ${useCase.instanceLabel || 'instance'} once in production (input and output tokens, as plain numbers, not millions) — based on how much context this specific use case likely needs to pass in and how much output a useful response requires.
4. A one-sentence rationale covering both the day estimate and the token estimates.

Respond with ONLY JSON, no other text: {"buildDaysLow": <number>, "buildDaysHigh": <number>, "buildTokensInputMLow": <number>, "buildTokensInputMHigh": <number>, "buildTokensOutputMLow": <number>, "buildTokensOutputMHigh": <number>, "runningTokensInputPerCall": <number>, "runningTokensOutputPerCall": <number>, "rationale": "<one sentence>"}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API request failed (${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b: any) => b.text || '').join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse an estimate from the response.');
  const p = JSON.parse(match[0]);
  const required = [
    'buildDaysLow', 'buildDaysHigh',
    'buildTokensInputMLow', 'buildTokensInputMHigh',
    'buildTokensOutputMLow', 'buildTokensOutputMHigh',
    'runningTokensInputPerCall', 'runningTokensOutputPerCall',
  ];
  if (required.some((k) => typeof p[k] !== 'number')) {
    throw new Error("Response didn't include a complete set of estimates.");
  }
  return p as BuildAndTokenEstimate;
}

export async function suggestGuardrails(apiKey: string, useCase: UseCase): Promise<GuardrailItem[]> {
  const context = [
    useCase.problem ? `Problem: ${useCase.problem}` : '',
    (useCase.painPoints || []).length ? `Known pain points: ${useCase.painPoints!.join('; ')}` : '',
    useCase.whoAffected ? `Who's affected: ${useCase.whoAffected}` : '',
    (useCase.processOutline || []).length ? `Process outline: ${useCase.processOutline!.join('; ')}` : '',
    (useCase.keyBenefits || []).length ? `Key benefits: ${useCase.keyBenefits!.join('; ')}` : '',
    (useCase.risks || []).length ? `Risks already identified: ${useCase.risks!.join('; ')}` : '',
    useCase.businessCase?.argument ? `Business argument: ${useCase.businessCase.argument}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!context.trim()) {
    throw new Error(
      "Fill in the problem statement and Proposal frame on the use case board first — there's nothing case-specific to reason about yet.",
    );
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Read this specific AI use case and write ONE sentence of guidance for each of these five categories, grounded in the actual details given — name the actual data, actual decision, actual failure mode this case raises, not a generic restatement of the category name.

${context}

Categories:
1. Guardrail — what should this system be allowed to draft/recommend vs. decide unilaterally, specific to what this case's proposal describes it doing.
2. Data exposure — what specific data this case touches (name it, based on what's described) and what boundary it might cross.
3. Human in the loop — the specific point in THIS case's own process outline where a person should review, if named, or a specific point to define if not.
4. Failure mode — what specifically goes wrong for this case if the AI's output is wrong, and how visible/reversible that specific failure is.
5. Governance relevance — whether the specific decision this case makes needs a heavier documentation trail, and why given what it's actually deciding.

Respond with ONLY JSON, no other text: {"items": [{"category": "Guardrail", "text": "..."}, {"category": "Data exposure", "text": "..."}, {"category": "Human in the loop", "text": "..."}, {"category": "Failure mode", "text": "..."}, {"category": "Governance relevance", "text": "..."}]}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API request failed (${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b: any) => b.text || '').join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse guidance from the response.');
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error("Response didn't include usable guidance.");
  }
  return parsed.items as GuardrailItem[];
}
