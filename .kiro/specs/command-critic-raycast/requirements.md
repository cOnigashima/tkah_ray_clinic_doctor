# 要件ドキュメント

## はじめに

Command Critic は、ユーザーの操作ログ（入力テキストとコマンド起動）を自動収集し、Claude AI を使って分析することで、非効率的なワークフローパターンを特定する Raycast 拡張機能です。この拡張機能は、ユーザーが気づいていない「無駄な操作」を可視化し、ショートカット、スニペット、マクロの形で実行可能な最適化提案を提供します。これにより、ナレッジワーカーやエンジニアが手動での追跡や分析を必要とせずに、日々の Raycast 利用を最適化する継続的改善ループを実現します。

本システムは、すべてのログを JSONL 形式でローカル保存し、ユーザーが明示的に分析をトリガーした場合のみ Claude API へデータ送信することで、プライバシーを優先します。MVP スコープは、5 時間のハッカソン実装を想定し、必須のログ収集、AI 駆動分析、提案表示機能に焦点を当てます。

## 要件

### 要件 1: 初期セットアップとオンボーディング

**目的:** 初回利用ユーザーとして、ログ収集のための拡張機能を設定する迅速なオンボーディングプロセスを完了したい。これにより、すぐに自分の Raycast 利用パターンの追跡を開始できる。

#### 受入基準

1. WHEN ユーザーが初めてオンボーディングコマンドを開く THEN Command Critic SHALL グローバルショートカット設定ガイダンス付きのフォームベースのセットアップ画面を表示する
2. WHEN ユーザーがグローバルショートカット（⌥⌘K 推奨）を設定する THEN Command Critic SHALL この設定を Raycast 設定に保存する
3. WHEN ユーザーがエイリアス登録ステップに到達する THEN Command Critic SHALL 頻繁に使用する 3 つのコマンドをエイリアスとして登録するようユーザーに促す
4. WHEN ユーザーがエイリアスを追加する THEN Command Critic SHALL 推奨される Raycast ビルトインコマンド（File Search、Clipboard History など）を候補として表示する
5. WHEN ユーザーがエイリアス設定を保存しようとする THEN Command Critic SHALL エイリアスに必須フィールド（id、title、target.owner、target.extension、target.command）が含まれていることを検証する
6. WHEN ユーザーがすべてのオンボーディングステップを完了する THEN Command Critic SHALL セットアップ完了とログ収集がアクティブであることを示す確認メッセージを表示する
7. WHEN エイリアスが初めて起動される THEN Command Critic SHALL Raycast の許可プロンプトについてユーザーに通知し、「Always Open Command」の選択を推奨する
8. IF オンボーディングプロセスが 2 分以上かかる THEN Command Critic SHALL オプション設定ステップのスキップオプションを提供する

### 要件 2: 操作ログ収集

**目的:** Raycast ユーザーとして、入力テキストとコマンド起動がバックグラウンドで自動的にログ記録されるようにしたい。これにより、手動データ入力なしで利用パターンを分析できる。

#### 受入基準

1. WHEN ユーザーがランチャー検索バーにテキストを入力する THEN Command Critic SHALL タイムスタンプ、テキスト、テキスト長を含む InputEvent をキャプチャしてログに記録する
2. WHEN ユーザーがエイリアス経由でコマンドを起動する THEN Command Critic SHALL タイムスタンプ、エイリアス ID、ターゲットコマンド詳細を含む LaunchEvent をキャプチャしてログに記録する
3. WHEN ログイベントがキャプチャされる THEN Command Critic SHALL アトミックなファイル操作を使用して `environment.supportPath` の日次 JSONL ファイルに追記する
4. WHEN 新しい日が始まる THEN Command Critic SHALL `logs-YYYY-MM-DD.jsonl` 形式で新しい JSONL ファイルを作成する
5. WHEN ログファイルが 7 日間の保持期間を超える THEN Command Critic SHALL 7 日より古いファイルを自動的に削除する
6. WHEN ログイベントを書き込む THEN Command Critic SHALL 同時ログ操作間の競合状態を防ぐため `fs/promises.appendFile` を使用する
7. WHEN 入力テキストをキャプチャする THEN Command Critic SHALL マスキングやフィルタリングなしで生テキストを保存する（ローカルファースト・プライバシーアプローチ）
8. IF `environment.supportPath` ディレクトリが存在しない THEN Command Critic SHALL ログ書き込み前に再帰的ディレクトリ作成でそれを作成する
9. WHEN ログ収集がファイルシステムエラーに遭遇する THEN Command Critic SHALL ユーザーのワークフローを中断することなく静かに失敗する

### 要件 3: AI 駆動の利用分析

**目的:** Raycast ユーザーとして、操作ログの AI 分析をオンデマンドでトリガーしたい。これにより、実際の利用パターンに基づいたパーソナライズされた最適化提案を受け取ることができる。

#### 受入基準

1. WHEN ユーザーが `/command-critic` コマンドを実行する THEN Command Critic SHALL 分析ワークフローを開始する
2. WHEN 分析が始まる THEN Command Critic SHALL `environment.supportPath` から過去 7 日間の JSONL ログファイルを読み込む
3. WHEN ログファイルを読み込む THEN Command Critic SHALL データセットを最新 500 イベントまでに制限する
4. WHEN ログデータが収集される THEN Command Critic SHALL 生 JSONL ログと分析ルールを含むプロンプトを構築する
5. WHEN プロンプトが準備完了する THEN Command Critic SHALL モデル `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5) を使用して `https://api.anthropic.com/v1/messages` の Claude API に送信する
6. WHEN API リクエストを行う THEN Command Critic SHALL `getPreferenceValues` を使用して Raycast Preferences から API キーを取得する
7. WHEN Claude API がレスポンスを返す THEN Command Critic SHALL JSON レスポンスをパースして proposals 配列を抽出する
8. WHEN 不正な JSON によりパースが失敗する THEN Command Critic SHALL 空の proposals 配列を返し、エラーをログに記録する
9. WHEN ネットワークエラーにより API リクエストが失敗する THEN Command Critic SHALL 再試行ガイダンス付きのエラーメッセージをユーザーに表示する
10. WHEN 分析が正常に完了する THEN Command Critic SHALL 返される提案を最大 3 件に制限する
11. IF 最適化パターンが検出されない THEN Command Critic SHALL 現在のワークフローがすでに最適化されていることをユーザーに通知する

### 要件 4: 提案の表示とプレゼンテーション

**目的:** Raycast ユーザーとして、AI 生成の最適化提案を理解しやすい形式で閲覧したい。これにより、改善機会を素早く評価して行動できる。

#### 受入基準

1. WHEN 分析が提案を生成する THEN Command Critic SHALL それらを Markdown 形式のカードとして Detail ビューに表示する
2. WHEN 提案カードを表示する THEN Command Critic SHALL 提案タイプ（shortcut、snippet、または macro）を表示する
3. WHEN 提案カードを表示する THEN Command Critic SHALL title、rationale、evidence フィールドを表示する
4. WHEN 提案に evidence が含まれる THEN Command Critic SHALL 関連するエイリアス、頻度カウント、時間帯を表示する
5. WHEN 提案に信頼度スコアが含まれる THEN Command Critic SHALL それをパーセンテージで表示する
6. WHEN 複数の提案が利用可能 THEN Command Critic SHALL 優先度順（chain > frequent > repeated long input）に並べる
7. WHEN ユーザーが提案リストを閲覧する THEN Command Critic SHALL 個別の提案カード間のナビゲーションを提供する
8. IF 提案が利用不可 THEN Command Critic SHALL データ不足または最適化済みワークフローを示すメッセージを表示する

### 要件 5: 最適化アクションのサポート

**目的:** Raycast ユーザーとして、提案された最適化を簡単に Raycast 設定に適用したい。これにより、AI 推奨事項からすぐに恩恵を受けることができる。

#### 受入基準

1. WHEN スニペット提案を閲覧する THEN Command Critic SHALL 「Copy Snippet Definition」アクションボタンを提供する
2. WHEN ユーザーが「Copy Snippet Definition」をクリックする THEN Command Critic SHALL YAML 形式のスニペット設定を生成してクリップボードにコピーする
3. WHEN マクロ提案を閲覧する THEN Command Critic SHALL 「Copy Macro Template」アクションボタンを提供する
4. WHEN ユーザーが「Copy Macro Template」をクリックする THEN Command Critic SHALL マクロシーケンス用の Shell スクリプトテンプレートを生成してクリップボードにコピーする
5. WHEN ショートカット提案を閲覧する THEN Command Critic SHALL 「Open Raycast Settings」アクションボタンを提供する
6. WHEN ユーザーが「Open Raycast Settings」をクリックする THEN Command Critic SHALL `raycast://` ディープリンクプロトコル経由で Raycast 設定を起動する
7. WHEN テンプレート生成が失敗する THEN Command Critic SHALL フォールバック手順付きのエラーメッセージを表示する
8. WHEN ユーザーが最適化を適用する THEN Command Critic SHALL コピーしたコンテンツを貼り付けまたは設定する場所のガイダンスを提供する

### 要件 6: クロス拡張コマンド起動

**目的:** Raycast ユーザーとして、ランチャーが Raycast ビルトインコマンドとサードパーティ拡張コマンドの両方を実行できるようにしたい。これにより、Raycast ワークフロー全体で利用状況を追跡できる。

#### 受入基準

1. WHEN ユーザーが Raycast ビルトインコマンドのエイリアスを選択する THEN Command Critic SHALL `ownerOrAuthorName: "raycast"` で `launchCommand` を使用してそれを起動する
2. WHEN ユーザーがサードパーティ拡張のエイリアスを選択する THEN Command Critic SHALL 適切な owner と extension 名で `launchCommand` を使用してそれを起動する
3. WHEN 初めてコマンドを起動する THEN Command Critic SHALL Raycast に許可プロンプトを表示させる
4. WHEN 許可不足により起動コマンドが失敗する THEN Command Critic SHALL 「Always Open Command」オプションの受け入れに関するガイダンスを表示する
5. WHEN 起動ターゲットにクエリ文字列パラメータが含まれる THEN Command Critic SHALL `args` パラメータ経由でそれらを渡す
6. WHEN フォールバックとしてディープリンク経由で起動する THEN Command Critic SHALL URL を `raycast://extensions/{owner}/{extension}/{command}` として構築する

### 要件 7: エイリアス管理

**目的:** Raycast ユーザーとして、拡張機能インターフェース経由でコマンドエイリアスを管理したい。これにより、追跡および簡単にアクセスできるコマンドをカスタマイズできる。

#### 受入基準

1. WHEN ユーザーがエイリアス管理インターフェースを開く THEN Command Critic SHALL 現在登録されているエイリアスのリストを表示する
2. WHEN ユーザーが新しいエイリアスを追加する THEN Command Critic SHALL 一意の ID、表示タイトル、ターゲット設定が含まれていることを検証する
3. WHEN ユーザーがエイリアス変更を保存する THEN Command Critic SHALL それらを JSON 設定ファイルとして `environment.supportPath` に永続化する
4. WHEN ランチャーがロードされる THEN Command Critic SHALL エイリアス設定ファイルを読み込み、すべての登録済みエイリアスを表示する
5. WHEN ユーザーがエイリアスを削除する THEN Command Critic SHALL 設定からそれを削除し、ランチャー表示を更新する
6. IF エイリアス設定ファイルが存在しない THEN Command Critic SHALL 空の配列でそれを作成する
7. WHEN エイリアス設定の読み込みが失敗する THEN Command Critic SHALL デフォルトの Raycast ビルトインコマンドセットにフォールバックする

### 要件 8: データプライバシーとセキュリティ

**目的:** プライバシーを重視するユーザーとして、操作ログがローカルに保存され、明示的に分析をリクエストした場合のみ送信されるようにしたい。これにより、利用データのコントロールを維持できる。

#### 受入基準

1. WHEN ログイベントがキャプチャされる THEN Command Critic SHALL ローカルマシンの `environment.supportPath` にのみそれらを保存する
2. WHEN ユーザーが分析をトリガーしていない THEN Command Critic SHALL 外部サービスにログデータを送信してはならない
3. WHEN ユーザーが分析をトリガーする THEN Command Critic SHALL その特定のリクエストに対してのみ生ログデータを Claude API に送信する
4. WHEN API キーを保存する THEN Command Critic SHALL Raycast Preferences からそれらを取得し、拡張機能にハードコードしてはならない
5. WHEN オンボーディング情報を表示する THEN Command Critic SHALL ローカルファースト保存アプローチとデータ送信タイミングを明確に説明する
6. WHEN ログファイルが削除される THEN Command Critic SHALL ファイルシステムの標準削除メカニズムを使用してデータを削除する
7. IF ユーザーがデータ削除をリクエストする THEN Command Critic SHALL `environment.supportPath` からすべてのログファイルを手動で消去するコマンドを提供する

### 要件 9: エラーハンドリングと回復力

**目的:** Raycast ユーザーとして、拡張機能が私のワークフローを中断することなくエラーを適切に処理するようにしたい。これにより、Command Critic が問題に遭遇しても Raycast を使い続けることができる。

#### 受入基準

1. WHEN ファイルシステム操作が失敗する THEN Command Critic SHALL エラーをコンソールにログし、例外をスローせずに実行を継続する
2. WHEN Claude API リクエストが失敗する THEN Command Critic SHALL トラブルシューティングガイダンス付きのユーザーフレンドリーなエラーメッセージを表示する
3. WHEN JSON パースが失敗する THEN Command Critic SHALL 例外をキャッチし、空またはデフォルト値を返す
4. WHEN ネットワークタイムアウトが発生する THEN Command Critic SHALL 適切なタイムアウト期間（10 秒）後にリクエストを中止する
5. WHEN API キーが不足または無効 THEN Command Critic SHALL Raycast Preferences で設定するようユーザーに促す
6. WHEN ログファイルの破損が検出される THEN Command Critic SHALL 破損した行をスキップして有効なエントリの読み込みを続ける
7. IF オンボーディング中に重大なエラーが発生する THEN Command Critic SHALL ユーザーが失敗したステップを再試行またはスキップできるようにする

### 要件 10: MVP スコープ制約

**目的:** ハッカソン参加者として、コア機能に焦点を当て、非必須機能を後回しにすることで、5 時間以内に機能的な MVP を提供したい。これにより、製品コンセプトを効果的に実証できる。

#### 受入基準

1. WHEN 拡張機能を実装する THEN Command Critic SHALL 高度な機能よりもログ収集、AI 分析、提案表示を優先する
2. WHEN エッジケースに遭遇する THEN Command Critic SHALL 包括的なエラー回復なしで基本的なエラーハンドリングを実装する
3. WHEN UI を設計する THEN Command Critic SHALL デフォルトの Raycast コンポーネントで最小限のスタイリングを使用する
4. WHEN コードを書く THEN Command Critic SHALL ユニットテストと統合テストを省略する
5. WHEN パフォーマンス最適化を実装する THEN Command Critic SHALL 基本機能に重要でない限りそれらを延期する
6. WHEN 機能追加を検討する THEN Command Critic SHALL 3 画面アーキテクチャ（Launcher、Critic、Onboarding）を超える場合はそれらを除外する
7. WHEN コード品質を評価する THEN Command Critic SHALL 高度に磨かれたコードよりも機能要件を満たす基本実装を受け入れる
