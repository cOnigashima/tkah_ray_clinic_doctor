/**
 * エイリアス管理のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Alias } from '../../types';

let testDir: string = '';

// environment.supportPath をモック
vi.mock('@raycast/api', () => ({
  environment: {
    get supportPath() {
      return testDir;
    }
  }
}));

import {
  getAliases,
  saveAliases,
  addAlias,
  updateAlias,
  removeAlias,
  DEFAULT_ALIASES
} from '../aliases';

describe('Alias Manager', () => {
  beforeEach(async () => {
    testDir = join(tmpdir(), `command-clinic-alias-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  describe('DEFAULT_ALIASES', () => {
    it('should return default Raycast aliases', () => {
      const defaults = DEFAULT_ALIASES;

      expect(defaults).toHaveLength(3);
      expect(defaults[0].id).toBe('file-search');
      expect(defaults[1].id).toBe('clipboard-history');
      expect(defaults[2].id).toBe('window-management');
    });

    it('should have valid command structure', () => {
      const defaults = DEFAULT_ALIASES;

      defaults.forEach(alias => {
        expect(alias.id).toBeTruthy();
        expect(alias.title).toBeTruthy();
        expect(alias.target.command).toBeTruthy();
        expect(alias.target.owner).toBe('raycast');
      });
    });
  });

  describe('getAliases', () => {
    it('should return default aliases when file does not exist', async () => {
      const aliases = await getAliases();

      expect(aliases).toHaveLength(3);
      expect(aliases[0].id).toBe('file-search');
    });

    it('should load aliases from file', async () => {
      const testAliases: Alias[] = [
        {
          id: 'test-alias',
          name: 'Test Command',
          target: {
            type: 'builtin',
            command: 'test',
            ownerOrAuthorName: 'raycast'
          }
        }
      ];

      const aliasPath = join(testDir, 'aliases.json');
      await fs.writeFile(aliasPath, JSON.stringify(testAliases), 'utf-8');

      const loaded = await getAliases();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-alias');
      expect(loaded[0].name).toBe('Test Command');
    });

    it('should return default aliases on corrupted file', async () => {
      const aliasPath = join(testDir, 'aliases.json');
      await fs.writeFile(aliasPath, 'invalid json {', 'utf-8');

      const aliases = await getAliases();

      // エラー時はデフォルトを返す
      expect(aliases).toHaveLength(3);
      expect(aliases[0].id).toBe('file-search');
    });
  });

  describe('saveAliases', () => {
    it('should save aliases to file', async () => {
      const testAliases: Alias[] = [
        {
          id: 'test-1',
          name: 'Test 1',
          target: { type: 'builtin', command: 'test1', ownerOrAuthorName: 'raycast' }
        },
        {
          id: 'test-2',
          name: 'Test 2',
          target: { type: 'builtin', command: 'test2', ownerOrAuthorName: 'raycast' }
        }
      ];

      await saveAliases(testAliases);

      const aliasPath = join(testDir, 'aliases.json');
      const content = await fs.readFile(aliasPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('test-1');
      expect(loaded[1].id).toBe('test-2');
    });

    it('should overwrite existing file', async () => {
      // 最初のセーブ
      await saveAliases([
        { id: 'old', name: 'Old', target: { type: 'builtin', command: 'old', ownerOrAuthorName: 'raycast' } }
      ]);

      // 上書き
      await saveAliases([
        { id: 'new', name: 'New', target: { type: 'builtin', command: 'new', ownerOrAuthorName: 'raycast' } }
      ]);

      const loaded = await getAliases();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('new');
    });
  });

  describe('addAlias', () => {
    it('should add new alias', async () => {
      const newAlias: Alias = {
        id: 'new-command',
        name: 'New Command',
        target: { type: 'builtin', command: 'new', ownerOrAuthorName: 'raycast' }
      };

      await addAlias(newAlias);

      const aliases = await getAliases();
      expect(aliases).toHaveLength(4); // 3 defaults + 1 new
      expect(aliases[3].id).toBe('new-command');
    });

    it('should throw error on duplicate ID', async () => {
      const alias: Alias = {
        id: 'search-files', // デフォルトと重複
        name: 'Duplicate',
        target: { type: 'builtin', command: 'dup', ownerOrAuthorName: 'raycast' }
      };

      await expect(addAlias(alias)).rejects.toThrow('既に存在するエイリアスIDです');
    });

    it('should enforce max 20 aliases limit', async () => {
      // 20個のエイリアスを追加
      const aliases: Alias[] = Array.from({ length: 20 }, (_, i) => ({
        id: `alias-${i}`,
        name: `Alias ${i}`,
        target: { type: 'builtin', command: `cmd${i}`, ownerOrAuthorName: 'raycast' }
      }));

      await saveAliases(aliases);

      // 21個目を追加しようとする
      const extra: Alias = {
        id: 'extra',
        name: 'Extra',
        target: { type: 'builtin', command: 'extra', ownerOrAuthorName: 'raycast' }
      };

      await expect(addAlias(extra)).rejects.toThrow('エイリアスは最大20個までです');
    });
  });

  describe('updateAlias', () => {
    it('should update existing alias', async () => {
      // デフォルトエイリアスの1つを更新
      const updated: Alias = {
        id: 'search-files',
        name: 'Updated Name',
        target: { type: 'builtin', command: 'search-files', ownerOrAuthorName: 'raycast' }
      };

      await updateAlias('search-files', updated);

      const aliases = await getAliases();
      const found = aliases.find(a => a.id === 'file-search');

      expect(found?.name).toBe('Updated Name');
    });

    it('should throw error when alias not found', async () => {
      const alias: Alias = {
        id: 'nonexistent',
        name: 'Test',
        target: { type: 'builtin', command: 'test', ownerOrAuthorName: 'raycast' }
      };

      await expect(updateAlias('nonexistent', alias)).rejects.toThrow('エイリアスが見つかりません');
    });

    it('should allow changing target while keeping ID', async () => {
      const newAlias: Alias = {
        id: 'my-command',
        name: 'My Command',
        target: { type: 'builtin', command: 'old-cmd', ownerOrAuthorName: 'raycast' }
      };

      await addAlias(newAlias);

      const updated: Alias = {
        id: 'my-command',
        name: 'My Command',
        target: { type: 'extension', command: 'new-cmd', ownerOrAuthorName: 'author', extensionName: 'ext' }
      };

      await updateAlias('my-command', updated);

      const aliases = await getAliases();
      const found = aliases.find(a => a.id === 'my-command');

      expect(found?.target.type).toBe('extension');
      expect(found?.target.command).toBe('new-cmd');
    });
  });

  describe('removeAlias', () => {
    it('should delete existing alias', async () => {
      await removeAlias('file-search');

      const aliases = await getAliases();
      expect(aliases).toHaveLength(2); // 3 - 1
      expect(aliases.find(a => a.id === 'file-search')).toBeUndefined();
    });

    it('should throw error when alias not found', async () => {
      await expect(removeAlias('nonexistent')).rejects.toThrow('エイリアスが見つかりません');
    });

    it('should handle deleting all aliases', async () => {
      await removeAlias('file-search');
      await removeAlias('tile-window');
      await removeAlias('system');

      const aliases = await getAliases();
      expect(aliases).toHaveLength(0);
    });
  });

  describe('Integration: Alias CRUD operations', () => {
    it('should handle complete CRUD lifecycle', async () => {
      // Create
      const newAlias: Alias = {
        id: 'test-crud',
        name: 'Test CRUD',
        target: { type: 'builtin', command: 'test', ownerOrAuthorName: 'raycast' }
      };

      await addAlias(newAlias);

      let aliases = await getAliases();
      expect(aliases).toHaveLength(4);

      // Read
      const found = aliases.find(a => a.id === 'test-crud');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test CRUD');

      // Update
      const updated: Alias = {
        ...newAlias,
        name: 'Updated CRUD'
      };

      await updateAlias('test-crud', updated);

      aliases = await getAliases();
      const updatedFound = aliases.find(a => a.id === 'test-crud');
      expect(updatedFound?.name).toBe('Updated CRUD');

      // Delete
      await removeAlias('test-crud');

      aliases = await getAliases();
      expect(aliases).toHaveLength(3);
      expect(aliases.find(a => a.id === 'test-crud')).toBeUndefined();
    });
  });
});
