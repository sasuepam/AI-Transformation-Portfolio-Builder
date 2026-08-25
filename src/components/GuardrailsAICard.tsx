import React, { useEffect, useState } from 'react';
import { readSavedApiKey, saveApiKeyToFile, clearSavedApiKeyFile } from '../api/filesystem';
import { suggestGuardrails, GuardrailItem } from '../api/llm';
import type { UseCase } from '../types/index';

interface Props {
  useCase: UseCase;
  rootHandle: FileSystemDirectoryHandle | null;
  onResult: (items: GuardrailItem[]) => void;
}

const smallBtn: React.CSSProperties = {
  fontSize: 11, padding: '5px 10px', border: '1px solid #d8d6cd',
  borderRadius: 4, background: '#fff', cursor: 'pointer',
};

export function GuardrailsAICard({ useCase, rootHandle, onResult }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySource, setKeySource] = useState<'none' | 'file'>('none');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [error, setError] = useState('');

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
      const items = await suggestGuardrails(apiKey.trim(), useCase);
      onResult(items);
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

  return (
    <div style={{ marginBottom: 10 }}>
      {keySource === 'file' && (
        <div style={{ fontSize: 10, color: '#5f6b52', marginBottom: 6, lineHeight: 1.4 }}>
          Key loaded from api-key.local.txt.{' '}
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
            style={{ fontSize: 11, padding: '4px 6px', border: '1px solid #d8d6cd', borderRadius: 4, width: 260, marginBottom: 4 }}
          />
          {apiKey && rootHandle && (
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 4, lineHeight: 1.4, maxWidth: 400 }}>
              <span onClick={saveKey} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Save this key to api-key.local.txt</span> — plain text; keep it out of git.
            </div>
          )}
        </div>
      )}
      <button
        onClick={run}
        disabled={status === 'loading'}
        style={{ ...smallBtn, cursor: status === 'loading' ? 'wait' : 'pointer' }}
      >
        {status === 'loading'
          ? 'Reading this case…'
          : apiKey
            ? 'Generate case-specific guidance (AI)'
            : 'Enter API key to generate case-specific guidance'}
      </button>
      {status === 'error' && <div style={{ fontSize: 11, color: '#a33', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
