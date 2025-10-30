import { List, ActionPanel, Action, showToast, Toast, Icon, LaunchType, launchCommand } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Alias } from "../types";
import { getAliases } from "../lib/aliases";
import { appendInputLog, appendLaunchLog } from "../lib/log";

// デフォルトエイリアス（エイリアス設定がない場合のフォールバック）
// 注意: Raycast built-in機能ではなく、一般的にインストール可能な拡張機能を例示
const DEFAULT_ALIASES: Alias[] = [
  {
    id: "example_github",
    title: "GitHub Search Repositories",
    target: { owner: "raycast", extension: "github", command: "search-repositories" },
  },
  {
    id: "example_jira",
    title: "Jira Search Issues",
    target: { owner: "raycast", extension: "jira", command: "search-issues" },
  },
  {
    id: "example_notion",
    title: "Notion Search",
    target: { owner: "notion", extension: "notion", command: "search-page" },
  },
];

export default function Launcher() {
  const [searchText, setSearchText] = useState("");
  const [aliases, setAliases] = useState<Alias[]>(DEFAULT_ALIASES);
  const [isLoading, setIsLoading] = useState(false);

  // エイリアスの読み込み
  useEffect(() => {
    async function loadAliases() {
      setIsLoading(true);
      try {
        const loadedAliases = await getAliases();
        setAliases(loadedAliases.length > 0 ? loadedAliases : DEFAULT_ALIASES);
      } catch (error) {
        console.error("[Launcher] エイリアス読み込みエラー:", error);
        setAliases(DEFAULT_ALIASES);
      } finally {
        setIsLoading(false);
      }
    }

    loadAliases();
  }, []);

  // 検索テキスト変更時のログ記録
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);

    // 入力ログの記録（非同期でバックグラウンド実行、要件 5.2）
    if (text.trim().length > 0) {
      // Promise.resolve()でキューイングし、ユーザー体験を中断しない
      Promise.resolve()
        .then(() => appendInputLog(text))
        .catch((error) => {
          console.error("[Launcher] ログ記録エラー:", error);
          // 静かに失敗（要件 2.9）
        });
    }
  };

  // エイリアス起動時のログ記録とコマンド実行
  const handleLaunch = async (alias: Alias) => {
    try {
      // 起動ログの記録（非同期でバックグラウンド実行、要件 5.2, 2.2）
      // Promise.resolve()でキューイングし、コマンド起動と並行実行
      Promise.resolve()
        .then(() => appendLaunchLog(alias.id, alias.target))
        .catch((error) => {
          console.error("[Launcher] 起動ログ記録エラー:", error);
          // 静かに失敗（要件 2.9）
        });

      // 拡張機能の起動（launchCommand API使用、要件 6.1, 6.2, 6.3, 6.4）
      // owner が "raycast" の場合は Raycast Store の拡張機能
      // それ以外の場合はサードパーティ拡張機能（owner名を指定）
      await launchCommand({
        extensionName: alias.target.extension,
        name: alias.target.command,
        type: LaunchType.UserInitiated,
        ...(alias.target.owner !== "raycast" && { ownerOrAuthorName: alias.target.owner }),
        ...(alias.target.args && { arguments: alias.target.args }),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "コマンド起動",
        message: `${alias.title} を起動しました`,
      });
    } catch (error) {
      console.error("[Launcher] コマンド起動エラー:", error);

      // エラーメッセージの改善
      let errorMessage = "コマンド起動に失敗しました。";

      if (error instanceof Error) {
        if (error.message.includes("No enabled command")) {
          errorMessage =
            `拡張機能が見つかりません。\n\n` +
            `**確認事項:**\n` +
            `• ${alias.target.owner}/${alias.target.extension} がインストールされているか\n` +
            `• 拡張機能が有効化されているか\n` +
            `• コマンド名（${alias.target.command}）が正しいか`;
        } else {
          errorMessage = error.message;
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "起動エラー",
        message: errorMessage,
      });
    }
  };

  // 検索フィルタリング
  const filteredAliases = aliases.filter((alias) => {
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase();
    return (
      alias.title.toLowerCase().includes(query) ||
      alias.id.toLowerCase().includes(query) ||
      alias.target.extension.toLowerCase().includes(query) ||
      alias.target.command.toLowerCase().includes(query)
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="コマンドエイリアスを検索..."
      throttle
    >
      {filteredAliases.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="エイリアスが見つかりません"
          description="検索条件を変更するか、オンボーディングでエイリアスを追加してください"
        />
      ) : (
        filteredAliases.map((alias) => (
          <List.Item
            key={alias.id}
            icon={Icon.Terminal}
            title={alias.title}
            subtitle={`${alias.target.owner}/${alias.target.extension}`}
            accessories={[
              { text: alias.target.command },
              ...(alias.suggestHotkey ? [{ tag: alias.suggestHotkey }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="起動"
                  icon={Icon.Play}
                  onAction={() => handleLaunch(alias)}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action
                  title="エイリアス詳細"
                  icon={Icon.Info}
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: alias.title,
                      message: `${alias.target.owner}/${alias.target.extension}/${alias.target.command}`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
