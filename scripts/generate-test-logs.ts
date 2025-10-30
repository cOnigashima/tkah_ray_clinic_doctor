/**
 * テスト用ログ生成スクリプト
 *
 * 使い方:
 * npx tsx scripts/generate-test-logs.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Raycast のサポートパスをシミュレート
const SUPPORT_PATH = join(process.env.HOME || "", "Library/Application Support/com.raycast.macos/extensions/command-clinic-raycast");

interface InputEvent {
  type: "input";
  ts: number;
  text: string;
  len: number;
}

interface LaunchEvent {
  type: "launch";
  ts: number;
  aliasId: string;
  target: {
    type: "builtin" | "extension";
    command: string;
    ownerOrAuthorName: string;
    extensionName?: string;
  };
}

type LogEvent = InputEvent | LaunchEvent;

/**
 * ランダムな時刻を生成（指定日の営業時間内）
 */
function randomTime(date: Date): number {
  const hour = 9 + Math.floor(Math.random() * 9); // 9:00-17:59
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  const newDate = new Date(date);
  newDate.setHours(hour, minute, second, 0);
  return newDate.getTime();
}

/**
 * テストログを生成
 */
async function generateTestLogs() {
  console.log("🚀 テスト用ログを生成しています...");
  console.log(`📁 出力先: ${SUPPORT_PATH}`);

  // ディレクトリ作成
  if (!existsSync(SUPPORT_PATH)) {
    await mkdir(SUPPORT_PATH, { recursive: true });
    console.log("✅ ディレクトリを作成しました");
  }

  // よく使うコマンドパターン
  const frequentCommands = [
    { id: "search-files", name: "Search Files", weight: 15 },
    { id: "clipboard-history", name: "Clipboard History", weight: 10 },
    { id: "window-management", name: "Window Management", weight: 8 },
  ];

  const occasionalCommands = [
    { id: "calculator", name: "Calculator", weight: 5 },
    { id: "emoji-search", name: "Emoji Search", weight: 4 },
    { id: "system-sleep", name: "System Sleep", weight: 2 },
  ];

  // 繰り返し入力される長いテキスト（スニペット提案用）
  const repeatedTexts = [
    "console.log(",
    "import { useState } from 'react'",
    "git commit -m \"",
  ];

  // 過去7日間のログを生成
  const today = new Date();
  let totalEvents = 0;

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const filePath = join(SUPPORT_PATH, `logs-${dateStr}.jsonl`);

    const events: LogEvent[] = [];

    // その日のイベント数（10-30件）
    const eventCount = 10 + Math.floor(Math.random() * 20);

    for (let j = 0; j < eventCount; j++) {
      const ts = randomTime(date);

      // 60%の確率で検索入力
      if (Math.random() < 0.6) {
        // 30%の確率で繰り返しテキスト（スニペット候補）
        let text: string;
        if (Math.random() < 0.3) {
          text = repeatedTexts[Math.floor(Math.random() * repeatedTexts.length)];
        } else {
          // ランダムな検索テキスト
          const searches = ["file", "calc", "emoji", "clip", "window", "git", "doc", "test"];
          text = searches[Math.floor(Math.random() * searches.length)];
        }

        events.push({
          type: "input",
          ts,
          text,
          len: text.length
        });
      }

      // 起動イベント
      // 80%の確率で頻繁なコマンド、20%でたまに使うコマンド
      const commandPool = Math.random() < 0.8 ? frequentCommands : occasionalCommands;
      const totalWeight = commandPool.reduce((sum, cmd) => sum + cmd.weight, 0);
      let random = Math.random() * totalWeight;

      let selectedCommand = commandPool[0];
      for (const cmd of commandPool) {
        random -= cmd.weight;
        if (random <= 0) {
          selectedCommand = cmd;
          break;
        }
      }

      events.push({
        type: "launch",
        ts: ts + 1000, // 入力の1秒後に起動
        aliasId: selectedCommand.id,
        target: {
          type: "builtin",
          command: selectedCommand.id,
          ownerOrAuthorName: "raycast"
        }
      });
    }

    // タイムスタンプでソート
    events.sort((a, b) => a.ts - b.ts);

    // JSONL形式で書き込み
    const content = events.map(e => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(filePath, content, 'utf-8');

    totalEvents += events.length;
    console.log(`✅ ${dateStr}: ${events.length}件のイベントを生成`);
  }

  console.log(`\n🎉 完了！合計 ${totalEvents} 件のイベントを生成しました`);
  console.log(`\n📊 期待される提案:`);
  console.log(`  - ショートカット: Search Files (高頻度: ~15回/7日)`);
  console.log(`  - ショートカット: Clipboard History (高頻度: ~10回/7日)`);
  console.log(`  - スニペット: "console.log(", "import { useState }" など`);
  console.log(`\n💡 次のステップ:`);
  console.log(`  1. Raycast で "Clinic" コマンドを実行`);
  console.log(`  2. AI 分析結果を確認`);
  console.log(`  3. 提案カードが表示されることを確認`);
}

// スクリプト実行
generateTestLogs().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
