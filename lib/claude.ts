/**
 * Claude API 統合
 * タスク 6.1: API クライアントの基本実装
 */

import { getPreferenceValues } from "@raycast/api";
import type { LogEvent, Proposal, AnalysisResponse, Preferences } from "../types";

/** Claude API エンドポイント */
const CLAUDE_API_ENDPOINT = "https://api.anthropic.com/v1/messages";

/** 使用する Claude モデル */
// Claude Sonnet 4.5 (最新モデル)
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

/** API リクエストのタイムアウト（ミリ秒） */
const API_TIMEOUT = 30000; // 30秒（AI分析には時間がかかる場合がある）

/** レート制限対策: 最小呼び出し間隔（ミリ秒） */
const MIN_CALL_INTERVAL = 1000; // 1秒

/** 最後の API 呼び出し時刻 */
let lastCallTime = 0;

/**
 * プロンプトを構築
 * @param logs ログイベントの配列
 * @returns Claude API 用のプロンプト文字列
 */
export function buildPrompt(logs: LogEvent[]): string {
  const logsJsonl = logs.map(log => JSON.stringify(log)).join('\n');

  return `# RAW_LOGS (last 7 days, max 100 events)
${logsJsonl}

# RULES
- frequent launch: count(aliasId) >= 10/7d → shortcut suggestion
- repeated long input: len >= 20 and same text >= 3 → snippet suggestion
- chain: pattern A->B->C within 10 minutes repeated >= 2 → macro suggestion
- output up to 3 proposals, prioritize chain > frequent > long
- detect frequent keywords in input text that suggest missing tools → extension hints
- respond ONLY with JSON matching the schema below.

# EXTENSION_DETECTION (Phase 2)
- Look for patterns in input text suggesting uninstalled extensions:
  - "jira-XXX" or "JIRA" pattern → Jira extension
  - "github.com/" or "gh " URLs → GitHub extension
  - "notion.so/" URLs → Notion extension
  - "slack " or "#channel" → Slack extension
  - "figma.com/" URLs → Figma extension
  - "linear " or "LIN-" pattern → Linear extension

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
  ],
  "extension_hints": [
    {
      "keyword": "pattern detected",
      "frequency": 5,
      "suggested_search": "search query for Raycast store",
      "extension_name": "suggested extension name",
      "description": "why this extension would help"
    }
  ]
}`;
}

/**
 * レート制限チェックと待機
 */
async function handleRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;

  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastCallTime = Date.now();
}

/**
 * タイムアウト付き fetch
 * @param url リクエスト URL
 * @param options fetch オプション
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns Response
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out. Please try again.');
    }
    throw error;
  }
}

/**
 * Claude API レスポンスをパース
 * @param apiResponse Claude API からの生レスポンス
 * @returns 分析レスポンス全体
 */
export function parseResponse(apiResponse: any): AnalysisResponse {
  try {
    // Claude API のレスポンスからテキストを抽出
    let content = apiResponse.content?.[0]?.text || "";

    if (!content) {
      console.error("Empty response from Claude API");
      return { proposals: [], extension_hints: [] };
    }

    // Claude が Markdown コードブロックで返す場合の処理
    // ```json ... ``` を削除
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
    }

    const parsed: AnalysisResponse = JSON.parse(content);
    return {
      proposals: parsed.proposals || [],
      extension_hints: parsed.extension_hints || []
    };
  } catch (e) {
    // JSON パースエラーは静かに失敗（要件 3.8）
    console.error("Failed to parse Claude response:", e);
    console.error("Raw content:", apiResponse.content?.[0]?.text);
    return { proposals: [], extension_hints: [] };
  }
}

/**
 * ログを分析して提案と拡張機能ヒントを取得
 * @param logs ログイベントの配列
 * @returns 分析レスポンス（提案と拡張機能ヒント）
 */
export async function fetchAnalysis(logs: LogEvent[]): Promise<AnalysisResponse> {
  // API キーを取得（要件 3.6）
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Claude API キーが設定されていません。\n" +
      "\n" +
      "**設定方法**:\n" +
      "1. Raycast を開く（⌘ + Space）\n" +
      "2. 'Preferences' と入力\n" +
      "3. 'Extensions' > 'Command Clinic' を選択\n" +
      "4. 'Claude API Key' フィールドにキーを入力\n" +
      "5. API キーは https://console.anthropic.com で取得できます"
    );
  }

  // ログが空の場合は早期リターン
  if (logs.length === 0) {
    console.log("No logs available for analysis");
    return { proposals: [], extension_hints: [] };
  }

  // レート制限チェック
  await handleRateLimit();

  // プロンプト構築
  const prompt = buildPrompt(logs);

  try {
    console.log(`[ClaudeAPI] Analyzing ${logs.length} log events with model: ${CLAUDE_MODEL}`);

    // Claude API リクエスト（要件 3.5）
    const response = await fetchWithTimeout(
      CLAUDE_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          system: "You are 'Command Clinic', an expert at optimizing Raycast usage. Analyze logs and propose actionable improvements.",
          messages: [{ role: "user", content: prompt }],
        }),
      },
      API_TIMEOUT
    );

    console.log(`[ClaudeAPI] Response status: ${response.status}`);

    // エラーレスポンスのハンドリング（要件 3.9, 9.2）
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;

      switch (response.status) {
        case 401:
          throw new Error(
            "APIキーが無効です。\n" +
            "\n" +
            "**確認事項**:\n" +
            "- Raycast Preferences で正しいAPIキーを設定しているか\n" +
            "- APIキーが有効期限内か\n" +
            "- APIキーに余分なスペースが含まれていないか"
          );
        case 404:
          throw new Error(
            `モデルが見つかりません（${CLAUDE_MODEL}）\n` +
            "\n" +
            "**確認事項**:\n" +
            "- APIキーが Claude Sonnet 4.5 へのアクセス権を持っているか\n" +
            "- Anthropic Console (console.anthropic.com) でモデルのアクセス権限を確認\n" +
            "- 組織アカウントの場合、管理者に権限を確認\n" +
            "\n" +
            `エラー詳細: ${errorMessage}`
          );
        case 429:
          throw new Error(
            "APIレート制限に達しました。\n" +
            "\n" +
            "**対処法**:\n" +
            "- 1分待ってから再試行してください\n" +
            "- 連続して分析を実行しすぎている可能性があります"
          );
        case 500:
        case 502:
        case 503:
          throw new Error(
            "Claude APIが一時的に利用できません。\n" +
            "\n" +
            "**対処法**:\n" +
            "- しばらく待ってから再試行してください\n" +
            "- Anthropicのステータスページを確認: https://status.anthropic.com"
          );
        default:
          throw new Error(`Claude API エラー (${response.status}):\n${errorMessage}`);
      }
    }

    // レスポンスをパース（要件 3.7）
    const data = await response.json();
    const result = parseResponse(data);

    // 提案は最大3件に制限（要件 3.10）
    result.proposals = result.proposals.slice(0, 3);

    return result;

  } catch (error: any) {
    // エラーをログに記録して再スロー
    console.error("[ClaudeAPI] Error:", error);
    throw error;
  }
}

/**
 * API キーの検証
 * @returns API キーが設定されているか
 */
export function validateApiKey(): boolean {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    return !!apiKey && apiKey.length > 0;
  } catch {
    return false;
  }
}
