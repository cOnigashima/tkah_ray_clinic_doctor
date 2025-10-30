# Technology Stack: Command Critic (cc-sdd)

## Architecture

### High-Level System Design
```
┌─────────────────────────────────────────────────────────┐
│                    Raycast Extension                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Launcher   │  │   Critic     │  │  Onboarding    │ │
│  │   (UI)      │  │    (UI)      │  │     (UI)       │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────┘ │
│         │                 │                              │
│         ▼                 ▼                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Log         │  │  Claude      │  │  Templates     │ │
│  │  Manager     │  │  Integration │  │  Generator     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────┘ │
│         │                 │                              │
│         ▼                 ▼                              │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ supportPath  │  │  Claude API  │                    │
│  │ (JSONL)      │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Architecture Principles
1. **AI-Complete Delegation**: ローカル分析ロジックを完全排除し、Claude API に全て委譲
2. **JSONL Storage**: ログデータを JSONL 形式で日次ファイルに保存（プライバシー保護）
3. **Minimal UI**: 3 画面構成（Launcher / Critic / Onboarding）に限定
4. **Stateless Components**: React フック活用による状態管理
5. **Template-Driven**: 提案の実装は YAML/Shell テンプレート生成で対応

## Frontend

### Framework & Libraries
- **TypeScript**: 型安全な開発環境
- **React**: Raycast API の標準 UI フレームワーク
- **Raycast API**: 拡張機能開発用の公式 API
  - `@raycast/api`: コア API（List, Detail, Form など）
  - `@raycast/utils`: ユーティリティ（`usePromise` など）

### UI Components
| Component | Description | File |
|-----------|-------------|------|
| **Launcher** | ログ収集用ランチャー UI（検索バー + エイリアスリスト） | `launcher.tsx` |
| **Critic** | AI 分析結果表示 UI（提案カード表示） | `critic.tsx` |
| **Onboarding** | 初回セットアップフロー（Step 3: エイリアス登録） | `onboarding.tsx` |

### State Management
- **File System**: ログデータの永続化（`environment.supportPath` + `fs/promises`）
- **React Hooks**:
  - `useState`: ローカル UI 状態
  - `usePromise`: 非同期処理（AI 分析）
  - `useEffect`: 副作用処理（ログ保存）

## Backend

### Runtime Environment
- **Node.js**: Raycast 拡張機能の実行環境
- **File System API**: Node.js `fs/promises` モジュール
- **Environment API**: `environment.supportPath` でログ保存先を取得

### Data Storage
#### Log Format (JSONL)
保存場所：`environment.supportPath/logs-YYYYMMDD.jsonl`（日次パーティション）

```typescript
// InputEvent: ユーザー入力ログ
{
  type: "input",
  ts: number,        // Unix timestamp (milliseconds)
  text: string,      // 入力テキスト（生データ、マスクなし）
  len: number        // テキスト長
}

// LaunchEvent: コマンド起動ログ
{
  type: "launch",
  ts: number,        // Unix timestamp (milliseconds)
  aliasId: string,   // エイリアス ID
  target: {          // 起動ターゲット詳細
    owner: string,     // 拡張機能オーナー (例: "raycast")
    extension: string, // 拡張機能名 (例: "file-search")
    command: string    // コマンド名 (例: "search-files")
  },
  args?: Record<string, any>  // オプション引数
}
```

#### Storage Strategy
- **保存場所**: `environment.supportPath` 配下（Raycast 提供の専用ディレクトリ）
- **日次パーティション**: `logs-2025-10-30.jsonl` 形式でファイル分割
- **追記オンリー**: 既存ログの変更なし、新規イベントは末尾に追加
- **ファイル操作**: Node.js `fs/promises` モジュール使用（`writeFile`, `readFile`, `readdir`, `unlink`）
- **保持期間**: 直近 7 日分を自動保持（古いファイルは削除）
- **読み込み最適化**: 分析時は直近 7 日 / 最大 100 件に制限（Claude APIトークン予算対策）

#### 重要な実装注意点
- ⚠️ **LocalStorage は使用しない**（大容量データには不向き）
- ✅ **`environment.supportPath` を必ず使用**（拡張パッケージは読み取り専用）
- ✅ **`fs/promises` で async/await 形式**（同期 API は避ける）

### External API Integration
#### Claude API
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Authentication**: API キー（Raycast Preferences から取得）
- **Model**: `claude-3-5-sonnet-20241022`（推奨）

#### Request Format
```typescript
{
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 2048,
  system: "You are 'Command Critic', an expert at optimizing Raycast usage...",
  messages: [{
    role: "user",
    content: `
# RAW_LOGS (last 7 days, max 100 events)
${logsJsonl}

# RULES
- frequent launch: count(aliasId) >= 10/7d
- repeated long input: len >= 20 and same text >= 3
- chain: pattern A->B->C within 10 minutes repeated >= 2
- output up to 3 proposals, prioritize chain > frequent > long
- respond ONLY with JSON matching the schema below.

# OUTPUT_SCHEMA
{ "proposals": [...] }
    `
  }]
}
```

#### Response Format
```json
{
  "proposals": [
    {
      "type": "shortcut" | "snippet" | "macro",
      "title": "頻出コマンド「X」にホットキーを",
      "rationale": "過去7日で15回起動",
      "evidence": {
        "aliases": ["open_repo"],
        "count": 15,
        "time_windows": ["09:00-11:00 JST"]
      },
      "payload": {
        "shortcut": { "aliasId": "open_repo", "suggestedHotkey": "Alt+Cmd+O" },
        "snippet": { "text": "meeting-notes-{{date}}", "alias": "mn" },
        "macro": { "sequence": ["AliasA", "AliasB", "AliasC"] }
      },
      "confidence": 0.85
    }
  ]
}
```

#### Analysis Logic (Delegated to Claude)
すべての分析ロジックは Claude に委譲：
- **頻出検出**: `count(aliasId) >= 10/7d` → ショートカット化提案
- **長文反復**: `len >= 20 ∧ same text >= 3` → スニペット化提案
- **連鎖パターン**: `A→B→C within 10min ∧ ≥2 occurrences` → マクロ化提案
- **優先順位**: 連鎖 > 頻出 > 長文
- **出力制限**: 最大 3 件、重複除外

### HTTP Client
- **node-fetch**: Claude API への HTTP リクエスト

### Cross-Extension Launch (他拡張・Raycast 標準機能の起動)

#### launchCommand API - Raycast 標準機能（推奨）
Raycast ビルトイン機能は `launchCommand` で起動可能：

```typescript
import { launchCommand, LaunchType } from "@raycast/api";

// ✅ Raycast 標準機能を起動（公式API、動作保証）
await launchCommand({
  extensionName: "file-search",
  ownerOrAuthorName: "raycast",  // Raycast ビルトインは常に "raycast"
  name: "search-files",
  type: LaunchType.UserInitiated
});
```

**推奨する Raycast 標準機能**:
- File Search (`raycast/file-search/search-files`)
- Clipboard History (`raycast/clipboard-history/clipboard-history`)
- Window Management (`raycast/window-management/...`)
- System Commands (`raycast/system/...`)

#### crossLaunchCommand API - サードパーティ拡張（実験的）
⚠️ **サードパーティ拡張の起動は未検証のMVPリスク**

```typescript
// ⚠️ 要検証: crossLaunchCommand パッケージが必要
import { crossLaunchCommand } from "raycast-cross-extension";

// サードパーティ拡張を起動（動作保証なし）
await crossLaunchCommand({
  extensionName: "my-extension",
  ownerOrAuthorName: "author-name",
  name: "my-command",
  context: { /* optional data */ }
});
```

#### Deeplink による起動（代替手段）
```typescript
import { open } from "@raycast/api";

// Raycast 標準機能
await open("raycast://extensions/raycast/file-search/search-files");

// サードパーティ拡張（ユーザー許可プロンプトあり）
await open("raycast://extensions/author/extension/command");
```

#### 重要な制約と実装ガイドライン
- ✅ **Raycast 標準機能のみ使用を推奨**（`launchCommand` で動作保証）
- ⚠️ **サードパーティ拡張は初回手動起動が必要**（許可プロンプト対応）
- ⚠️ **実装前に30分のPoC検証を強く推奨**（`launchCommand` 動作確認）
- ✅ ユーザーが「Always Open Command」を選択すれば、以降は許可不要
- ✅ オンボーディングで Raycast 標準機能を優先推奨（80%カバレッジ目標）
- ⚠️ `crossLaunchCommand` はコミュニティ規約（公式機能ではない）
- ⚠️ ターゲット拡張が未インストールの場合、Storeへリダイレクト

#### MVP実装戦略
1. **Phase 1**: Raycast 標準機能のみサポート（File Search, Clipboard History等）
2. **Phase 2**: 実装時にサードパーティ拡張の PoC 検証（30分）
3. **Phase 3**: 検証成功時のみ `crossLaunchCommand` 統合を検討

## Development Environment

### Required Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 16.x+ | JavaScript ランタイム |
| **npm** | 7.x+ | パッケージマネージャー |
| **TypeScript** | 4.x+ | 型定義・コンパイラ |
| **Raycast** | Latest | 拡張機能実行環境 |

### Development Dependencies
```json
{
  "@raycast/api": "^1.x",
  "@raycast/utils": "^1.x",
  "node-fetch": "^3.x",
  "typescript": "^4.x"
}
```

### Project Setup
```bash
# プロジェクト初期化（予定）
npm install

# 開発モード（Raycast 内でリロード）
npm run dev

# ビルド
npm run build

# リンター
npm run lint
```

## Common Commands

### Development Workflow
```bash
# Raycast 拡張機能のリロード
⌘ + R (Raycast 内)

# ログ確認
tail -f /path/to/raycast/logs

# TypeScript 型チェック
npx tsc --noEmit
```

### Testing & Debugging
```bash
# ログクリア（開発中）
# LocalStorage API 経由で手動クリア

# API リクエストテスト
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-...","messages":[...]}'
```

## Environment Variables

### Required Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API 認証キー | `sk-ant-...` |

### Raycast Preferences (ユーザー設定)
- **API Key**: Preferences 画面から設定
- **Global Shortcut**: ⌥⌘K（推奨）
- **Aliases**: 主要コマンドのエイリアス登録

## Port Configuration

N/A - Raycast 拡張機能はローカルプロセスとして動作し、専用ポートを使用しません。

## Security Considerations

### API Key Management
- ユーザー設定から API キーを取得
- ハードコード禁止
- 環境変数 / Raycast Preferences 経由

### Data Privacy
- ログは JSONL 形式でローカル保存（外部送信は分析時のみ）
- 生データを保存（マスキングなし、ローカルファーストで安全性確保）
- ユーザーが明示的に分析をトリガー（自動送信なし）
- オンボーディングでデータ取り扱いを明示

### Error Handling
- API リクエストエラーのハンドリング
- ネットワークエラー時のフォールバック
- JSON パースエラーの適切な処理

## Technology Constraints

### Raycast API Limitations
- **UI Components**: Raycast 提供のコンポーネントのみ使用可能
- **Storage**: `environment.supportPath` 経由のファイルシステムアクセス（`fs/promises` 使用）
- **Network**: `node-fetch` 経由の HTTP リクエストのみ
- **File Operations**: 拡張パッケージディレクトリは読み取り専用、書き込みは `supportPath` のみ

### 5-Hour MVP Scope
- **テストコード**: 時間制約により省略
- **エラーハンドリング**: 基本的な実装のみ
- **UI ポリッシュ**: 最小限のスタイリング
- **パフォーマンス最適化**: 後回し
