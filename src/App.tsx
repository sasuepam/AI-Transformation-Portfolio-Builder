import React, { useState, useCallback, useRef } from 'react';
import {
  ensureProjectDir, listProjectDirs,
  readProjectCases, writeCaseFile, deleteCaseFile,
} from './api/filesystem';
import { computeScore, computeTotalTimeCost, ucGateOk, bcGateOk, guardrailSuggestions, scoreExplanation, scoreTier } from './utils/scoring';
import { UC_FIELDS, BC_FIELDS } from './utils/fields';
import { BoardMode } from './components/BoardMode';
import { ConversationalMode } from './components/ConversationalMode';
import { ModeToggle } from './components/ModeToggle';
import { GuardrailsAICard } from './components/GuardrailsAICard';
import { ScoreVisual } from './components/ScoreVisual';
import { exportDeck } from './utils/exportDeck';
import { exportDoc } from './utils/exportDoc';
import type { UseCase, BusinessCase } from './types/index';

// Design tokens
const T = {
  bg: '#eeeee8',
  card: '#ffffff',
  border: '#e5e3dc',
  borderSubtle: '#f0ede5',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#999999',
  amber: '#c8a84b',
  amberBg: '#f5e8c8',
  amberText: '#7a5c1a',
  greenBg: '#d4f0e0',
  greenText: '#1a6e3a',
  redBg: '#fce8e3',
  redText: '#b5350e',
  warningText: '#a3691c',
  radius: 12,
  radiusSm: 6,
};

const btnBase: React.CSSProperties = {
  padding: '9px 18px',
  fontSize: 14,
  fontWeight: 500,
  borderRadius: T.radiusSm,
  cursor: 'pointer',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity .15s',
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#111', color: '#fff' };
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#fff', border: '1px solid #d8d5cc', color: T.text };
const btnSmall: React.CSSProperties = { ...btnBase, padding: '5px 12px', fontSize: 13 };
const btnSecondarySmall: React.CSSProperties = { ...btnSmall, background: '#fff', border: '1px solid #d8d5cc', color: T.text };

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyCase(): UseCase {
  return {
    id: uid(),
    name: '',
    owner: '',
    pipeline: '',
    problem: '',
    instanceLabel: '',
    jobs: [],
    painPoints: [],
    notFor: '',
    whoAffected: '',
    numImpacted: '',
    howCounted: '',
    currentHow: '',
    resources: [],
    frequencyValue: '',
    frequencyUnit: '',
    targetState: '',
    processOutline: [],
    keyBenefits: [],
    risks: [],
    ucComplete: false,
    businessCase: {},
    bcComplete: false,
    caseGuardrails: null,
    createdAt: Date.now(),
  };
}

function StatusPill({ complete, inProgress }: { complete?: boolean; inProgress?: boolean }) {
  if (complete) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, background: T.greenBg, color: T.greenText, borderRadius: 20, padding: '3px 10px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.greenText, display: 'inline-block' }} />
        Complete
      </span>
    );
  }
  if (inProgress) {
    return <span style={{ color: T.textSecondary, fontSize: 13 }}>In progress</span>;
  }
  return <span style={{ color: T.textMuted, fontSize: 13 }}>—</span>;
}

function RecPill({ label, sub }: { label: string; sub?: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    Proceed: { bg: T.greenBg, text: T.greenText },
    'Fix first': { bg: T.amberBg, text: T.amberText },
    Postpone: { bg: T.redBg, text: T.redText },
  };
  const s = styles[label] || styles.Proceed;
  return (
    <div>
      <span style={{ fontSize: 13, fontWeight: 600, background: s.bg, color: s.text, borderRadius: 20, padding: '3px 10px', display: 'inline-block', marginBottom: sub ? 4 : 0 }}>
        {label}
      </span>
      {sub && <div style={{ fontSize: 12, color: T.textSecondary, maxWidth: 200 }}>{sub}</div>}
    </div>
  );
}

function recFromTier(tierName: string | undefined): { label: string; sub: string } {
  if (!tierName) return { label: 'Postpone', sub: 'Revisit once more data is available.' };
  if (tierName === 'Negative') return { label: 'Postpone', sub: 'Revisit once usage data is available.' };
  if (tierName === 'Marginal') return { label: 'Fix first', sub: 'Review assumptions before building.' };
  return { label: 'Proceed', sub: 'Strong return — ready for a decision.' };
}

function ExportDeckButton({ useCase }: { useCase: UseCase }) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => { setBusy(true); try { exportDeck(useCase); } finally { setBusy(false); } };
  return (
    <button onClick={run} disabled={busy} style={{ ...btnSecondarySmall, cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Building…' : '↓ Export deck'}
    </button>
  );
}

function ExportDocButton({ useCase }: { useCase: UseCase }) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => { setBusy(true); try { await exportDoc(useCase); } finally { setBusy(false); } };
  return (
    <button onClick={run} disabled={busy} style={{ ...btnSecondarySmall, cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Building…' : '↓ Export doc'}
    </button>
  );
}

export function App() {
  const [supported] = useState(typeof window.showDirectoryPicker === 'function');
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootName, setRootName] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [cases, setCases] = useState<UseCase[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stage, setStage] = useState<'uc' | 'bc'>('uc');
  const [ucMode, setUcMode] = useState<'form' | 'conversational'>('form');
  const [bcMode, setBcMode] = useState<'form' | 'conversational'>('form');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const chooseFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker?.();
      if (handle) {
        setRootHandle(handle);
        setRootName(handle.name);
        const names = await listProjectDirs(handle);
        setProjects(names);
      }
    } catch { /* user cancelled */ }
  };

  const openProject = async (name: string) => {
    if (!rootHandle) return;
    const loadedCases = await readProjectCases(rootHandle, name);
    setActiveProject(name);
    setCases(loadedCases);
    setActiveId(null);
    setStatus(`${rootName}/${name}/cases/`);
  };

  const refreshFromDisk = async () => {
    if (!rootHandle || !activeProject) return;
    setStatus('Refreshing…');
    const loadedCases = await readProjectCases(rootHandle, activeProject);
    setCases(loadedCases);
    setStatus(`Refreshed — pick this up after a git pull or folder sync`);
  };

  const createProject = async () => {
    if (!rootHandle) return;
    const name = window.prompt('New project name:');
    if (!name) return;
    await ensureProjectDir(rootHandle, name);
    const names = await listProjectDirs(rootHandle);
    setProjects(names);
    await openProject(name);
  };

  const persistCase = useCallback(
    (updated: UseCase) => {
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setStatus('Saving…');
      const existing = saveTimers.current.get(updated.id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(async () => {
        if (!rootHandle || !activeProject) return;
        await writeCaseFile(rootHandle, activeProject, updated);
        setStatus(`Saved · ${rootName}/${activeProject}/cases/${updated.id}.json`);
        saveTimers.current.delete(updated.id);
      }, 400);
      saveTimers.current.set(updated.id, t);
    },
    [rootHandle, activeProject, rootName],
  );

  const active = cases.find((c) => c.id === activeId);

  const createCase = () => {
    const c = createEmptyCase();
    setCases((prev) => [c, ...prev]);
    persistCase(c);
    setActiveId(c.id);
    setStage('uc');
    setUcMode('form');
  };

  const updateUc = (key: string, val: any) => {
    if (!active) return;
    persistCase({ ...active, [key]: val });
  };

  const updateBc = (key: string, val: any) => {
    if (!active) return;
    persistCase({ ...active, businessCase: { ...active.businessCase, [key]: val } });
  };

  const updateBcMulti = (patch: Partial<BusinessCase>) => {
    if (!active) return;
    persistCase({ ...active, businessCase: { ...active.businessCase, ...patch } });
  };

  const markUcComplete = () => {
    if (!active) return;
    persistCase({ ...active, ucComplete: true });
  };

  const markBcComplete = () => {
    if (!active) return;
    persistCase({ ...active, bcComplete: true });
  };

  const deleteCase = async (id: string) => {
    if (!rootHandle || !activeProject) return;
    if (!window.confirm('Delete this use case? This cannot be undone.')) return;
    await deleteCaseFile(rootHandle, activeProject, id);
    setCases((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // ── Unsupported browser ──────────────────────────────────────────────────
  if (!supported) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 40 }}>
        <div style={{ maxWidth: 480, background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: '40px 48px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>Browser not supported</h2>
          <p style={{ color: T.textSecondary, lineHeight: 1.6 }}>
            This tool saves data to a folder on your computer using the File System Access API, which is only available in Chrome or Edge. Please open this in one of those browsers.
          </p>
        </div>
      </div>
    );
  }

  // ── Folder picker ────────────────────────────────────────────────────────
  if (!rootHandle) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 40 }}>
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: '0 0 12px', letterSpacing: -1 }}>AI Transform<br />Case Builder</h1>
          <p style={{ color: T.textSecondary, fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
            Choose a folder on your computer to store your use cases. Each case saves as its own JSON file — nothing is sent anywhere.
          </p>
          <button onClick={chooseFolder} style={btnPrimary}>
            Choose folder
          </button>
        </div>
      </div>
    );
  }

  // ── Projects list ────────────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 64px' }}>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 28 }}>Workspace / {rootName}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
            <div>
              <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.5 }}>Projects</h1>
              <p style={{ color: T.textSecondary, margin: 0, fontSize: 16 }}>Your transformation work, all in one place.</p>
            </div>
            <button onClick={createProject} style={btnPrimary}>+ New project</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {projects.map((p) => (
              <div
                key={p}
                onClick={() => openProject(p)}
                style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '28px 28px 24px', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>{p}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: T.textSecondary, fontSize: 14 }}>
                  <span>Open project</span>
                  <span style={{ fontSize: 18 }}>→</span>
                </div>
              </div>
            ))}
            <div
              onClick={chooseFolder}
              style={{ border: `1.5px dashed #d0cdc4`, borderRadius: T.radius, padding: '28px 28px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aaa', minHeight: 120 }}
            >
              <span style={{ fontSize: 24 }}>↓</span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>Choose another folder</span>
              <span style={{ fontSize: 12, color: T.textMuted }}>From local JSON files</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sort cases for portfolio table ───────────────────────────────────────
  const sortedCases = [...cases].sort((a, b) => {
    const sa = computeScore(a), sb = computeScore(b);
    return (sb?.raw ?? -Infinity) - (sa?.raw ?? -Infinity);
  });
  const filteredCases = search
    ? sortedCases.filter((c) => (c.name || 'Untitled').toLowerCase().includes(search.toLowerCase()))
    : sortedCases;

  // ── Top navigation bar (shared across workspace) ─────────────────────────
  const TopNav = (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', gap: 32, height: '100%', alignItems: 'center' }}>
          <span
            onClick={() => { setActiveProject(null); setActiveId(null); }}
            style={{ fontSize: 14, color: T.textSecondary, cursor: 'pointer', fontWeight: 500, height: '100%', display: 'flex', alignItems: 'center' }}
          >
            Projects
          </span>
          <span
            onClick={() => setActiveId(null)}
            style={{
              fontSize: 14, fontWeight: 600, cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center',
              borderBottom: !activeId ? `2px solid ${T.amber}` : 'none',
              color: !activeId ? T.text : T.textSecondary,
            }}
          >
            Use cases
          </span>
          {active && (
            <span
              style={{
                fontSize: 14, fontWeight: 600, height: '100%', display: 'flex', alignItems: 'center',
                borderBottom: activeId && stage === 'bc' ? `2px solid ${T.amber}` : 'none',
                color: activeId ? T.text : T.textSecondary,
              }}
            >
              Business case
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {status && <span style={{ fontSize: 12, color: T.textMuted }}>{status}</span>}
          <button onClick={refreshFromDisk} style={btnSecondarySmall}>Refresh</button>
          {active && (
            <div style={{ display: 'flex', gap: 8 }}>
              <ExportDeckButton useCase={active} />
              <ExportDocButton useCase={active} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Portfolio table ──────────────────────────────────────────────────────
  if (!activeId) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        {TopNav}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
            <div>
              <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.5 }}>{activeProject}</h1>
              <p style={{ color: T.textSecondary, margin: 0, fontSize: 16 }}>Compare the work in progress and see what is ready for a decision.</p>
            </div>
            <button onClick={createCase} style={btnPrimary}>+ Open use case</button>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search use cases..."
            style={{ width: 320, padding: '10px 16px', fontSize: 14, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.card, color: T.text, outline: 'none', marginBottom: 24 }}
          />

          {cases.length === 0 && (
            <div style={{ color: T.textMuted, fontSize: 14, marginTop: 20 }}>No use cases yet. Click &ldquo;Open use case&rdquo; to create one.</div>
          )}

          {cases.length > 0 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ color: T.textMuted, borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '12px 20px', fontWeight: 400, textAlign: 'left' }}>Use case</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}>Use case stage</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}>Business case</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}>Confidence</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}>Score</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}>Recommendation</th>
                    <th style={{ padding: '12px 16px', fontWeight: 400, textAlign: 'left' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => {
                    const score = computeScore(c);
                    const tier = score?.roi != null ? scoreTier(score.roi) : null;
                    const rec = c.bcComplete && tier ? recFromTier(tier.tier) : null;
                    return (
                      <tr
                        key={c.id}
                        style={{ borderBottom: `1px solid ${T.borderSubtle}`, cursor: 'pointer' }}
                        onClick={() => { setActiveId(c.id); setStage(c.ucComplete ? 'bc' : 'uc'); }}
                      >
                        <td style={{ padding: '14px 20px', fontWeight: 600 }}>{c.name || 'Untitled'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <StatusPill complete={c.ucComplete} inProgress={!c.ucComplete} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <StatusPill complete={c.bcComplete} inProgress={c.ucComplete && !c.bcComplete} />
                        </td>
                        <td style={{ padding: '14px 16px', color: T.textSecondary }}>{c.businessCase.confidence || '—'}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15 }} title={score ? (scoreExplanation(score) ?? undefined) : undefined}>
                          {score?.raw != null ? score.raw : <span style={{ color: T.textMuted, fontWeight: 400 }}>Not scored</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {rec ? <RecPill label={rec.label} sub={rec.sub} /> : <span style={{ color: T.textMuted }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => exportDeck(c)} style={{ ...btnSecondarySmall, fontSize: 12 }}>Deck</button>
                            <button onClick={() => exportDoc(c)} style={{ ...btnSecondarySmall, fontSize: 12 }}>Doc</button>
                            <button
                              onClick={() => deleteCase(c.id)}
                              style={{ ...btnSecondarySmall, fontSize: 12, color: '#a33', borderColor: '#e0b8b8' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Case editor ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {TopNav}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 64px' }}>

        {/* Breadcrumb + case name */}
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
          <span onClick={() => setActiveId(null)} style={{ cursor: 'pointer' }}>{activeProject}</span>
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: T.textSecondary }}>{active?.name || 'Untitled'}</span>
        </div>

        {/* Stage tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 36 }}>
          {(['uc', 'bc'] as const).map((s) => {
            const label = s === 'uc' ? '1. Use case' : '2. Business case';
            const isActive = stage === s;
            const isDisabled = s === 'bc' && !active?.ucComplete;
            return (
              <button
                key={s}
                onClick={() => !isDisabled && setStage(s)}
                style={{
                  background: 'none', border: 'none', padding: '12px 0', marginRight: 32, fontSize: 15, fontWeight: isActive ? 700 : 500,
                  color: isDisabled ? T.textMuted : isActive ? T.text : T.textSecondary,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  borderBottom: isActive ? `2px solid ${T.amber}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Use case stage ─────────────────────────────────────────────── */}
        {stage === 'uc' && active && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>Use case definition</h2>
                <p style={{ color: T.textSecondary, margin: 0 }}>Document the problem, process, and people affected.</p>
              </div>
              <ModeToggle mode={ucMode} setMode={setUcMode} />
            </div>
            {ucMode === 'form' ? (
              <BoardMode title="" fields={UC_FIELDS} data={active} onChange={updateUc} />
            ) : (
              <ConversationalMode fields={UC_FIELDS} data={active} onChange={updateUc} />
            )}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.borderSubtle}` }}>
              {!ucGateOk(active) && (
                <div style={{ fontSize: 13, color: T.warningText, marginBottom: 12, display: 'flex', gap: 6 }}>
                  <span>⚠</span>
                  <span>Resources, frequency, and target state must be filled before this can proceed to a business case.</span>
                </div>
              )}
              <button
                onClick={() => { markUcComplete(); setStage('bc'); }}
                disabled={!ucGateOk(active)}
                style={{ ...btnPrimary, opacity: ucGateOk(active) ? 1 : 0.4, cursor: ucGateOk(active) ? 'pointer' : 'not-allowed' }}
              >
                Mark use case complete → continue
              </button>
            </div>
          </div>
        )}

        {/* ── Business case stage ─────────────────────────────────────────── */}
        {stage === 'bc' && active && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>Business case &amp; score</h2>
                <p style={{ color: T.textSecondary, margin: 0 }}>Turn the use case into a decision with transparent assumptions and a clear financial picture.</p>
              </div>
              <ModeToggle mode={bcMode} setMode={setBcMode} />
            </div>

            {/* From use case summary */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '12px 16px', fontSize: 13, color: T.textSecondary, marginBottom: 20 }}>
              From use case: <b style={{ color: T.text }}>{computeTotalTimeCost(active)?.label ?? '—'}</b>
              {active.targetState && <span> · Target: <b style={{ color: T.text }}>{active.targetState}</b></span>}
            </div>

            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 20, padding: '10px 14px', background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, lineHeight: 1.5 }}>
              All figures below are raw inputs — poll responses, sprint counts, rates, day estimates, token counts. Every value/cost/payback figure is calculated from these, not typed in directly. The build-days field in Cost inputs can optionally be suggested by AI, reading the Proposal from the use case board. You can save your API key to a local file in the project folder; see the card for the gitignore reminder.
            </div>

            {bcMode === 'form' ? (
              <BoardMode
                title=""
                fields={BC_FIELDS}
                data={active.businessCase}
                onChange={updateBc}
                useCase={active}
                onApplyBuildEstimate={updateBcMulti}
                rootHandle={rootHandle}
              />
            ) : (
              <ConversationalMode fields={BC_FIELDS} data={active.businessCase} onChange={updateBc} />
            )}

            {/* Guardrails */}
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textMuted, marginBottom: 10 }}>
                Things to keep in mind
              </div>
              <GuardrailsAICard
                useCase={active}
                rootHandle={rootHandle}
                onResult={(items) => persistCase({ ...active, caseGuardrails: items })}
              />
              {active.caseGuardrails ? (
                <>
                  {active.caseGuardrails.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: T.textSecondary, marginBottom: 8, paddingLeft: 14, borderLeft: '3px solid #c9dcf7', lineHeight: 1.5 }}>
                      <b style={{ color: T.text }}>{it.category}</b> — {it.text}
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                    Generated by AI for this case — review before relying on it.{' '}
                    <span onClick={() => persistCase({ ...active, caseGuardrails: null })} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                      Clear and use heuristic instead
                    </span>
                  </div>
                </>
              ) : (
                guardrailSuggestions(active).map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: T.textSecondary, marginBottom: 8, paddingLeft: 14, borderLeft: `3px solid ${T.border}`, lineHeight: 1.5 }}>
                    {s}
                  </div>
                ))
              )}
            </div>

            {/* Mark complete + score */}
            <div style={{ paddingTop: 20, borderTop: `1px solid ${T.borderSubtle}` }}>
              {!bcGateOk(active.businessCase) && (
                <div style={{ fontSize: 13, color: T.warningText, marginBottom: 12, display: 'flex', gap: 6 }}>
                  <span>⚠</span>
                  <span>A goal, plus poll times, AI-assisted estimate, sprint counts, cadence, and at least one hourly rate must be filled before this use case can be scored.</span>
                </div>
              )}
              <button
                onClick={markBcComplete}
                disabled={!bcGateOk(active.businessCase)}
                style={{ ...btnPrimary, opacity: bcGateOk(active.businessCase) ? 1 : 0.4, cursor: bcGateOk(active.businessCase) ? 'pointer' : 'not-allowed' }}
              >
                {active.bcComplete ? 'Update business case' : 'Mark business case complete'}
              </button>
              {active.bcComplete && (() => {
                const score = computeScore(active);
                return score?.raw != null ? <ScoreVisual score={score} /> : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
