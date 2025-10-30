/**
 * ログマネージャーのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { InputEvent, LaunchEvent, LogEvent } from '../../types';

// モック用の一時ディレクトリ
let testDir: string = '';

// environment.supportPath をモック
vi.mock('@raycast/api', () => ({
  environment: {
    get supportPath() {
      return testDir;
    }
  }
}));

// テスト対象の関数をインポート（モック後）
import {
  appendInputLog,
  appendLaunchLog,
  readRecentLogs,
  cleanOldLogs,
  checkFileAccess
} from '../log';

describe('Log Manager', () => {
  beforeEach(async () => {
    // 各テストで一時ディレクトリを作成
    testDir = join(tmpdir(), `command-clinic-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  describe('appendInputLog', () => {
    it('should append input event to log file', async () => {
      const testText = 'search files';

      await appendInputLog(testText);

      const today = new Date().toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${today}.jsonl`);
      const content = await fs.readFile(logPath, 'utf-8');

      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const event: InputEvent = JSON.parse(lines[0]);
      expect(event.type).toBe('input');
      expect(event.text).toBe(testText);
      expect(event.len).toBe(testText.length);
      expect(event.ts).toBeGreaterThan(0);
    });

    it('should append multiple input events', async () => {
      await appendInputLog('first');
      await appendInputLog('second');
      await appendInputLog('third');

      const today = new Date().toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${today}.jsonl`);
      const content = await fs.readFile(logPath, 'utf-8');

      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);

      const events = lines.map(line => JSON.parse(line));
      expect(events[0].text).toBe('first');
      expect(events[1].text).toBe('second');
      expect(events[2].text).toBe('third');
    });
  });

  describe('appendLaunchLog', () => {
    it('should append launch event to log file', async () => {
      const aliasId = 'search-files';
      const target = {
        type: 'builtin' as const,
        command: 'search-files',
        ownerOrAuthorName: 'raycast'
      };

      await appendLaunchLog(aliasId, target);

      const today = new Date().toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${today}.jsonl`);
      const content = await fs.readFile(logPath, 'utf-8');

      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const event: LaunchEvent = JSON.parse(lines[0]);
      expect(event.type).toBe('launch');
      expect(event.aliasId).toBe(aliasId);
      expect(event.target).toEqual(target);
      expect(event.ts).toBeGreaterThan(0);
    });

    it('should handle extension launch events', async () => {
      const aliasId = 'github-search';
      const target = {
        type: 'extension' as const,
        command: 'search-repositories',
        ownerOrAuthorName: 'github-org',
        extensionName: 'github'
      };

      await appendLaunchLog(aliasId, target);

      const today = new Date().toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${today}.jsonl`);
      const content = await fs.readFile(logPath, 'utf-8');

      const event: LaunchEvent = JSON.parse(content.trim());
      expect(event.target.type).toBe('extension');
      expect(event.target.extensionName).toBe('github');
    });
  });

  describe('readRecentLogs', () => {
    it('should read logs from multiple days', async () => {
      // 3日分のログを作成
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const logPath = join(testDir, `logs-${dateStr}.jsonl`);

        const events: LogEvent[] = [
          {
            type: 'input',
            ts: date.getTime() + i * 1000,
            text: `test ${i}`,
            len: 6
          },
          {
            type: 'launch',
            ts: date.getTime() + i * 1000 + 500,
            aliasId: 'test',
            target: { type: 'builtin', command: 'test', ownerOrAuthorName: 'raycast' }
          }
        ];

        const content = events.map(e => JSON.stringify(e)).join('\n') + '\n';
        await fs.writeFile(logPath, content, 'utf-8');
      }

      const logs = await readRecentLogs(7, 100);

      // 3日 × 2イベント = 6イベント
      expect(logs).toHaveLength(6);

      // 最新のイベントが最初に来るか確認（タスク2.1のP1バグ修正）
      expect(logs[0].ts).toBeGreaterThanOrEqual(logs[1].ts);
      expect(logs[1].ts).toBeGreaterThanOrEqual(logs[2].ts);
    });

    it('should respect the limit parameter', async () => {
      // 今日のログに10件のイベントを作成
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${dateStr}.jsonl`);

      const events: LogEvent[] = Array.from({ length: 10 }, (_, i) => ({
        type: 'input',
        ts: today.getTime() + i * 1000,
        text: `test ${i}`,
        len: 6
      }));

      const content = events.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(logPath, content, 'utf-8');

      // limit=5 で読み込み
      const logs = await readRecentLogs(7, 5);

      expect(logs).toHaveLength(5);

      // 最新の5件が返されることを確認
      expect(logs[0].ts).toBe(today.getTime() + 9000); // 最新
      expect(logs[4].ts).toBe(today.getTime() + 5000); // 5番目に新しい
    });

    it('should skip corrupted log lines', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${dateStr}.jsonl`);

      // 有効な行と破損した行を混在させる
      const content = [
        JSON.stringify({ type: 'input', ts: Date.now(), text: 'valid 1', len: 7 }),
        'invalid json line',
        JSON.stringify({ type: 'input', ts: Date.now() + 1000, text: 'valid 2', len: 7 }),
        '',
        JSON.stringify({ type: 'input', ts: Date.now() + 2000, text: 'valid 3', len: 7 })
      ].join('\n') + '\n';

      await fs.writeFile(logPath, content, 'utf-8');

      const logs = await readRecentLogs(7, 100);

      // 破損した行はスキップされる
      expect(logs).toHaveLength(3);
      expect(logs[0].text).toBe('valid 3');
      expect(logs[1].text).toBe('valid 2');
      expect(logs[2].text).toBe('valid 1');
    });

    it('should return empty array when no logs exist', async () => {
      const logs = await readRecentLogs(7, 100);
      expect(logs).toEqual([]);
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      // 10日前のログファイルを作成
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const oldDateStr = oldDate.toISOString().split('T')[0];
      const oldLogPath = join(testDir, `logs-${oldDateStr}.jsonl`);
      await fs.writeFile(oldLogPath, '{}', 'utf-8');

      // 3日前のログファイルを作成
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      const recentDateStr = recentDate.toISOString().split('T')[0];
      const recentLogPath = join(testDir, `logs-${recentDateStr}.jsonl`);
      await fs.writeFile(recentLogPath, '{}', 'utf-8');

      // 7日の保持期間でクリーンアップ
      const deletedCount = await cleanOldLogs(7);

      expect(deletedCount).toBe(1);

      // 古いファイルが削除されたことを確認
      await expect(fs.access(oldLogPath)).rejects.toThrow();

      // 新しいファイルは残っていることを確認
      await expect(fs.access(recentLogPath)).resolves.toBeUndefined();
    });

    it('should not delete logs within retention period', async () => {
      // 5日前のログファイルを作成
      const date = new Date();
      date.setDate(date.getDate() - 5);
      const dateStr = date.toISOString().split('T')[0];
      const logPath = join(testDir, `logs-${dateStr}.jsonl`);
      await fs.writeFile(logPath, '{}', 'utf-8');

      // 7日の保持期間でクリーンアップ
      const deletedCount = await cleanOldLogs(7);

      expect(deletedCount).toBe(0);

      // ファイルが残っていることを確認
      await expect(fs.access(logPath)).resolves.toBeUndefined();
    });

    it('should ignore non-log files', async () => {
      // ログファイル以外のファイルを作成
      const nonLogPath = join(testDir, 'aliases.json');
      await fs.writeFile(nonLogPath, '{}', 'utf-8');

      const deletedCount = await cleanOldLogs(7);

      expect(deletedCount).toBe(0);

      // ファイルが残っていることを確認
      await expect(fs.access(nonLogPath)).resolves.toBeUndefined();
    });
  });

  describe('checkFileAccess', () => {
    it('should return true when file access is available', async () => {
      const result = await checkFileAccess();
      expect(result).toBe(true);
    });

    it('should return false when directory is not writable', async () => {
      // ディレクトリを読み取り専用にする
      await fs.chmod(testDir, 0o444);

      const result = await checkFileAccess();
      expect(result).toBe(false);

      // 後処理のために書き込み権限を戻す
      await fs.chmod(testDir, 0o755);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should handle complete log lifecycle', async () => {
      // 1. 入力イベントを記録
      await appendInputLog('search');

      // 2. 起動イベントを記録
      await appendLaunchLog('search-files', {
        type: 'builtin',
        command: 'search-files',
        ownerOrAuthorName: 'raycast'
      });

      // 3. ログを読み込み
      const logs = await readRecentLogs(7, 100);
      expect(logs).toHaveLength(2);

      // タイムスタンプでソートされているので、最新（tsが大きい方）が先
      // launch は input の後に記録されるので、launch が最新
      const launchLog = logs.find(l => l.type === 'launch');
      const inputLog = logs.find(l => l.type === 'input');

      expect(launchLog).toBeDefined();
      expect(inputLog).toBeDefined();
      expect(logs[0].ts).toBeGreaterThanOrEqual(logs[1].ts);

      // 4. ファイルアクセスを確認
      const hasAccess = await checkFileAccess();
      expect(hasAccess).toBe(true);

      // 5. クリーンアップ（今日のログは削除されない）
      const deletedCount = await cleanOldLogs(7);
      expect(deletedCount).toBe(0);
    });
  });
});
