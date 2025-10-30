/**
 * Command Clinic - 型定義
 *
 * このファイルはシステム全体で使用される型定義を集約します。
 * すべての型はstrict TypeScriptモードで動作します。
 */

// ============================================================================
// ログイベント型
// ============================================================================

/**
 * 入力イベント: ユーザーがランチャー検索バーにテキストを入力した際のイベント
 */
export interface InputEvent {
  /** イベントタイプ識別子 */
  type: "input";
  /** Unix timestamp (milliseconds) */
  ts: number;
  /** 入力テキスト（生データ、マスキングなし） */
  text: string;
  /** テキスト長 */
  len: number;
}

/**
 * 起動ターゲット: コマンド起動の詳細情報
 * この型は LaunchEvent と Alias で統一的に使用されます。
 */
export interface LaunchTarget {
  /** 拡張機能オーナー (例: "raycast") */
  owner: string;
  /** 拡張機能名 (例: "file-search") */
  extension: string;
  /** コマンド名 (例: "search-files") */
  command: string;
  /** オプション引数 */
  args?: Record<string, any>;
}

/**
 * 起動イベント: ユーザーがエイリアス経由でコマンドを起動した際のイベント
 */
export interface LaunchEvent {
  /** イベントタイプ識別子 */
  type: "launch";
  /** Unix timestamp (milliseconds) */
  ts: number;
  /** エイリアス識別子 */
  aliasId: string;
  /** 起動ターゲット詳細 */
  target: LaunchTarget;
}

/**
 * ログイベント: 入力イベントまたは起動イベントのユニオン型
 */
export type LogEvent = InputEvent | LaunchEvent;

// ============================================================================
// エイリアス型
// ============================================================================

/**
 * エイリアス: 頻繁に使用するコマンドへのショートカット設定
 */
export interface Alias {
  /** 一意な識別子 */
  id: string;
  /** 表示名 */
  title: string;
  /** 起動ターゲット設定 */
  target: LaunchTarget;
  /** 推奨ホットキー（AI提案用、オプション） */
  suggestHotkey?: string;
}

// ============================================================================
// AI分析結果型
// ============================================================================

/**
 * 証拠データ: 提案の根拠となるデータ
 */
export interface Evidence {
  /** 関連するエイリアスIDリスト */
  aliases?: string[];
  /** 頻度カウント */
  count?: number;
  /** 時間帯パターン (例: ["09:00-11:00 JST"]) */
  time_windows?: string[];
}

/**
 * ショートカット提案のペイロード
 */
export interface ShortcutPayload {
  /** 対象エイリアスID */
  aliasId: string;
  /** 推奨ホットキー (例: "Alt+Cmd+K") */
  suggestedHotkey: string;
}

/**
 * スニペット提案のペイロード
 */
export interface SnippetPayload {
  /** スニペットテキスト */
  text: string;
  /** スニペットエイリアス（短縮形） */
  alias: string;
}

/**
 * マクロ提案のペイロード
 */
export interface MacroPayload {
  /** エイリアスIDの連鎖シーケンス */
  sequence: string[];
}

/**
 * 提案ペイロード: 提案タイプに応じた実装データ
 * Union型により、どのペイロードが含まれるかを型安全に表現します。
 */
export type ProposalPayload =
  | { shortcut: ShortcutPayload }
  | { snippet: SnippetPayload }
  | { macro: MacroPayload };

/**
 * 提案: AI分析による最適化提案
 */
export interface Proposal {
  /** 提案タイプ */
  type: "shortcut" | "snippet" | "macro";
  /** 提案タイトル */
  title: string;
  /** 提案理由（最大80文字） */
  rationale: string;
  /** 証拠データ */
  evidence: Evidence;
  /** 提案の実装データ */
  payload: ProposalPayload;
  /** 信頼度スコア (0.0 - 1.0) */
  confidence: number;
}

/**
 * 拡張機能ヒント: Phase 2機能
 */
export interface ExtensionHint {
  /** 検出されたキーワード */
  keyword: string;
  /** 頻度カウント */
  frequency: number;
  /** Raycast Store検索用クエリ */
  suggested_search: string;
  /** 推奨拡張機能名 */
  extension_name: string;
  /** 拡張機能の説明 */
  description: string;
}

/**
 * AI分析レスポンス: Claude APIからの応答
 */
export interface AnalysisResponse {
  /** 提案リスト（最大3件） */
  proposals: Proposal[];
  /** 拡張機能ヒント（Phase 2） */
  extension_hints?: ExtensionHint[];
}

// ============================================================================
// エラー処理型
// ============================================================================

/**
 * エラー重要度: エラーの深刻度を表す
 */
export enum ErrorSeverity {
  /** 情報: ユーザーへの情報提供 */
  INFO = "info",
  /** 警告: 動作継続可能だが注意が必要 */
  WARNING = "warning",
  /** エラー: 機能の一部が動作しない */
  ERROR = "error",
  /** 致命的: システム全体に影響 */
  CRITICAL = "critical",
}

/**
 * アプリケーションエラー: カスタムエラー情報
 */
export interface AppError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** エラー重要度 */
  severity: ErrorSeverity;
  /** 元のエラー（オプション） */
  originalError?: Error;
  /** コンテキスト情報（オプション） */
  context?: Record<string, any>;
}

// ============================================================================
// Raycast Preferences 型
// ============================================================================

/**
 * Preferences: Raycast拡張機能の設定値
 */
export interface Preferences {
  /** Claude API キー */
  apiKey: string;
}
