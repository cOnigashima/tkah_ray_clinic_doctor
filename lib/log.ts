/**
 * ログマネージャー
 * タスク 2.1: ログマネージャーの基本機能実装
 */

import { environment } from "@raycast/api";
import { appendFile, readFile, readdir, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { InputEvent, LaunchEvent, LaunchTarget, LogEvent } from "../types";

/**
 * ログファイルのパスを取得
 * @param date 対象日付（デフォルトは今日）
 * @returns ログファイルのフルパス
 */
function getLogFilePath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]; // "2025-10-30"
  return join(environment.supportPath, `logs-${dateStr}.jsonl`);
}

/**
 * supportPath ディレクトリの存在を確認し、必要に応じて作成
 */
async function ensureSupportPathExists(): Promise<void> {
  if (!existsSync(environment.supportPath)) {
    await mkdir(environment.supportPath, { recursive: true });
  }
}

/**
 * 入力イベントをログに追記
 * @param text 入力テキスト
 */
export async function appendInputLog(text: string): Promise<void> {
  await ensureSupportPathExists();

  const event: InputEvent = {
    type: "input",
    ts: Date.now(),
    text,
    len: text.length
  };

  const filePath = getLogFilePath();
  const logLine = JSON.stringify(event) + "\n";

  // アトミックな追記処理（race condition を回避）
  await appendFile(filePath, logLine, "utf-8");
}

/**
 * 起動イベントをログに追記
 * @param aliasId エイリアス ID
 * @param target 起動ターゲット詳細
 */
export async function appendLaunchLog(
  aliasId: string,
  target: LaunchTarget
): Promise<void> {
  await ensureSupportPathExists();

  const event: LaunchEvent = {
    type: "launch",
    ts: Date.now(),
    aliasId,
    target
  };

  const filePath = getLogFilePath();
  const logLine = JSON.stringify(event) + "\n";

  // アトミックな追記処理（race condition を回避）
  await appendFile(filePath, logLine, "utf-8");
}

/**
 * 過去 N 日間のログを読み込み
 * @param days 読み込む日数（デフォルト: 7日）
 * @param limit 最大イベント数（デフォルト: 100件）
 * @returns ログイベントの配列
 */
export async function readRecentLogs(
  days: number = 7,
  limit: number = 100  // Claude API トークン予算: 100イベント≒2,500トークン
): Promise<LogEvent[]> {
  await ensureSupportPathExists();
  const events: LogEvent[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const filePath = getLogFilePath(date);

    if (existsSync(filePath)) {
      const data = await readFile(filePath, "utf-8");
      const lines = data.trim().split('\n');

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            events.push(event);
          } catch (e) {
            // 破損した JSON 行はスキップ（要件 9.6）
            console.error("Failed to parse log line:", line, e);
          }
        }
      }
    }
  }

  // タイムスタンプでソート（新しい順）してから limit 件を返す
  events.sort((a, b) => b.ts - a.ts);
  return events.slice(0, limit);
}

/**
 * 古いログファイルを削除
 * @param retentionDays 保持日数（デフォルト: 7日）
 * @returns 削除されたファイル数
 */
export async function cleanOldLogs(retentionDays: number = 7): Promise<number> {
  await ensureSupportPathExists();

  let deletedCount = 0;

  try {
    const files = await readdir(environment.supportPath);
    const now = new Date();

    for (const file of files) {
      if (file.startsWith("logs-") && file.endsWith(".jsonl")) {
        const dateStr = file.replace("logs-", "").replace(".jsonl", "");
        const logDate = new Date(dateStr);
        const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > retentionDays) {
          const filePath = join(environment.supportPath, file);
          await unlink(filePath);
          deletedCount++;
          console.log(`[Security] Deleted old log file: ${file} (${daysDiff} days old)`);
        }
      }
    }
  } catch (e) {
    // ファイルシステムエラーは静かに失敗（要件 2.9）
    console.error("[Security] Failed to clean old logs:", e);
  }

  return deletedCount;
}

/**
 * ファイルアクセス権限を確認
 * @returns アクセス可能かどうか
 */
export async function checkFileAccess(): Promise<boolean> {
  try {
    await ensureSupportPathExists();

    // テストファイルの書き込みと削除でアクセス確認
    const testFilePath = join(environment.supportPath, ".access_test");
    await appendFile(testFilePath, "test", "utf-8");
    await unlink(testFilePath);

    console.log("[Security] File access check: OK");
    return true;
  } catch (e) {
    console.error("[Security] File access check failed:", e);
    return false;
  }
}
