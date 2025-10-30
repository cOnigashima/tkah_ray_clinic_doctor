# Product Overview: Command Critic (cc-sdd)

## Product Description

Command Critic (cc-sdd) は、Raycast の操作ログ（入力テキストと起動コマンド）を収集し、AI で分析することで、ユーザーが気づいていない「無駄な操作」を可視化する Raycast 拡張機能です。最終的には、ショートカット・スニペット・マクロなどの最適化施策を提案し、日常業務の効率化ループを実現します。

## Core Features

### 1. Operation Log Collection (操作ログ収集)
- Raycast ランチャーからの入力テキストを自動記録（生データ）
- コマンド起動履歴（エイリアス・ターゲット）を収集
- JSONL 形式でローカル保存（日次ファイル）
- プライバシー配慮: 完全ローカル保存、外部送信は分析時のみ

### 2. AI-Powered Analysis (AI 駆動の分析)
- 収集した「生ログ」を Claude API に直接送信（完全委譲アプローチ）
- ローカル分析ロジックを完全排除、すべて Claude が判断
- 過去 7 日間 / 最大 500 件の範囲で分析実行
- 最大 3 つの改善提案（shortcut/snippet/macro）を JSON 形式で受信

### 3. Improvement Suggestions (改善提案表示)
- `/command-critic` コマンドで分析をトリガー
- AI から返された提案を「サジェスションカード」として表示
- ショートカット・スニペット・マクロの 3 カテゴリ
- Markdown 形式での詳細表示

### 4. Optimization Action Support (最適化アクション支援)
- スニペット定義（YAML）のコピーボタン
- マクロテンプレート（Shell スクリプト）のコピーボタン
- Raycast 設定画面への Deeplink（`raycast://` プロトコル）
- 半自動的な適用フロー

### 5. Onboarding Flow (オンボーディング)
- グローバルショートカット（⌥⌘K）の設定ガイド
- **主要コマンドのエイリアス登録（3 つ推奨、Raycast 標準機能を優先）**
  - **必須**: Raycast 標準機能を 2-3 個登録（File Search, Clipboard History など）
    - 理由: `launchCommand` API で動作保証、初回許可後は自動起動
    - 推奨エイリアス例:
      - `fs` → File Search (raycast/file-search)
      - `ch` → Clipboard History (raycast/clipboard-history)
      - `wm` → Window Management (raycast/window-management)
  - **オプション**: サードパーティ拡張も登録可能
    - 注意: 初回は手動起動が必要（許可プロンプト対応）
    - 「Always Open Command」選択後は自動起動可能
- **初回起動フロー（Raycast 標準機能）**
  - Step 1: オンボーディングでエイリアス登録（例: `fs` → File Search）
  - Step 2: 初回 `fs` 入力時に自動起動（許可プロンプトなし）
  - Step 3: ログ自動記録開始
- **初回起動フロー（サードパーティ拡張、オプション）**
  - Step 1: オンボーディングでエイリアス登録（例: `notion` → Notion拡張）
  - Step 2: 初回 `notion` 入力時にユーザーが手動で Notion 拡張を起動
  - Step 3: 許可プロンプトで「Always Open Command」を選択
  - Step 4: 次回以降は自動起動、ログ記録開始
- カバレッジギャップ（ルート検索キャプチャ不可）の補完
- 初回 2 分で完了する設計（Raycast 標準機能のみの場合）

## Target Use Case

### Primary Scenario: Daily Operation Optimization
**ペルソナ**: 日常的に Raycast を使用する知識労働者・エンジニア

**利用フロー**:
1. **初回セットアップ（2 分）**:
   - オンボーディングで ⌥⌘K を設定
   - よく使う 3 つのコマンド（Raycast 標準機能推奨）をエイリアス登録
   - 初回起動時に許可プロンプトで「Always Open Command」を選択
2. **日常業務**: 普段通り ⌥⌘K から Raycast を使用（ログは自動保存）
3. **週次レビュー**: `/command-critic` を開き、AI が生成した「3 つの改善提案カード」を確認
4. **即座に最適化**: コピーボタンで定義をクリップボードに取得し、Raycast 設定に適用

**解決する課題**:
- 無自覚な非効率操作（長文の繰り返し入力、チェーン実行、頻繁なコマンド起動など）
- 最適化の機会を見逃している状態
- ショートカット・スニペット活用の不足

## Key Value Proposition

### 1. Zero Cognitive Load (認知負荷ゼロ)
- バックグラウンドで自動ログ収集、ユーザーは普段通り作業
- 複雑な設定や手動入力が不要

### 2. AI-Driven Insights (AI 駆動のインサイト)
- ローカル解析の限界を超えた高度な分析
- Claude API の言語理解力を活用した文脈的な提案
- 頻度だけでない質的な改善ポイントの発見

### 3. Actionable Suggestions (実行可能な提案)
- 抽象的なアドバイスではなく、即座に適用できるテンプレート提供
- コピー＆ペーストだけで最適化を実現
- Deeplink による設定画面への直接アクセス

### 4. Rapid MVP Development (迅速な MVP 開発)
- 5 時間ハッカソンスコープに最適化された設計
- 複雑な機能を排除し、コア価値に集中
- ログ収集 UI と API 統合のみに絞った実装範囲

## Development Philosophy

### MVP-First Approach
- **スコープ制限**: 5 時間で完成可能な最小機能セット
- **AI 委譲**: 複雑なロジックは Claude API に任せる
- **シンプル UI**: 必要最小限の画面構成（Launcher + Critic + Onboarding）

### User-Centric Design
- **2 分オンボーディング**: 初回体験の摩擦を最小化
- **週次レビュー**: 日常の邪魔にならない提案頻度
- **3 提案上限**: 情報過多を避けた意思決定支援

### Privacy & Security
- **ローカルファースト**: ログは端末内に JSONL ファイルで保存
- **生データ保存**: マスキングなし（ローカルのみ、外部送信は分析時のみ）
- **ユーザー制御**: 分析実行はユーザーが明示的にトリガー
- **透明性**: オンボーディングでデータ取り扱いを明示
