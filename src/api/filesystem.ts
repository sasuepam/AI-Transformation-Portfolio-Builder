import type { UseCase } from '../types/index';

export const CASES_DIR = 'cases';
const LEGACY_FILE_NAME = 'data.json';
const API_KEY_FILE = 'api-key.local.txt';

export async function ensureProjectDir(rootHandle: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  return rootHandle.getDirectoryHandle(name, { create: true });
}

export async function listProjectDirs(rootHandle: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of (rootHandle as any).entries()) {
    if ((handle as FileSystemHandle).kind === 'directory') names.push(name);
  }
  return names.sort();
}

async function getCasesDir(rootHandle: FileSystemDirectoryHandle, projectName: string): Promise<FileSystemDirectoryHandle> {
  const projectDir = await ensureProjectDir(rootHandle, projectName);
  return projectDir.getDirectoryHandle(CASES_DIR, { create: true });
}

// Reads every case from its own file. If none exist yet, checks for the old
// single-file format and splits it into per-case files once on first open,
// so projects created before this version keep their data.
export async function readProjectCases(rootHandle: FileSystemDirectoryHandle, projectName: string): Promise<UseCase[]> {
  const casesDir = await getCasesDir(rootHandle, projectName);
  const found: UseCase[] = [];
  for await (const [name, handle] of (casesDir as any).entries()) {
    if ((handle as FileSystemHandle).kind !== 'file' || !name.endsWith('.json')) continue;
    try {
      const file = await (handle as FileSystemFileHandle).getFile();
      found.push(JSON.parse(await file.text()) as UseCase);
    } catch { /* skip unreadable file */ }
  }
  if (found.length > 0) return found;

  try {
    const projectDir = await ensureProjectDir(rootHandle, projectName);
    const legacyHandle = await projectDir.getFileHandle(LEGACY_FILE_NAME);
    const legacyFile = await legacyHandle.getFile();
    const legacyCases: UseCase[] = (JSON.parse(await legacyFile.text())).cases || [];
    for (const c of legacyCases) await writeCaseFile(rootHandle, projectName, c);
    return legacyCases;
  } catch {
    return [];
  }
}

export async function writeCaseFile(rootHandle: FileSystemDirectoryHandle, projectName: string, caseObj: UseCase): Promise<void> {
  const casesDir = await getCasesDir(rootHandle, projectName);
  const fileHandle = await casesDir.getFileHandle(`${caseObj.id}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(caseObj, null, 2));
  await writable.close();
}

export async function deleteCaseFile(rootHandle: FileSystemDirectoryHandle, projectName: string, id: string): Promise<void> {
  try {
    const casesDir = await getCasesDir(rootHandle, projectName);
    await casesDir.removeEntry(`${id}.json`);
  } catch { /* already gone */ }
}

export async function readSavedApiKey(rootHandle: FileSystemDirectoryHandle | null): Promise<string> {
  if (!rootHandle) return '';
  try {
    const fileHandle = await rootHandle.getFileHandle(API_KEY_FILE);
    const file = await fileHandle.getFile();
    return (await file.text()).trim();
  } catch {
    return '';
  }
}

export async function saveApiKeyToFile(rootHandle: FileSystemDirectoryHandle, key: string): Promise<void> {
  const fileHandle = await rootHandle.getFileHandle(API_KEY_FILE, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(key.trim());
  await writable.close();
}

export async function clearSavedApiKeyFile(rootHandle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await rootHandle.removeEntry(API_KEY_FILE);
  } catch { /* wasn't there */ }
}
