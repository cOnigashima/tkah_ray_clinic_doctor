# Project Structure: Command Critic (cc-sdd)

## Root Directory Organization

### Current Structure
```
tkah_ray_clinic_doctor/
├── .claude/                    # Claude Code configuration
│   └── commands/
│       └── kiro/              # Kiro slash commands
│           ├── spec-init.md
│           ├── spec-requirements.md
│           ├── spec-design.md
│           ├── spec-tasks.md
│           ├── spec-impl.md
│           ├── spec-status.md
│           ├── validate-design.md
│           ├── validate-gap.md
│           ├── steering.md
│           └── steering-custom.md
├── .kiro/                     # Kiro specs and steering
│   ├── specs/                 # Feature specifications
│   │   └── command-critic-raycast/
│   │       ├── spec.json
│   │       └── requirements.md
│   └── steering/              # Project steering documents
│       ├── product.md
│       ├── tech.md
│       └── structure.md
├── .git/                      # Git repository
└── CLAUDE.md                  # Claude Code instructions
```

### Planned Structure (Post-Implementation)
```
tkah_ray_clinic_doctor/
├── src/                       # Source code (UI components)
│   ├── launcher.tsx          # ログ収集ランチャー UI
│   ├── critic.tsx            # AI 分析結果表示 UI
│   └── onboarding.tsx        # オンボーディングフロー UI
├── lib/                       # Core business logic
│   ├── log.ts                # ログ管理（JSONL 読み書き）
│   ├── claude.ts             # Claude API 統合（分析完全委譲）
│   ├── templates.ts          # テンプレート生成（snippet/macro）
│   └── aliases.ts            # エイリアス管理
├── types/                     # TypeScript type definitions
│   └── index.ts              # 共通型定義
├── .claude/                   # Claude Code configuration
├── .kiro/                     # Kiro specs and steering
├── package.json              # npm dependencies
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Project documentation
└── CLAUDE.md                 # Claude Code instructions
```

## Subdirectory Structures

### `/src/` - UI Components
**Purpose**: Raycast 拡張機能の画面コンポーネント

| File | Component Type | Description |
|------|---------------|-------------|
| `launcher.tsx` | **List** | ログ収集用ランチャー（検索バー + エイリアスリスト） |
| `critic.tsx` | **Detail** | AI 分析結果表示（提案カード表示） |
| `onboarding.tsx` | **Form** | 初回セットアップ（エイリアス登録） |

**Key Patterns**:
- Raycast API コンポーネント使用（`List`, `Detail`, `Form`）
- React フック活用（`useState`, `usePromise`, `useEffect`）
- イベントハンドラーでログ保存（`onSearchTextChange`, `onAction`）

### `/lib/` - Core Logic
**Purpose**: ビジネスロジックと外部統合

| File | Responsibility | Exports |
|------|---------------|---------|
| `log.ts` | JSONL ログ管理 | `appendInputLog()`, `appendLaunchLog()`, `readRecentLogs()`, `cleanOldLogs()` |
| `claude.ts` | Claude API 統合（完全委譲） | `buildPrompt()`, `fetchAnalysis()`, `parseResponse()` |
| `templates.ts` | テンプレート生成 | `generateSnippetYAML()`, `generateMacroShell()` |
| `aliases.ts` | エイリアス管理 | `getAliases()`, `addAlias()`, `saveAliases()` |

**Key Patterns**:
- **Single Responsibility**: 各ファイルが単一の責任を持つ
- **Async/Await**: 非同期処理の統一的な扱い
- **Error Handling**: 基本的な try-catch とエラーメッセージ
- **No Local Analysis**: 分析ロジックは Claude API に完全委譲

### `/types/` - Type Definitions
**Purpose**: TypeScript 型定義の集約

```typescript
// types/index.ts (新設計に準拠)
export interface InputEvent {
  type: "input";
  ts: number;           // Unix timestamp (milliseconds)
  text: string;         // 入力テキスト（生データ）
  len: number;          // テキスト長
}

export interface LaunchEvent {
  type: "launch";
  ts: number;           // Unix timestamp (milliseconds)
  aliasId: string;      // エイリアス ID
  target: {             // 起動ターゲット詳細
    owner: string;        // 拡張機能オーナー
    extension: string;    // 拡張機能名
    command: string;      // コマンド名
  };
  args?: Record<string, any>;  // オプション引数
}

export interface Alias {
  id: string;
  title: string;
  target: {
    owner: string;
    extension: string;
    command: string;
    qs?: string;        // クエリストリング
  };
  suggestHotkey?: string;
}

export interface Proposal {
  type: 'shortcut' | 'snippet' | 'macro';
  title: string;
  rationale: string;
  evidence: {
    aliases?: string[];
    count?: number;
    time_windows?: string[];
  };
  payload: {
    shortcut?: { aliasId: string; suggestedHotkey: string };
    snippet?: { text: string; alias: string };
    macro?: { sequence: string[] };
  };
  confidence: number;
}

export interface AnalysisResponse {
  proposals: Proposal[];
}
```

### `/.kiro/` - Spec-Driven Development
**Purpose**: Kiro ワークフローの仕様管理

| Directory | Content | Format |
|-----------|---------|--------|
| `specs/` | 機能仕様 | `spec.json` + `requirements.md` + `design.md` + `tasks.md` |
| `steering/` | プロジェクト全体の方針 | `product.md`, `tech.md`, `structure.md` |

### `/.claude/` - Claude Code Configuration
**Purpose**: Claude Code のカスタムコマンド

| Directory | Content | Format |
|-----------|---------|--------|
| `commands/kiro/` | Kiro スラッシュコマンド | `.md` ファイル（コマンド定義） |

## Code Organization Patterns

### Component Structure (React)
```tsx
// src/launcher.tsx (例)
import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { appendInputLog, appendLaunchLog } from "../lib/log";

export default function Launcher() {
  const [searchText, setSearchText] = useState("");
  const aliases = [/* ... */];

  // 検索テキスト変更時にログ保存
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    appendInputLog(text);
  };

  // コマンド起動時にログ保存
  const handleAction = (alias: Alias) => {
    appendLaunchLog(alias.id, alias.target);
    // launchCommand または Deeplink で起動
  };

  return (
    <List onSearchTextChange={handleSearchTextChange}>
      {aliases.map((alias) => (
        <List.Item
          key={alias.id}
          title={alias.name}
          actions={
            <ActionPanel>
              <Action title="Launch" onAction={() => handleAction(alias.id, alias.target)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Business Logic Structure
```typescript
// lib/log.ts (fs/promises + supportPath 版)
import { environment } from "@raycast/api";
import { appendFile, readFile, readdir, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { InputEvent, LaunchEvent } from "../types";

function getLogFilePath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]; // "2025-10-30"
  return join(environment.supportPath, `logs-${dateStr}.jsonl`);
}

async function ensureSupportPathExists(): Promise<void> {
  if (!existsSync(environment.supportPath)) {
    await mkdir(environment.supportPath, { recursive: true });
  }
}

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

  // ⚠️ アトミックな追記処理（read-modify-write による race condition を回避）
  await appendFile(filePath, logLine, "utf-8");
}

export async function appendLaunchLog(
  aliasId: string,
  target: { owner: string; extension: string; command: string }
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

  // ⚠️ アトミックな追記処理（read-modify-write による race condition を回避）
  await appendFile(filePath, logLine, "utf-8");
}

export async function readRecentLogs(
  days: number = 7,
  limit: number = 100  // Claude API トークン予算: 100イベント≒2,500トークン
): Promise<(InputEvent | LaunchEvent)[]> {
  await ensureSupportPathExists();
  const events: (InputEvent | LaunchEvent)[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const filePath = getLogFilePath(date);

    if (existsSync(filePath)) {
      const data = await readFile(filePath, "utf-8");
      const lines = data.trim().split('\n');

      lines.forEach(line => {
        if (line.trim()) {
          try {
            events.push(JSON.parse(line));
          } catch (e) {
            console.error("Failed to parse log line:", line);
          }
        }
      });
    }
  }

  return events.slice(0, limit);
}

export async function cleanOldLogs(retentionDays: number = 7): Promise<void> {
  await ensureSupportPathExists();
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
      }
    }
  }
}
```

### API Integration Structure
```typescript
// lib/claude.ts (完全委譲版)
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import type { InputEvent, LaunchEvent, AnalysisResponse, Proposal } from "../types";

interface Preferences {
  apiKey: string;
}

export function buildPrompt(logs: (InputEvent | LaunchEvent)[]): string {
  const logsJsonl = logs.map(log => JSON.stringify(log)).join('\n');

  return `# RAW_LOGS (last 7 days, max 500 events)
${logsJsonl}

# RULES
- frequent launch: count(aliasId) >= 10/7d → shortcut suggestion
- repeated long input: len >= 20 and same text >= 3 → snippet suggestion
- chain: pattern A->B->C within 10 minutes repeated >= 2 → macro suggestion
- output up to 3 proposals, prioritize chain > frequent > long
- respond ONLY with JSON matching the schema below.

# OUTPUT_SCHEMA
{
  "proposals": [
    {
      "type": "shortcut|snippet|macro",
      "title": "string",
      "rationale": "string (max 80 chars)",
      "evidence": {
        "aliases": ["..."],
        "count": 0,
        "time_windows": ["HH:MM-HH:MM JST"]
      },
      "payload": {
        "shortcut": { "aliasId": "id", "suggestedHotkey": "Alt+Cmd+K" },
        "snippet": { "text": "the repeated text", "alias": "short" },
        "macro": { "sequence": ["AliasA", "AliasB", "AliasC"] }
      },
      "confidence": 0.0
    }
  ]
}`;
}

export async function fetchAnalysis(
  logs: (InputEvent | LaunchEvent)[]
): Promise<Proposal[]> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const prompt = buildPrompt(logs);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: "You are 'Command Critic', an expert at optimizing Raycast usage. Analyze logs and propose actionable improvements.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return parseResponse(data);
}

export function parseResponse(apiResponse: any): Proposal[] {
  try {
    // Claude APIのレスポンスからテキストを抽出
    const content = apiResponse.content?.[0]?.text || "";
    const parsed: AnalysisResponse = JSON.parse(content);
    return parsed.proposals || [];
  } catch (e) {
    console.error("Failed to parse Claude response:", e);
    return []; // エラー時は空配列を返す
  }
}
```

## File Naming Conventions

### Component Files
- **Pattern**: `kebab-case.tsx` or `camelCase.tsx`
- **Example**: `launcher.tsx`, `critic.tsx`, `onboarding.tsx`
- **Rule**: UI コンポーネントは `.tsx` 拡張子

### Logic Files
- **Pattern**: `camelCase.ts`
- **Example**: `log.ts`, `claude.ts`, `templates.ts`
- **Rule**: ビジネスロジックは `.ts` 拡張子

### Type Definition Files
- **Pattern**: `index.ts` or `types.ts`
- **Example**: `types/index.ts`
- **Rule**: 型定義は集約して export

### Spec Files
- **Pattern**: `kebab-case/` + standard names
- **Example**: `command-critic-raycast/spec.json`
- **Rule**: 仕様ディレクトリは feature name、ファイル名は固定

## Import Organization

### Import Order
```typescript
// 1. External libraries (Raycast, React, etc.)
import { List, Detail, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";

// 2. Internal modules (lib/, types/)
import { fetchSuggestions } from "../lib/claude";
import { readLogs } from "../lib/log";
import type { Suggestion } from "../types";

// 3. Local utilities (if any)
import { formatDate } from "./utils";
```

### Path Conventions
- **Relative Imports**: `../lib/`, `../types/`
- **No Absolute Imports**: Raycast 拡張機能では相対パス推奨
- **Type Imports**: `import type { ... }` で型のみインポート

## Key Architectural Principles

### 1. Separation of Concerns
- **UI Layer** (`src/`): 画面表示とユーザー入力処理
- **Business Logic** (`lib/`): ログ管理、API 統合、テンプレート生成
- **Type Layer** (`types/`): 型定義の集約

### 2. Stateless Components
- React フックで状態管理
- コンポーネント間の直接的な依存を避ける
- `lib/` 層を通じたデータ共有

### 3. AI-Complete Delegation
- ローカル分析ロジックを完全排除
- すべての分析判断を Claude API に委譲
- 頻出検出・長文反復・連鎖パターンすべて AI が実行
- JSON レスポンスをそのまま UI に反映

### 4. Local-First Storage
- `environment.supportPath` と `fs/promises` 活用
- JSONL 形式で日次パーティション保存（`logs-YYYY-MM-DD`）
- 生データ保存（マスキングなし、ローカルのみ）
- プライバシー保護（外部送信は明示的トリガーのみ）
- 自動ローテーション（7日以上前のファイル削除）

### 5. Template-Based Actions
- 提案の実装は YAML/Shell テンプレート生成
- コピー＆ペーストで適用可能
- Deeplink で設定画面へ誘導

### 6. MVP Scope Constraints
- 5 時間ハッカソンスコープに最適化
- テストコード省略
- エラーハンドリング最小限
- UI ポリッシュ後回し

## Directory Creation Guidelines

### When to Create New Directories
- **Feature Expansion**: 新機能追加時に `/features/` ディレクトリ作成検討
- **Shared Utilities**: 共通ユーティリティが増えた場合 `/utils/` 作成
- **Assets**: 画像・アイコンが必要な場合 `/assets/` 作成

### When NOT to Create New Directories
- MVP スコープでは上記構造を維持
- 過度な抽象化を避ける
- フラットな構造を保つ（深さ 2 階層まで）

## Code Review Checklist

### File Organization
- [ ] UI コンポーネントは `/src/` に配置
- [ ] ビジネスロジックは `/lib/` に配置
- [ ] 型定義は `/types/` に集約
- [ ] import 順序が統一されている

### Naming Conventions
- [ ] コンポーネントファイルは `.tsx`
- [ ] ロジックファイルは `.ts`
- [ ] camelCase または kebab-case を一貫して使用

### Architectural Compliance
- [ ] UI と business logic が分離されている
- [ ] Raycast API コンポーネント使用
- [ ] LocalStorage API 活用
- [ ] Claude API 統合が適切
