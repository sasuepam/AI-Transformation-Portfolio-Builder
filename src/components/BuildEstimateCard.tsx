import React, { useEffect, useState } from 'react';
import { readSavedApiKey, saveApiKeyToFile, clearSavedApiKeyFile } from '../api/filesystem';
import { suggestBuildAndTokenEstimate, BuildAndTokenEstimate } from '../api/llm';
import type { UseCase, BusinessCase } from '../types/index';

interface Props {
  useCase: UseCase;
  bc: BusinessCase;
  rootHandle: FileSystemDirectoryHandle | null;
  onApply: (patch: Partial<BusinessCase>) => void;
}

const API_KEY_FILE = 'api-key.local.txt';

export function BuildEstimateCard({ useCase, bc, rootHandle, onApply }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySource, setKeySource] = useState<'none' | 'file'>('none');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<BuildAndTokenEstimate | null>(null);

  useEffect(() => {
    let cancelled = false;
    readSavedApiKey(rootHandle).then((saved) => {
      if (!cancelled && saved) { setApiKey(saved); setKeySource('file'); }
    });
    return () => { cancelled = true; };
  }, [rootHandle]);

  const run = async () => {
    if (!apiKey) { setShowKeyInput(true); return; }
    setStatus('loading'); setError('');
    try {
      const r = await suggestBuildAndTokenEstimate(apiKey.trim(), useCase, bc);
      setResult(r);
      setStatus('done');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
      setStatus('error');
    }
  };

  const saveKey = async () => {
    if (!apiKey || !rootHandle) return;
    await saveApiKeyToFile(rootHandle, apiKey);
    setKeySource('file');
    setShowKeyInput(false);
  };

  const forgetKey = async () => {
    setApiKey(''); setKeySource('none'); setShowKeyInput(true);
    if (rootHandle) await clearSavedApiKeyFile(rootHandle);
  };

  const applyAll = () => {
    if (!result) return;
    onApply({
      buildDays: { low: String(result.buildDaysLow), high: String(result.buildDaysHigh) },
      buildTokensInputM: { low: String(result.buildTokensInputMLow), high: String(result.buildTokensInputMHigh) },
      buildTokensOutputM: { low: String(result.buildTokensOutputMLow), high: String(result.buildTokensOutputMHigh) },
      runningTokensInputPerCall: String(result.runningTokensInputPerCall),
      runningTokensOutputPerCall: String(result.runningTokensOutputPerCall),
    });
    setResult(null);
  };

  return (
    <div style={{ background: '#f4f2ea', border: '1px solid #e6e3d8', borderRadius: 4, padding: '10px 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, textAlign: 'center' }}>
        Suggest build days + token estimate (AI)
      </div>
      <div style={{ fontSize: 10, color: '#8a8880', textAlign: 'center', marginBottom: 8, lineHeight: 1.4 }}>
        Reads the Proposal from the use case board, plus the model picked above, and sends it to Anthropic's API to estimate build days and token usage for both build and running phases.
      </div>

      {keySource === 'file' && (
        <div style={{ fontSize: 10, color: '#5f6b52', textAlign: 'center', marginBottom: 8, lineHeight: 1.4 }}>
          Key loaded from {API_KEY_FILE} in this project's root folder. That file is plain text — if this folder is under git, add {API_KEY_FILE} to .gitignore so it's never committed.{' '}
          <span onClick={forgetKey} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Forget this key</span>
        </div>
      )}

      {showKeyInput && keySource !== 'file' && (
        <div style={{ marginBottom: 6 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Anthropic API key (sk-ant-...)"
            style={{ boxSizing: 'border-box', width: '100%', fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4, marginBottom: 6 }}
          />
          {apiKey && rootHandle && (
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 6, lineHeight: 1.4 }}>
              <span onClick={saveKey} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Save this key to {API_KEY_FILE}</span> so you don't have to re-enter it next time — stored in plain text; keep it out of git.
            </div>
          )}
        </div>
      )}

      <button
        onClick={run}
        disabled={status === 'loading'}
        style={{ width: '100%', fontSize: 11, padding: '6px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#fff', cursor: status === 'loading' ? 'wait' : 'pointer' }}
      >
        {status === 'loading' ? 'Reviewing proposal…' : apiKey ? 'Get suggestion' : 'Enter API key to start'}
      </button>

      {status === 'error' && <div style={{ fontSize: 11, color: '#a33', marginTop: 6 }}>{error}</div>}

      {status === 'done' && result && (
        <div style={{ marginTop: 8, fontSize: 11 }}>
          <div style={{ marginBottom: 4 }}>Build days: <b>{result.buildDaysLow}–{result.buildDaysHigh}</b></div>
          <div style={{ marginBottom: 4 }}>Build tokens: <b>{result.buildTokensInputMLow}–{result.buildTokensInputMHigh}M in / {result.buildTokensOutputMLow}–{result.buildTokensOutputMHigh}M out</b></div>
          <div style={{ marginBottom: 6 }}>Running tokens/instance: <b>{result.runningTokensInputPerCall} in / {result.runningTokensOutputPerCall} out</b></div>
          <div style={{ color: '#5f5e5a', marginBottom: 6 }}>{result.rationale}</div>
          <button
            onClick={applyAll}
            style={{ width: '100%', fontSize: 11, padding: '5px 8px', border: '1px solid #d8d6cd', borderRadius: 4, background: '#c9dcf7', cursor: 'pointer' }}
          >
            Apply all suggested figures
          </button>
        </div>
      )}
    </div>
  );
}
