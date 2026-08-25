import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ensureProjectDir,
  listProjectDirs,
  readProjectCases,
  writeCaseFile,
  deleteCaseFile,
  readSavedApiKey,
  saveApiKeyToFile,
  clearSavedApiKeyFile,
} from '../src/api/filesystem';
import type { UseCase } from '../src/types/index';

function makeCase(id: string, name = 'Test Case'): UseCase {
  return {
    id,
    name,
    jobs: [],
    resources: [],
    ucComplete: false,
    businessCase: {},
    bcComplete: false,
    createdAt: 1000,
  };
}

describe('File System API', () => {
  let mockRoot: any;

  function makeWritable() {
    const written: string[] = [];
    return {
      write: vi.fn((data: string) => { written.push(data); }),
      close: vi.fn().mockResolvedValue(undefined),
      _written: () => written,
    };
  }

  function makeFileHandle(contents: string) {
    return {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue(contents) }),
      createWritable: vi.fn().mockResolvedValue(makeWritable()),
    };
  }

  function makeDirHandle(entries: [string, any][]) {
    const map = new Map(entries);
    return {
      kind: 'directory',
      entries: async function* () { for (const e of map.entries()) yield e; },
      getFileHandle: vi.fn(async (name: string, opts?: any) => {
        if (map.has(name)) return map.get(name);
        if (opts?.create) {
          const h = makeFileHandle('');
          map.set(name, h);
          return h;
        }
        throw new Error(`NotFoundError: ${name}`);
      }),
      getDirectoryHandle: vi.fn(async (name: string, opts?: any) => {
        if (map.has(name)) return map.get(name);
        if (opts?.create) {
          const d = makeDirHandle([]);
          map.set(name, d);
          return d;
        }
        throw new Error(`NotFoundError: ${name}`);
      }),
      removeEntry: vi.fn(async (name: string) => {
        if (!map.delete(name)) throw new Error(`NotFoundError: ${name}`);
      }),
    };
  }

  beforeEach(() => {
    mockRoot = makeDirHandle([]);
  });

  describe('ensureProjectDir', () => {
    it('creates a directory with the given name', async () => {
      const result = await ensureProjectDir(mockRoot, 'test-project');
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith('test-project', { create: true });
      expect(result).toBeDefined();
    });
  });

  describe('listProjectDirs', () => {
    it('lists directory names sorted alphabetically, skipping files', async () => {
      mockRoot = makeDirHandle([
        ['project-b', { kind: 'directory' }],
        ['project-a', { kind: 'directory' }],
        ['file.txt', { kind: 'file' }],
      ]);
      const result = await listProjectDirs(mockRoot);
      expect(result).toEqual(['project-a', 'project-b']);
    });
  });

  describe('readProjectCases', () => {
    it('returns empty array if cases/ is empty and no legacy file', async () => {
      const projectDir = makeDirHandle([]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);
      const result = await readProjectCases(mockRoot, 'proj');
      expect(result).toEqual([]);
    });

    it('reads cases from individual JSON files in cases/', async () => {
      const c1 = makeCase('case-1', 'Alpha');
      const c2 = makeCase('case-2', 'Beta');
      const casesDir = makeDirHandle([
        ['case-1.json', makeFileHandle(JSON.stringify(c1))],
        ['case-2.json', makeFileHandle(JSON.stringify(c2))],
      ]);
      const projectDir = makeDirHandle([['cases', casesDir]]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      const result = await readProjectCases(mockRoot, 'proj');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id).sort()).toEqual(['case-1', 'case-2']);
    });

    it('skips non-JSON files in cases/', async () => {
      const c1 = makeCase('case-1');
      const casesDir = makeDirHandle([
        ['case-1.json', makeFileHandle(JSON.stringify(c1))],
        ['README.md', makeFileHandle('some readme')],
      ]);
      const projectDir = makeDirHandle([['cases', casesDir]]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      const result = await readProjectCases(mockRoot, 'proj');
      expect(result).toHaveLength(1);
    });

    it('migrates legacy data.json into per-case files when cases/ is empty', async () => {
      const legacyCases = [makeCase('old-1', 'Legacy One'), makeCase('old-2', 'Legacy Two')];
      const legacyFileHandle = makeFileHandle(JSON.stringify({ cases: legacyCases }));
      const casesDir = makeDirHandle([]);
      const projectDir = makeDirHandle([
        ['cases', casesDir],
        ['data.json', legacyFileHandle],
      ]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      const result = await readProjectCases(mockRoot, 'proj');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id).sort()).toEqual(['old-1', 'old-2']);
    });
  });

  describe('writeCaseFile', () => {
    it('writes the use case as JSON to cases/<id>.json', async () => {
      const writableObj = makeWritable();
      const fileHandle = { getFile: vi.fn(), createWritable: vi.fn().mockResolvedValue(writableObj) };
      const casesDir = makeDirHandle([]);
      casesDir.getFileHandle = vi.fn().mockResolvedValue(fileHandle);
      const projectDir = makeDirHandle([['cases', casesDir]]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      const c = makeCase('xyz-123', 'My Case');
      await writeCaseFile(mockRoot, 'proj', c);

      expect(casesDir.getFileHandle).toHaveBeenCalledWith('xyz-123.json', { create: true });
      expect(writableObj.write).toHaveBeenCalled();
      const written = JSON.parse(writableObj.write.mock.calls[0][0]);
      expect(written.id).toBe('xyz-123');
      expect(written.name).toBe('My Case');
    });
  });

  describe('deleteCaseFile', () => {
    it('removes the case file', async () => {
      const casesDir = makeDirHandle([['case-1.json', makeFileHandle('{}')]]);
      const projectDir = makeDirHandle([['cases', casesDir]]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      await deleteCaseFile(mockRoot, 'proj', 'case-1');
      expect(casesDir.removeEntry).toHaveBeenCalledWith('case-1.json');
    });

    it('does not throw if file does not exist', async () => {
      const casesDir = makeDirHandle([]);
      const projectDir = makeDirHandle([['cases', casesDir]]);
      mockRoot.getDirectoryHandle.mockResolvedValue(projectDir);

      await expect(deleteCaseFile(mockRoot, 'proj', 'ghost')).resolves.toBeUndefined();
    });
  });

  describe('API key helpers', () => {
    it('readSavedApiKey returns empty string when no file', async () => {
      const result = await readSavedApiKey(mockRoot);
      expect(result).toBe('');
    });

    it('readSavedApiKey returns empty string when rootHandle is null', async () => {
      const result = await readSavedApiKey(null);
      expect(result).toBe('');
    });

    it('readSavedApiKey returns trimmed key from file', async () => {
      const handle = makeFileHandle('  sk-test-key  ');
      mockRoot.getFileHandle = vi.fn().mockResolvedValue(handle);
      const result = await readSavedApiKey(mockRoot);
      expect(result).toBe('sk-test-key');
    });

    it('saveApiKeyToFile writes key to api-key.local.txt', async () => {
      const writableObj = makeWritable();
      const handle = { createWritable: vi.fn().mockResolvedValue(writableObj) };
      mockRoot.getFileHandle = vi.fn().mockResolvedValue(handle);

      await saveApiKeyToFile(mockRoot, ' sk-my-key ');
      expect(mockRoot.getFileHandle).toHaveBeenCalledWith('api-key.local.txt', { create: true });
      expect(writableObj.write).toHaveBeenCalledWith('sk-my-key');
    });

    it('clearSavedApiKeyFile removes the file', async () => {
      mockRoot.removeEntry = vi.fn().mockResolvedValue(undefined);
      await clearSavedApiKeyFile(mockRoot);
      expect(mockRoot.removeEntry).toHaveBeenCalledWith('api-key.local.txt');
    });

    it('clearSavedApiKeyFile does not throw if file absent', async () => {
      mockRoot.removeEntry = vi.fn().mockRejectedValue(new Error('not found'));
      await expect(clearSavedApiKeyFile(mockRoot)).resolves.toBeUndefined();
    });
  });
});
