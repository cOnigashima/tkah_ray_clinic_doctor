# Command Critic Raycast Extension

Raycast操作ログを収集し、AI分析により最適化提案を生成する拡張機能

## 概要

Command Critic は、ユーザーの Raycast 操作パターン（入力テキストとコマンド起動）を自動的に収集し、Claude AI による分析を通じて、ショートカット、スニペット、マクロの形で実行可能な最適化提案を提供します。

### 主要機能

- **操作ログ収集**: Raycast ランチャーの入力テキストとコマンド起動履歴を自動記録
- **AI 駆動分析**: Claude API による高度なパターン分析
- **最適化提案**: ショートカット、スニペット、マクロの3種類の提案を生成
- **プライバシー保護**: ログは完全にローカル保存（分析時のみ送信）

## セットアップ

### 前提条件

- Raycast がインストールされていること
- Claude API キー（[Anthropic Console](https://console.anthropic.com) から取得）

### インストール手順

1. **拡張機能のインストール**
   ```bash
   npm install
   npm run build
   ```

2. **API キーの設定**
   - Raycast を開き、Command Critic の設定画面へ移動
   - `Claude API Key` フィールドに API キーを入力

3. **オンボーディング**
   - `/onboarding` コマンドを実行
   - グローバルショートカット（⌥⌘K 推奨）を設定
   - 頻繁に使用する 3 つのコマンドをエイリアス登録

## 使い方

### 1. ログ収集（日常利用）

- `/launcher` コマンドでランチャーを起動
- 検索バーに入力 → 自動的にログ記録
- エイリアスを選択してコマンド起動 → 起動履歴を記録

### 2. AI 分析と提案表示

- `/critic` コマンドを実行
- 過去 7 日間のログを Claude AI が分析
- 最大 3 件の最適化提案を表示

### 3. 提案の適用

- **スニペット**: "Copy Snippet Definition" でYAML定義をコピー
- **マクロ**: "Copy Macro Template" でShellスクリプトをコピー
- **ショートカット**: "Open Raycast Settings" で設定画面へ移動

## プロジェクト構造

```
tkah_ray_clinic_doctor/
├── src/                    # UI コンポーネント
│   ├── launcher.tsx       # ログ収集ランチャー
│   ├── critic.tsx         # AI 分析結果表示
│   └── onboarding.tsx     # オンボーディングフロー
├── lib/                    # ビジネスロジック
│   ├── log.ts             # ログ管理（JSONL 読み書き）
│   ├── claude.ts          # Claude API 統合
│   ├── templates.ts       # テンプレート生成
│   └── aliases.ts         # エイリアス管理
├── types/                  # TypeScript 型定義
│   └── index.ts           # 共通型定義
├── package.json           # プロジェクト設定
├── tsconfig.json          # TypeScript 設定
└── README.md              # このファイル
```

## データ管理

### ログ保存場所

- **場所**: `~/.config/raycast/extensions/command-critic-raycast/support/`
- **形式**: JSONL (1行1JSONオブジェクト)
- **ファイル名**: `logs-YYYY-MM-DD.jsonl` (日次パーティション)
- **保持期間**: 7日間（自動削除）

### プライバシーポリシー

- ログは完全にローカル保存
- 外部送信は `/critic` コマンド実行時のみ
- ユーザーが明示的に分析をトリガー

## 開発

### 開発モード

```bash
npm run dev
```

Raycast 内で `⌘ + R` でリロード可能

### ビルド

```bash
npm run build
```

### リンター

```bash
npm run lint
npm run fix-lint
```

## トラブルシューティング

### API キーエラー

Preferences で API キーが正しく設定されているか確認してください。

### ログが保存されない

ディスク容量を確認し、`~/.config/raycast/extensions/command-critic-raycast/support/` への書き込み権限を確認してください。

### AI 分析が失敗する

- ネットワーク接続を確認
- Claude API のレート制限に達していないか確認
- ログデータが十分に蓄積されているか確認（最低7日間の利用を推奨）

## ライセンス

MIT License

## 開発者

tonishi

## フィードバック

バグ報告や機能要望は GitHub Issues までお願いします。
