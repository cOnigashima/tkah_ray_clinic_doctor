/**
 * エイリアス管理
 * タスク 3.1: エイリアス設定の永続化機能実装
 */

import { environment } from "@raycast/api";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { Alias } from "../types";

/**
 * エイリアス設定ファイルのパスを取得
 */
function getAliasesFilePath(): string {
  return join(environment.supportPath, "aliases.json");
}

/** エイリアス数の上限（妥当な上限設定） */
const MAX_ALIASES = 20;

/**
 * デフォルトのエイリアス設定（Raycast標準機能）
 * オンボーディングで推奨するエイリアス
 */
export const DEFAULT_ALIASES: Alias[] = [
  {
    id: "file-search",
    title: "File Search",
    target: {
      owner: "raycast",
      extension: "file-search",
      command: "search-files"
    }
  },
  {
    id: "clipboard-history",
    title: "Clipboard History",
    target: {
      owner: "raycast",
      extension: "clipboard-history",
      command: "clipboard-history"
    }
  },
  {
    id: "window-management",
    title: "Window Management",
    target: {
      owner: "raycast",
      extension: "window-management",
      command: "tile-window"
    }
  }
];

/**
 * supportPath ディレクトリの存在を確認し、必要に応じて作成
 */
async function ensureSupportPathExists(): Promise<void> {
  if (!existsSync(environment.supportPath)) {
    await mkdir(environment.supportPath, { recursive: true });
  }
}

/**
 * エイリアス設定ファイルを初期化
 * ファイルが存在しない場合はデフォルトエイリアスで作成
 */
async function initializeAliasesFile(): Promise<void> {
  await ensureSupportPathExists();

  if (!existsSync(getAliasesFilePath())) {
    await writeFile(
      getAliasesFilePath(),
      JSON.stringify(DEFAULT_ALIASES, null, 2),
      "utf-8"
    );
  }
}

/**
 * エイリアス一覧を取得
 * @returns エイリアスの配列
 */
export async function getAliases(): Promise<Alias[]> {
  await initializeAliasesFile();

  try {
    const data = await readFile(getAliasesFilePath(), "utf-8");
    const aliases: Alias[] = JSON.parse(data);
    return aliases;
  } catch (e) {
    console.error("Failed to read aliases:", e);
    // エラー時はデフォルトにフォールバック（要件 7.7）
    return DEFAULT_ALIASES;
  }
}

/**
 * エイリアスを追加
 * @param alias 追加するエイリアス
 * @throws 上限到達または重複時にエラー
 */
export async function addAlias(alias: Alias): Promise<void> {
  const aliases = await getAliases();

  // 上限チェック
  if (aliases.length >= MAX_ALIASES) {
    throw new Error(`エイリアス数の上限(${MAX_ALIASES})に達しました`);
  }

  // 重複チェック
  const duplicate = aliases.find(
    (a) =>
      a.id === alias.id ||
      (a.target.owner === alias.target.owner &&
        a.target.extension === alias.target.extension &&
        a.target.command === alias.target.command)
  );

  if (duplicate) {
    throw new Error(`重複するエイリアスが存在します: ${duplicate.title}`);
  }

  // ID の自動生成（未設定の場合）
  if (!alias.id) {
    alias.id = `${alias.target.extension}_${alias.target.command}_${Date.now()}`;
  }

  aliases.push(alias);
  await saveAliases(aliases);
}

/**
 * エイリアスを削除
 * @param id 削除するエイリアスのID
 */
export async function removeAlias(id: string): Promise<void> {
  const aliases = await getAliases();
  const filtered = aliases.filter((a) => a.id !== id);
  await saveAliases(filtered);
}

/**
 * エイリアス一覧を保存
 * @param aliases 保存するエイリアスの配列
 */
export async function saveAliases(aliases: Alias[]): Promise<void> {
  await ensureSupportPathExists();

  try {
    await writeFile(
      getAliasesFilePath(),
      JSON.stringify(aliases, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("Failed to save aliases:", e);
    throw new Error("エイリアスの保存に失敗しました");
  }
}

/**
 * エイリアスをIDで検索
 * @param id エイリアスID
 * @returns エイリアス、見つからない場合は undefined
 */
export async function getAliasById(id: string): Promise<Alias | undefined> {
  const aliases = await getAliases();
  return aliases.find((a) => a.id === id);
}

/**
 * エイリアスを更新
 * @param id 更新するエイリアスのID
 * @param updates 更新内容
 */
export async function updateAlias(
  id: string,
  updates: Partial<Alias>
): Promise<void> {
  const aliases = await getAliases();
  const index = aliases.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error(`エイリアスが見つかりません: ${id}`);
  }

  // IDの変更は許可しない
  if (updates.id && updates.id !== id) {
    throw new Error("エイリアスIDは変更できません");
  }

  aliases[index] = { ...aliases[index], ...updates };
  await saveAliases(aliases);
}
