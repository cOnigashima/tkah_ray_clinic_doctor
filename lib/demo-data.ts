/**
 * デモモード用のモックデータ
 * デモンストレーション時に即座に表示するための固定データ
 */

import type { AnalysisResponse } from "../types";

/**
 * デモ用の分析結果データ
 * リアルな使用パターンに基づいた提案例
 */
export const DEMO_ANALYSIS_RESULT: AnalysisResponse = {
  proposals: [
    // ショートカット提案
    {
      type: "shortcut",
      title: "頻出コマンド「Search Files」にホットキーを",
      rationale: "過去7日間で140回起動されています",
      evidence: {
        aliases: ["search-files"],
        count: 140,
        time_windows: ["09:00-12:00 JST", "14:00-18:00 JST"]
      },
      payload: {
        shortcut: {
          aliasId: "search-files",
          suggestedHotkey: "Alt+Cmd+F"
        }
      },
      confidence: 0.95
    },
    // スニペット提案
    {
      type: "snippet",
      title: "繰り返し入力「console.log(」をスニペット化",
      rationale: "同じテキストを週21回入力しています",
      evidence: {
        aliases: [],
        count: 21,
        time_windows: ["14:00-18:00 JST"]
      },
      payload: {
        snippet: {
          text: "console.log(",
          alias: "cl"
        }
      },
      confidence: 0.88
    },
    // マクロ提案
    {
      type: "macro",
      title: "連続操作「Clipboard → Search → Window」をマクロ化",
      rationale: "10分以内に3つのコマンドを連続実行するパターンが週14回検出",
      evidence: {
        aliases: ["clipboard-history", "search-files", "window-management"],
        count: 14,
        time_windows: ["09:00-11:00 JST", "14:00-16:00 JST"]
      },
      payload: {
        macro: {
          sequence: ["clipboard-history", "search-files", "window-management"]
        }
      },
      confidence: 0.82
    }
  ],
  extension_hints: [
    // Jira 拡張機能推奨
    {
      keyword: "JIRA-",
      frequency: 12,
      suggested_search: "jira",
      extension_name: "Jira Search",
      description: "Jira チケット番号の検索パターンを検出しました。Jira 拡張機能をインストールすることで、Raycast から直接チケットを検索・作成できます。"
    },
    // GitHub 拡張機能推奨
    {
      keyword: "github.com/",
      frequency: 8,
      suggested_search: "github",
      extension_name: "GitHub",
      description: "GitHub URL の検索パターンを検出しました。GitHub 拡張機能により、リポジトリ・Issue・PR を Raycast から直接検索できます。"
    }
  ]
};

/**
 * デモモード用の遅延（ミリ秒）
 * リアルな API 呼び出しをシミュレート
 */
export const DEMO_DELAY_MS = 4000; // 4秒
