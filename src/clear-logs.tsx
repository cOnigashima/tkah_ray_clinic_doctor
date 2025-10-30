/**
 * Clear Logs コマンド
 * タスク 9.2: データ管理コマンドの実装
 *
 * すべてのログファイルを削除するコマンド（要件 8.7）
 */

import { ActionPanel, Action, List, showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { useState } from "react";
import { environment } from "@raycast/api";
import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface LogFileInfo {
  filename: string;
  path: string;
  size: number;
  date: string;
}

export default function ClearLogs() {
  const [isLoading, setIsLoading] = useState(false);
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);

  // ログファイルの一覧を取得
  const loadLogFiles = async () => {
    setIsLoading(true);
    try {
      if (!existsSync(environment.supportPath)) {
        await showToast({
          style: Toast.Style.Success,
          title: "ログファイルなし",
          message: "削除するログファイルがありません",
        });
        setIsLoading(false);
        return;
      }

      const files = await readdir(environment.supportPath);
      const logFileInfos: LogFileInfo[] = [];

      for (const file of files) {
        if (file.startsWith("logs-") && file.endsWith(".jsonl")) {
          const filePath = join(environment.supportPath, file);
          const stats = await stat(filePath);
          const dateStr = file.replace("logs-", "").replace(".jsonl", "");

          logFileInfos.push({
            filename: file,
            path: filePath,
            size: stats.size,
            date: dateStr,
          });
        }
      }

      // 日付順でソート（新しい順）
      logFileInfos.sort((a, b) => b.date.localeCompare(a.date));
      setLogFiles(logFileInfos);

      if (logFileInfos.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "ログファイルなし",
          message: "削除するログファイルがありません",
        });
      }
    } catch (error) {
      console.error("[ClearLogs] ログファイル読み込みエラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: error instanceof Error ? error.message : "ログファイルの読み込みに失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // すべてのログファイルを削除
  const deleteAllLogs = async () => {
    const confirmed = await confirmAlert({
      title: "すべてのログを削除",
      message: `${logFiles.length}個のログファイルを完全に削除しますか？この操作は取り消せません。`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      let deletedCount = 0;

      for (const logFile of logFiles) {
        try {
          await unlink(logFile.path);
          deletedCount++;
        } catch (error) {
          console.error(`[ClearLogs] ファイル削除エラー: ${logFile.filename}`, error);
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "削除完了",
        message: `${deletedCount}個のログファイルを削除しました`,
      });

      // リストを更新
      setLogFiles([]);
    } catch (error) {
      console.error("[ClearLogs] 削除処理エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "削除失敗",
        message: error instanceof Error ? error.message : "ログファイルの削除に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 個別のログファイルを削除
  const deleteLogFile = async (logFile: LogFileInfo) => {
    const confirmed = await confirmAlert({
      title: "ログファイルを削除",
      message: `${logFile.filename} を削除しますか？`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await unlink(logFile.path);
      await showToast({
        style: Toast.Style.Success,
        title: "削除完了",
        message: `${logFile.filename} を削除しました`,
      });

      // リストを更新
      setLogFiles(logFiles.filter((f) => f.path !== logFile.path));
    } catch (error) {
      console.error("[ClearLogs] ファイル削除エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "削除失敗",
        message: error instanceof Error ? error.message : "ログファイルの削除に失敗しました",
      });
    }
  };

  // ファイルサイズをフォーマット
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="ログファイルを検索..."
      actions={
        <ActionPanel>
          <Action
            title="ログファイルを読み込み"
            icon={Icon.ArrowClockwise}
            onAction={loadLogFiles}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {logFiles.length > 0 && (
            <Action
              title="すべて削除"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={deleteAllLogs}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
          )}
        </ActionPanel>
      }
    >
      {logFiles.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="ログファイルなし"
          description="「ログファイルを読み込み」を実行してください"
          actions={
            <ActionPanel>
              <Action title="ログファイルを読み込み" icon={Icon.ArrowClockwise} onAction={loadLogFiles} />
            </ActionPanel>
          }
        />
      ) : (
        logFiles.map((logFile) => (
          <List.Item
            key={logFile.path}
            icon={Icon.Document}
            title={logFile.filename}
            subtitle={logFile.date}
            accessories={[{ text: formatSize(logFile.size) }]}
            actions={
              <ActionPanel>
                <Action
                  title="削除"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteLogFile(logFile)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
                <Action
                  title="ログファイルを読み込み"
                  icon={Icon.ArrowClockwise}
                  onAction={loadLogFiles}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                {logFiles.length > 0 && (
                  <Action
                    title="すべて削除"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={deleteAllLogs}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
