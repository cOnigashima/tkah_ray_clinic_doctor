/**
 * Raycast標準機能と人気拡張機能の事前定義リスト
 * Option C: よく使われる拡張機能を事前定義
 */

import type { Alias } from "../types";

/**
 * Raycast標準機能（Built-in）
 * 注意: これらはRaycast本体の機能のため、launchCommand APIでは起動できない
 * ユーザーガイダンス用に表示し、選択時は説明を表示
 */
export const RAYCAST_BUILTIN_COMMANDS: Alias[] = [
  // ファイル & 検索
  {
    id: "builtin_file_search",
    title: "File Search",
    target: { owner: "raycast", extension: "builtin", command: "file-search" },
    suggestHotkey: "⌘Space F",
  },
  {
    id: "builtin_search_menu_items",
    title: "Search Menu Items",
    target: { owner: "raycast", extension: "builtin", command: "search-menu-items" },
    suggestHotkey: "⌘⇧/",
  },

  // クリップボード
  {
    id: "builtin_clipboard_history",
    title: "Clipboard History",
    target: { owner: "raycast", extension: "builtin", command: "clipboard-history" },
    suggestHotkey: "⌥⌘C",
  },

  // ウィンドウ管理
  {
    id: "builtin_window_management",
    title: "Window Management",
    target: { owner: "raycast", extension: "builtin", command: "window-management" },
    suggestHotkey: "⌃⌥→",
  },

  // システムコマンド
  {
    id: "builtin_quit_all_applications",
    title: "Quit All Applications",
    target: { owner: "raycast", extension: "builtin", command: "quit-all-apps" },
  },
  {
    id: "builtin_empty_trash",
    title: "Empty Trash",
    target: { owner: "raycast", extension: "builtin", command: "empty-trash" },
  },
  {
    id: "builtin_system_information",
    title: "System Information",
    target: { owner: "raycast", extension: "builtin", command: "system-info" },
  },

  // 計算機 & 単位変換
  {
    id: "builtin_calculator",
    title: "Calculator",
    target: { owner: "raycast", extension: "builtin", command: "calculator" },
  },

  // スニペット
  {
    id: "builtin_snippets",
    title: "Search Snippets",
    target: { owner: "raycast", extension: "builtin", command: "search-snippets" },
    suggestHotkey: "⌥⌘S",
  },

  // 絵文字 & シンボル
  {
    id: "builtin_search_emoji",
    title: "Search Emoji & Symbols",
    target: { owner: "raycast", extension: "builtin", command: "search-emoji-symbols" },
    suggestHotkey: "⌘⌃Space",
  },
];

/**
 * 人気のRaycast Store拡張機能
 * これらはlaunchCommand APIで起動可能（インストール済みの場合）
 */
export const POPULAR_EXTENSIONS: Alias[] = [
  // 開発ツール
  {
    id: "ext_github",
    title: "GitHub",
    target: { owner: "raycast", extension: "github", command: "search-repositories" },
  },
  {
    id: "ext_gitlab",
    title: "GitLab",
    target: { owner: "raycast", extension: "gitlab", command: "search-projects" },
  },
  {
    id: "ext_linear",
    title: "Linear",
    target: { owner: "linear", extension: "linear", command: "search-issues" },
  },
  {
    id: "ext_jira",
    title: "Jira",
    target: { owner: "raycast", extension: "jira", command: "search-issues" },
  },

  // コミュニケーション
  {
    id: "ext_slack",
    title: "Slack",
    target: { owner: "raycast", extension: "slack", command: "search-messages" },
  },
  {
    id: "ext_zoom",
    title: "Zoom",
    target: { owner: "raycast", extension: "zoom", command: "start-meeting" },
  },

  // 生産性ツール
  {
    id: "ext_notion",
    title: "Notion",
    target: { owner: "notion", extension: "notion", command: "search-page" },
  },
  {
    id: "ext_todoist",
    title: "Todoist",
    target: { owner: "doist", extension: "todoist", command: "search-tasks" },
  },
  {
    id: "ext_things",
    title: "Things",
    target: { owner: "raycast", extension: "things", command: "search-todos" },
  },

  // AI & 翻訳
  {
    id: "ext_ai_commands",
    title: "AI Commands",
    target: { owner: "raycast", extension: "raycast-ai", command: "ai-commands" },
  },
  {
    id: "ext_deepl",
    title: "DeepL Translate",
    target: { owner: "raycast", extension: "deepl", command: "translate" },
  },

  // ユーティリティ
  {
    id: "ext_brew",
    title: "Homebrew",
    target: { owner: "raycast", extension: "brew", command: "search" },
  },
  {
    id: "ext_kill_process",
    title: "Kill Process",
    target: { owner: "raycast", extension: "kill-process", command: "kill-process" },
  },
  {
    id: "ext_speedtest",
    title: "Speedtest",
    target: { owner: "raycast", extension: "speedtest", command: "speedtest" },
  },

  // デザインツール
  {
    id: "ext_figma",
    title: "Figma",
    target: { owner: "raycast", extension: "figma-files", command: "search-files" },
  },
  {
    id: "ext_color_picker",
    title: "Color Picker",
    target: { owner: "raycast", extension: "color-picker", command: "pick-color" },
  },
];

/**
 * すべての事前定義コマンドを取得
 */
export function getAllPredefinedCommands(): Alias[] {
  return [...RAYCAST_BUILTIN_COMMANDS, ...POPULAR_EXTENSIONS];
}

/**
 * Built-in機能かどうかを判定
 */
export function isBuiltinCommand(alias: Alias): boolean {
  return alias.target.extension === "builtin";
}