# AI Transform Case Builder

A local-first, client-side application for documenting, scoring, and managing AI transformation use cases and business cases.

## Setup

```bash
npm install
```

## Development

Run the dev server:

```bash
npm run dev
```

This opens the app at `http://localhost:5173`. Changes are hot-reloaded.

## Testing

Run tests:

```bash
npm run test
```

Run tests with UI:

```bash
npm run test:ui
```

## Building

Create a production build:

```bash
npm run build
```

This outputs a `dist/` folder. Share the entire `dist` folder with others — they can download it, unzip it, and open `index.html` in Chrome or Edge.

## Architecture

- **No backend** — all data is saved to the user's computer using the File System Access API
- **TypeScript** — type-safe scoring, gating, and calculation logic
- **Modular components** — split into `components/`, `utils/`, `api/` for maintainability
- **Tests** — unit tests for scoring, gating, and file I/O

### Key files

- `src/utils/scoring.ts` — scoring formula, time-cost calculation, gating logic
- `src/utils/fields.ts` — use case and business case field definitions
- `src/api/filesystem.ts` — File System Access API integration
- `src/App.tsx` — main app component

### Data model

Each use case is stored as its own JSON file at `<project>/cases/<id>.json` inside whatever folder the user chooses at runtime. Nothing is sent to any server.

Key fields on `UseCase`: `id`, `name`, `owner`, `pipeline`, `problem`, `instanceLabel`, `jobs[]`, `painPoints[]`, `resources[]`, `frequencyValue`, `frequencyUnit`, `targetState`, `processOutline[]`, `keyBenefits[]`, `risks[]`, `ucComplete`, `businessCase{}`, `bcComplete`, `caseGuardrails[]`, `createdAt`.

Key fields on `BusinessCase`: `argument`, `believer`, `stakeholders[]`, `evidence`, `pollTimes[]`, `aiAssisted`, `sprintCounts[]`, `sprintCadenceWeeks`, `hourlyRates[]`, `buildDays`, `monitoringHrs`, `buildModel`, `buildTokensInputM`, `buildTokensOutputM`, `runningModel`, `runningTokensInputPerCall`, `runningTokensOutputPerCall`, `confidence`, `goal`, `reviewCadence`.

### API key

The optional AI features (build estimate and guardrail suggestions) use the Anthropic API directly from the browser. The key can be entered per session or saved to `api-key.local.txt` in the chosen project root — this file is gitignored so it is never accidentally committed.

## Browser support

Requires Chrome, Edge, or any Chromium-based browser with File System Access API support. Firefox and Safari users see a "not supported" message.
