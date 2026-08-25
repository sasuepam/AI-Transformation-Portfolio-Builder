import React, { useState, useCallback, useRef } from 'react';
import {
  ensureProjectDir, listProjectDirs,
  readProjectCases, writeCaseFile, deleteCaseFile,
} from './api/filesystem';
import { computeScore, computeTotalTimeCost, ucGateOk, bcGateOk, guardrailSuggestions, scoreExplanation } from './utils/scoring';
import { UC_FIELDS, BC_FIELDS } from './utils/fields';
import { BoardMode } from './components/BoardMode';
import { ConversationalMode } from './components/ConversationalMode';
import { ModeToggle } from './components/ModeToggle';
import { GuardrailsAICard } from './components/GuardrailsAICard';
import { ScoreVisual } from './components/ScoreVisual';
import { exportDeck } from './utils/exportDeck';
import { exportDoc } from './utils/exportDoc';
import type { UseCase, BusinessCase } from './types/index';

const btnStyle: React.CSSProperties = { padding: '7px 14px', fontSize: 13, border: '1px solid #d8d6cd', borderRadius: 6, background: '#fff', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { ...btnStyle, background: '#2c2c2a', color: '#fff', borderColor: '#2c2c2a' };

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

function ExportDeckButton({ useCase }: { useCase: UseCase }) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    setBusy(true);
    try { exportDeck(useCase); } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy} style={{ ...btnStyle, cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Building deck…' : 'Export slide deck (PPTX)'}
    </button>
  );
}

function ExportDocButton({ useCase }: { useCase: UseCase }) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    setBusy(true);
    try { await exportDoc(useCase); } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy} style={{ ...btnStyle, cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Building document…' : 'Export business case (Word)'}
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
    } catch {
      // user cancelled
    }
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
    setStatus(`Refreshed from ${rootName}/${activeProject}/cases/ — pick this up after a git pull or a folder sync`);
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
        setStatus(`Saved to ${rootName}/${activeProject}/cases/${updated.id}.json`);
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

  if (!supported) {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Browser not supported</h2>
        <p>
          This tool saves data to a folder on your computer, which requires a browser feature (File System Access) only available in Chrome or Edge. Please open this file in
          one of those browsers.
        </p>
      </div>
    );
  }

  if (!rootHandle) {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h2>AI Transform Case Builder</h2>
        <p style={{ color: '#5f5e5a' }}>Choose a folder on your computer. Each use case gets its own JSON file — nothing is sent anywhere.</p>
        <button onClick={chooseFolder} style={btnPrimary}>
          Choose folder
        </button>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Projects in {rootName}</h2>
        <button onClick={createProject} style={{ ...btnPrimary, marginBottom: 16 }}>
          New project
        </button>
        {projects.length === 0 && <div style={{ color: '#8a8880' }}>No projects yet.</div>}
        {projects.map((p) => (
          <div
            key={p}
            onClick={() => openProject(p)}
            style={{ padding: '10px 12px', border: '1px solid #e6e3d8', borderRadius: 6, marginBottom: 8, cursor: 'pointer' }}
          >
            {p}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2c2c2a', maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>{activeProject}</div>
          <div style={{ fontSize: 12, color: '#8a8880' }}>{status || `${rootName}/${activeProject}/cases/`}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setActiveProject(null);
              setActiveId(null);
            }}
            style={btnStyle}
          >
            Switch project
          </button>
          <button onClick={refreshFromDisk} style={btnStyle} title="Re-read cases from disk (pick up changes from git pull / Dropbox sync)">
            Refresh
          </button>
          <button onClick={() => setActiveId(null)} style={btnStyle}>
            Portfolio ({cases.length})
          </button>
        </div>
      </div>

      {!activeId && (
        <div style={{ marginTop: 20 }}>
          <button onClick={createCase} style={{ ...btnPrimary, marginBottom: 20 }}>
            New use case
          </button>
          {cases.length === 0 && <div style={{ color: '#8a8880', fontSize: 14 }}>No use cases yet.</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #d8d6cd', color: '#8a8880' }}>
                <th style={{ padding: '6px 8px' }}>Name</th>
                <th style={{ padding: '6px 8px' }}>Use case</th>
                <th style={{ padding: '6px 8px' }}>Business case</th>
                <th style={{ padding: '6px 8px' }}>Confidence</th>
                <th style={{ padding: '6px 8px' }}>Score</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {[...cases]
                .sort((a, b) => {
                  const sa = computeScore(a);
                  const sb = computeScore(b);
                  return (sb?.raw ?? -Infinity) - (sa?.raw ?? -Infinity);
                })
                .map((c) => {
                  const score = computeScore(c);
                  const explanation = score ? scoreExplanation(score) : null;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid #eeece5', cursor: 'pointer' }}
                      onClick={() => {
                        setActiveId(c.id);
                        setStage(c.ucComplete ? 'bc' : 'uc');
                      }}
                    >
                      <td style={{ padding: '8px' }}>{c.name || 'Untitled'}</td>
                      <td style={{ padding: '8px' }}>{c.ucComplete ? 'Complete' : 'In progress'}</td>
                      <td style={{ padding: '8px' }}>{c.bcComplete ? 'Complete' : c.ucComplete ? 'In progress' : '—'}</td>
                      <td style={{ padding: '8px' }}>{c.businessCase.confidence || '—'}</td>
                      <td style={{ padding: '8px', fontWeight: 500 }} title={explanation || ''}>
                        {score?.raw != null ? score.raw : 'Not scored'}
                      </td>
                      <td style={{ padding: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => exportDeck(c)}
                          style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer', marginRight: 6 }}
                        >
                          Export deck
                        </button>
                        <button
                          onClick={() => exportDoc(c)}
                          style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: 'pointer', marginRight: 6 }}
                        >
                          Export doc
                        </button>
                        <button
                          onClick={() => deleteCase(c.id)}
                          style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e0b8b8', borderRadius: 4, background: '#fff', color: '#a33', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setActiveId(null)} style={{ ...btnStyle, marginBottom: 16 }}>
            ← Back to portfolio
          </button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setStage('uc')} style={stage === 'uc' ? btnPrimary : btnStyle}>
              1. Use case
            </button>
            <button
              onClick={() => active.ucComplete && setStage('bc')}
              style={stage === 'bc' ? btnPrimary : { ...btnStyle, opacity: active.ucComplete ? 1 : 0.4 }}
            >
              2. Business case
            </button>
          </div>

          {stage === 'uc' && (
            <div>
              <ModeToggle mode={ucMode} setMode={setUcMode} />
              {ucMode === 'form' ? (
                <BoardMode title="Use case definition" fields={UC_FIELDS} data={active} onChange={updateUc} />
              ) : (
                <ConversationalMode fields={UC_FIELDS} data={active} onChange={updateUc} />
              )}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eeece5' }}>
                {!ucGateOk(active) && (
                  <div style={{ fontSize: 13, color: '#a3691c', marginBottom: 10 }}>
                    Resources, frequency, and target state must be filled before this can proceed to a business case.
                  </div>
                )}
                <button
                  onClick={() => {
                    markUcComplete();
                    setStage('bc');
                  }}
                  disabled={!ucGateOk(active)}
                  style={{ ...btnPrimary, opacity: ucGateOk(active) ? 1 : 0.4, cursor: ucGateOk(active) ? 'pointer' : 'not-allowed' }}
                >
                  Mark use case complete → continue
                </button>
              </div>
            </div>
          )}

          {stage === 'bc' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f6f5f0', borderRadius: 8, padding: '12px 14px', fontSize: 13, flex: 1 }}>
                  <div style={{ color: '#8a8880', marginBottom: 4 }}>From use case (read-only)</div>
                  <div>
                    <b>Total time cost:</b> {computeTotalTimeCost(active) ? computeTotalTimeCost(active)?.label : '—'}
                  </div>
                  <div>
                    <b>Target state:</b> {active.targetState || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ExportDeckButton useCase={active} />
                  <ExportDocButton useCase={active} />
                  <div style={{ fontSize: 10, color: '#8a8880', maxWidth: 180 }}>Generated locally — no API call.</div>
                </div>
              </div>
              <ModeToggle mode={bcMode} setMode={setBcMode} />
              <div style={{ fontSize: 12, color: '#8a8880', marginBottom: 14, padding: '8px 12px', background: '#f6f5f0', borderRadius: 6 }}>
                All figures below are raw inputs — poll responses, sprint counts, rates, day estimates, token counts. Every value/cost/payback figure is calculated from these, not typed in directly. The build-days field in Cost inputs can optionally be suggested by AI, reading the Proposal from the use case board — that's the one feature on this screen that calls an external API. You can save your API key to a local file in the project folder so you're not re-entering it each time; see the card for the gitignore reminder.
              </div>
              {bcMode === 'form' ? (
                <BoardMode
                  title="Business case"
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
              <div style={{ marginTop: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8a8880', marginBottom: 10 }}>
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
                      <div key={i} style={{ fontSize: 13, color: '#5f5e5a', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #c9dcf7' }}>
                        <b>{it.category}</b> — {it.text}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: '#8a8880', marginTop: 4 }}>
                      Generated for this specific case by AI, saved with it — review before relying on it.{' '}
                      <span
                        onClick={() => persistCase({ ...active, caseGuardrails: null })}
                        style={{ textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Clear and use heuristic instead
                      </span>
                    </div>
                  </>
                ) : (
                  guardrailSuggestions(active).map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#5f5e5a', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #d8d6cd' }}>
                      {s}
                    </div>
                  ))
                )}
              </div>
              <div style={{ paddingTop: 16, borderTop: '1px solid #eeece5' }}>
                {!bcGateOk(active.businessCase) && (
                  <div style={{ fontSize: 13, color: '#a3691c', marginBottom: 10 }}>
                    A goal, plus poll times, AI-assisted estimate, sprint counts, cadence, and at least one hourly rate must be filled before this use case can be scored.
                  </div>
                )}
                <button
                  onClick={markBcComplete}
                  disabled={!bcGateOk(active.businessCase)}
                  style={{ ...btnPrimary, opacity: bcGateOk(active.businessCase) ? 1 : 0.4 }}
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
      )}
    </div>
  );
}
