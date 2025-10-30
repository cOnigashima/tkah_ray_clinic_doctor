import { List, ActionPanel, Action, showToast, Toast, Icon, LaunchType, launchCommand, open, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Alias } from "../types";
import { getAliases } from "../lib/aliases";
import { appendInputLog, appendLaunchLog } from "../lib/log";
import { getAllPredefinedCommands, isBuiltinCommand } from "../lib/raycast-commands";

export default function Launcher() {
  const [searchText, setSearchText] = useState("");
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBuiltin, setShowBuiltin] = useState(true);

  // エイリアスの読み込み
  useEffect(() => {
    async function loadAliases() {
      setIsLoading(true);
      try {
        // ユーザー定義のエイリアスを読み込み
        const userAliases = await getAliases();

        // 事前定義コマンドを取得
        const predefinedCommands = getAllPredefinedCommands();

        // ユーザー定義 + 事前定義を結合
        const combinedAliases = [
          ...userAliases,
          ...predefinedCommands
        ];

        setAliases(combinedAliases);
      } catch (error) {
        console.error("[Launcher] エイリアス読み込みエラー:", error);
        // エラー時は事前定義コマンドのみ表示
        setAliases(getAllPredefinedCommands());
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
    // Built-in機能の場合は特別な処理
    if (isBuiltinCommand(alias)) {
      // Built-in機能の「起動意図」をログに記録（重要！）
      Promise.resolve()
        .then(() => appendLaunchLog(alias.id, {
          ...alias.target,
          type: "builtin_intent" // 標準機能の使用意図として記録
        }))
        .catch((error) => {
          console.error("[Launcher] Built-in起動意図ログ記録エラー:", error);
        });

      await showToast({
        style: Toast.Style.Animated,
        title: "標準機能を起動",
        message: `${alias.title} を使用します。\n\nRaycast検索ウィンドウが開きます。\n"${alias.title}" と入力するか、\nショートカット（${alias.suggestHotkey || "未設定"}）を使用してください。`,
        primaryAction: {
          title: "Raycastを開く",
          onAction: async () => {
            await open("raycast://");
          },
        },
      });

      // Raycast本体を開く（検索ウィンドウを表示）
      try {
        await open("raycast://");
      } catch {
        // エラーは無視
      }
      return;
    }

    // 通常の拡張機能の起動ログ記録（非同期でバックグラウンド実行）
    Promise.resolve()
      .then(() => appendLaunchLog(alias.id, alias.target))
      .catch((error) => {
        console.error("[Launcher] 起動ログ記録エラー:", error);
      });

    // 通常の拡張機能の起動
    try {
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
      let primaryAction: Toast.ActionOptions | undefined;

      if (error instanceof Error) {
        if (error.message.includes("No enabled command")) {
          errorMessage =
            `${alias.title} 拡張機能がインストールされていません。\n\n` +
            `Raycast Store でインストールしてください。`;

          // Raycast Store への直接リンクを提供
          const storeSearchUrl = `raycast://extensions/search?q=${encodeURIComponent(alias.title)}`;
          primaryAction = {
            title: "Store で検索",
            onAction: async () => {
              await open(storeSearchUrl);
            },
          };
        } else {
          errorMessage = error.message;
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "未インストール",
        message: errorMessage,
        primaryAction,
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
        filteredAliases.map((alias) => {
          const isBuiltin = isBuiltinCommand(alias);
          const isUserDefined = !alias.id.startsWith("builtin_") && !alias.id.startsWith("ext_");
          const isPredefinedExtension = alias.id.startsWith("ext_");

          return (
            <List.Item
              key={alias.id}
              icon={
                isBuiltin
                  ? Icon.Box
                  : isUserDefined
                  ? Icon.Star
                  : Icon.Download
              }
              title={alias.title}
              subtitle={
                isBuiltin
                  ? "Raycast標準機能 → 手動起動"
                  : `${alias.target.owner}/${alias.target.extension}`
              }
              accessories={[
                { text: alias.target.command },
                ...(alias.suggestHotkey ? [{ tag: alias.suggestHotkey }] : []),
                ...(isUserDefined ? [{ tag: "⭐ Custom" }] : []),
                ...(isPredefinedExtension ? [{ tag: "📦 Store", color: Color.Orange }] : []),
                ...(isBuiltin ? [{ tag: "📌 手動", color: Color.Blue }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isBuiltin ? "Raycastで開く（ログ記録）" : "起動"}
                    icon={isBuiltin ? Icon.ArrowRight : Icon.Play}
                    onAction={() => handleLaunch(alias)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  {isPredefinedExtension && (
                    <Action
                      title="Storeでインストール"
                      icon={Icon.Store}
                      onAction={async () => {
                        const storeSearchUrl = `raycast://extensions/search?q=${encodeURIComponent(alias.title)}`;
                        await open(storeSearchUrl);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                  )}
                  <Action
                    title="詳細"
                    icon={Icon.Info}
                    onAction={() => {
                      const message = isBuiltin
                        ? `Raycast本体の機能です。\nショートカット: ${alias.suggestHotkey || "未設定"}`
                        : `${alias.target.owner}/${alias.target.extension}/${alias.target.command}`;

                      showToast({
                        style: Toast.Style.Success,
                        title: alias.title,
                        message: message,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
