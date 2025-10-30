/**
 * エイリアス管理UIコンポーネント
 * タスク 3.2: エイリアス管理UIコンポーネント実装
 */

import {
  List,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Alias } from "../types";
import { getAliases, addAlias, removeAlias, updateAlias } from "../lib/aliases";

/**
 * エイリアス管理のメインコンポーネント
 * エイリアスの一覧表示、追加、編集、削除機能を提供
 */
export default function ManageAliases() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // エイリアス一覧を読み込み
  async function loadAliases() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAliases();
      setAliases(data);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "エイリアスの読み込みに失敗しました";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "読み込みエラー",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // エイリアスを削除
  async function handleDelete(id: string, title: string) {
    const confirmed = await confirmAlert({
      title: "エイリアスを削除",
      message: `「${title}」を削除してもよろしいですか？`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await removeAlias(id);
      await showToast({
        style: Toast.Style.Success,
        title: "削除完了",
        message: `「${title}」を削除しました`,
      });
      await loadAliases();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "削除エラー",
        message: e instanceof Error ? e.message : "削除に失敗しました",
      });
    }
  }

  // 初回読み込み
  useEffect(() => {
    loadAliases();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="エイリアスを検索...">
      <List.Section title={`登録済みエイリアス (${aliases.length}/20)`}>
        {aliases.map((alias) => (
          <List.Item
            key={alias.id}
            title={alias.title}
            subtitle={`${alias.target.owner}/${alias.target.extension}/${alias.target.command}`}
            icon={Icon.Terminal}
            accessories={[{ text: alias.id }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="編集"
                  icon={Icon.Pencil}
                  target={<EditAliasForm alias={alias} onUpdate={loadAliases} />}
                />
                <Action
                  title="削除"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(alias.id, alias.title)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="新規追加"
                    icon={Icon.Plus}
                    target={<AddAliasForm onAdd={loadAliases} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action title="再読み込み" icon={Icon.ArrowClockwise} onAction={loadAliases} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {aliases.length === 0 && !isLoading && (
        <List.EmptyView
          title="エイリアスが登録されていません"
          description="新しいエイリアスを追加してください"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push title="新規追加" icon={Icon.Plus} target={<AddAliasForm onAdd={loadAliases} />} />
            </ActionPanel>
          }
        />
      )}

      {error && (
        <List.EmptyView
          title="エラーが発生しました"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="再読み込み" icon={Icon.ArrowClockwise} onAction={loadAliases} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

/**
 * エイリアス追加フォームコンポーネント
 */
function AddAliasForm({ onAdd }: { onAdd: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(values: {
    id: string;
    title: string;
    owner: string;
    extension: string;
    command: string;
  }) {
    // バリデーション
    if (!values.id || !values.title || !values.owner || !values.extension || !values.command) {
      setValidationError("すべてのフィールドを入力してください");
      await showToast({
        style: Toast.Style.Failure,
        title: "入力エラー",
        message: "すべての必須フィールドを入力してください",
      });
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const newAlias: Alias = {
        id: values.id,
        title: values.title,
        target: {
          owner: values.owner,
          extension: values.extension,
          command: values.command,
        },
      };

      await addAlias(newAlias);
      await showToast({
        style: Toast.Style.Success,
        title: "追加完了",
        message: `「${values.title}」を追加しました`,
      });

      await onAdd();
      pop();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "追加に失敗しました";
      setValidationError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "追加エラー",
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="追加" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description
        title="新しいエイリアスを追加"
        text="Raycast コマンドのエイリアスを登録します。Raycast 標準機能を推奨します。"
      />

      {validationError && (
        <Form.Description title="エラー" text={validationError} />
      )}

      <Form.TextField
        id="id"
        title="ID"
        placeholder="file-search"
        info="一意の識別子（英数字、ハイフン、アンダースコア）"
      />
      <Form.TextField
        id="title"
        title="タイトル"
        placeholder="File Search"
        info="エイリアスの表示名"
      />
      <Form.TextField
        id="owner"
        title="オーナー"
        placeholder="raycast"
        info="拡張機能のオーナー（Raycast標準機能は 'raycast'）"
      />
      <Form.TextField
        id="extension"
        title="拡張機能名"
        placeholder="file-search"
        info="拡張機能の識別子"
      />
      <Form.TextField
        id="command"
        title="コマンド名"
        placeholder="search-files"
        info="実行するコマンドの識別子"
      />

      <Form.Separator />

      <Form.Description
        title="推奨設定例"
        text={`• File Search: raycast/file-search/search-files\n• Clipboard History: raycast/clipboard-history/clipboard-history\n• Window Management: raycast/window-management/tile-window`}
      />
    </Form>
  );
}

/**
 * エイリアス編集フォームコンポーネント
 */
function EditAliasForm({ alias, onUpdate }: { alias: Alias; onUpdate: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(values: {
    title: string;
    owner: string;
    extension: string;
    command: string;
  }) {
    // バリデーション
    if (!values.title || !values.owner || !values.extension || !values.command) {
      setValidationError("すべてのフィールドを入力してください");
      await showToast({
        style: Toast.Style.Failure,
        title: "入力エラー",
        message: "すべての必須フィールドを入力してください",
      });
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      await updateAlias(alias.id, {
        title: values.title,
        target: {
          owner: values.owner,
          extension: values.extension,
          command: values.command,
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "更新完了",
        message: `「${values.title}」を更新しました`,
      });

      await onUpdate();
      pop();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "更新に失敗しました";
      setValidationError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "更新エラー",
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="更新" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description
        title={`エイリアスを編集: ${alias.title}`}
        text="エイリアスの設定を変更します。ID は変更できません。"
      />

      {validationError && (
        <Form.Description title="エラー" text={validationError} />
      )}

      <Form.TextField
        id="id"
        title="ID"
        value={alias.id}
        info="ID は変更できません"
      />
      <Form.TextField
        id="title"
        title="タイトル"
        placeholder="File Search"
        defaultValue={alias.title}
      />
      <Form.TextField
        id="owner"
        title="オーナー"
        placeholder="raycast"
        defaultValue={alias.target.owner}
      />
      <Form.TextField
        id="extension"
        title="拡張機能名"
        placeholder="file-search"
        defaultValue={alias.target.extension}
      />
      <Form.TextField
        id="command"
        title="コマンド名"
        placeholder="search-files"
        defaultValue={alias.target.command}
      />
    </Form>
  );
}
