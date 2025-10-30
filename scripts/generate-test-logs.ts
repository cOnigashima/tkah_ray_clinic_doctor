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
 * ランダムな時刻を生成（指定日の営業時間内、時間帯パターン考慮）
 */
function randomTime(date: Date, timePattern?: "morning" | "lunch" | "afternoon" | "evening"): number {
  let hour: number;

  if (timePattern === "morning") {
    hour = 9 + Math.floor(Math.random() * 3); // 9:00-11:59
  } else if (timePattern === "lunch") {
    hour = 12 + Math.floor(Math.random() * 2); // 12:00-13:59
  } else if (timePattern === "afternoon") {
    hour = 14 + Math.floor(Math.random() * 4); // 14:00-17:59
  } else if (timePattern === "evening") {
    hour = 18 + Math.floor(Math.random() * 2); // 18:00-19:59
  } else {
    hour = 9 + Math.floor(Math.random() * 9); // 9:00-17:59
  }

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

  // 高頻度コマンド（週10回以上）
  const frequentCommands = [
    { id: "search-files", name: "Search Files", weight: 20, owner: "raycast", ext: "file-search" },
    { id: "clipboard-history", name: "Clipboard History", weight: 15, owner: "raycast", ext: "clipboard-history" },
    { id: "window-management", name: "Window Management", weight: 12, owner: "raycast", ext: "window-management" },
  ];

  // 中頻度コマンド（週3-9回）
  const mediumCommands = [
    { id: "calculator", name: "Calculator", weight: 8, owner: "raycast", ext: "calculator" },
    { id: "emoji-search", name: "Emoji Search", weight: 6, owner: "raycast", ext: "emoji" },
    { id: "github-search", name: "GitHub Search", weight: 7, owner: "raycast", ext: "github" },
    { id: "notion-search", name: "Notion Search", weight: 5, owner: "raycast", ext: "notion" },
  ];

  // 低頻度コマンド（週1-2回）
  const occasionalCommands = [
    { id: "system-sleep", name: "System Sleep", weight: 2, owner: "raycast", ext: "system" },
    { id: "screen-capture", name: "Screen Capture", weight: 2, owner: "raycast", ext: "screenshot" },
    { id: "translate", name: "Translate", weight: 3, owner: "raycast", ext: "translate" },
    { id: "color-picker", name: "Color Picker", weight: 2, owner: "raycast", ext: "color-picker" },
    { id: "speedtest", name: "Speedtest", weight: 1, owner: "raycast", ext: "speedtest" },
    { id: "coffee-break", name: "Coffee Break Timer", weight: 2, owner: "raycast", ext: "timers" },
  ];

  // 繰り返し入力される長いテキスト（スニペット提案用）
  const repeatedTexts = [
    "console.log(",
    "import { useState } from 'react'",
    "git commit -m \"",
    "const [state, setState] = useState",
    "export default function Component() {",
    "meeting notes: {{date}}",
    "TODO: Review and merge PR",
    "https://github.com/anthropics/",
    "Best regards,\n\nYour Name",
    "npm install --save-dev",
    "docker-compose up -d",
    "kubectl get pods -n production",
  ];

  // Phase 2: 拡張機能推奨を検出するためのキーワード付き入力
  const extensionHintTexts = [
    "JIRA-1234",
    "jira ticket",
    "github.com/raycast/extensions",
    "notion.so/workspace",
    "linear LIN-456",
    "figma.com/file/abc123",
    "slack #engineering",
  ];

  // マクロ連鎖パターンの定義
  const macroPatterns = [
    ["clipboard-history", "search-files", "window-management"], // コピー→検索→整理
    ["github-search", "notion-search"], // GitHub→Notion
    ["calculator", "clipboard-history"], // 計算→コピー
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

    // その日のイベント数（30-50件）
    const eventCount = 30 + Math.floor(Math.random() * 20);

    // 時間帯パターン（午前/昼/午後/夕方）
    const timePatterns: Array<"morning" | "lunch" | "afternoon" | "evening"> =
      ["morning", "lunch", "afternoon", "evening"];

    for (let j = 0; j < eventCount; j++) {
      // 時間帯をランダムに選択（午後が多め）
      const timePattern = timePatterns[
        Math.random() < 0.4 ? 2 : Math.floor(Math.random() * timePatterns.length)
      ];
      const ts = randomTime(date, timePattern);

      // 70%の確率で検索入力
      if (Math.random() < 0.7) {
        let text: string;
        const rand = Math.random();

        if (rand < 0.25) {
          // 25%: 繰り返しテキスト（スニペット候補）
          text = repeatedTexts[Math.floor(Math.random() * repeatedTexts.length)];
        } else if (rand < 0.35) {
          // 10%: 拡張機能ヒント用キーワード
          text = extensionHintTexts[Math.floor(Math.random() * extensionHintTexts.length)];
        } else {
          // 65%: ランダムな検索テキスト
          const searches = [
            "file", "calc", "emoji", "clip", "window", "git", "doc", "test",
            "github", "notion", "jira", "slack", "linear", "figma"
          ];
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
      // 50%頻繁/30%中頻度/20%低頻度
      const rand = Math.random();
      let commandPool;
      if (rand < 0.5) {
        commandPool = frequentCommands;
      } else if (rand < 0.8) {
        commandPool = mediumCommands;
      } else {
        commandPool = occasionalCommands;
      }

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
          ownerOrAuthorName: selectedCommand.owner
        }
      });
    }

    // マクロ連鎖パターンを2-3回追加
    const macroCount = 2 + Math.floor(Math.random() * 2);
    for (let m = 0; m < macroCount; m++) {
      const pattern = macroPatterns[Math.floor(Math.random() * macroPatterns.length)];
      let baseTime = randomTime(date, "afternoon");

      for (let step = 0; step < pattern.length; step++) {
        const cmdId = pattern[step];
        const cmd = [...frequentCommands, ...mediumCommands, ...occasionalCommands]
          .find(c => c.id === cmdId);

        if (cmd) {
          events.push({
            type: "launch",
            ts: baseTime + (step * 2 * 60 * 1000), // 2分間隔
            aliasId: cmd.id,
            target: {
              type: "builtin",
              command: cmd.id,
              ownerOrAuthorName: cmd.owner
            }
          });
        }
      }
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
  console.log(`  - ショートカット: Search Files (高頻度: ~20回/日)`);
  console.log(`  - ショートカット: Clipboard History (高頻度: ~15回/日)`);
  console.log(`  - スニペット: "console.log(", "import { useState }", "git commit -m" など`);
  console.log(`  - マクロ: Clipboard → Search Files → Window Management`);
  console.log(`  - 拡張機能推奨: Jira, GitHub, Notion, Linear など`);
  console.log(`\n💡 次のステップ:`);
  console.log(`  1. Raycast で "Clinic" コマンドを実行`);
  console.log(`  2. AI 分析結果を確認`);
  console.log(`  3. 提案カードと拡張機能推奨が表示されることを確認`);
}

// スクリプト実行
generateTestLogs().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
