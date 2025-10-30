import { Action, ActionPanel, Form, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState } from "react";
import type { Alias } from "../types";
import { saveAliases } from "../lib/aliases";

interface OnboardingFormValues {
  globalShortcut: string;
  alias1Title: string;
  alias1Owner: string;
  alias1Extension: string;
  alias1Command: string;
  alias2Title: string;
  alias2Owner: string;
  alias2Extension: string;
  alias2Command: string;
  alias3Title: string;
  alias3Owner: string;
  alias3Extension: string;
  alias3Command: string;
}

// インストール可能な拡張機能の推奨エイリアス例
// 注意: Built-in機能（file-search等）は launchCommand で起動できないため除外
const RECOMMENDED_ALIASES = [
  {
    id: "github_search",
    title: "GitHub Search Repositories",
    target: { owner: "raycast", extension: "github", command: "search-repositories" },
  },
  {
    id: "jira_issues",
    title: "Jira Search Issues",
    target: { owner: "raycast", extension: "jira", command: "search-issues" },
  },
  {
    id: "notion_search",
    title: "Notion Search Pages",
    target: { owner: "notion", extension: "notion", command: "search-page" },
  },
];

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  async function handleSubmit(values: OnboardingFormValues) {
    setIsSubmitting(true);

    try {
      // 2分以内完了の計測（要件 1.8）
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[Onboarding] 完了時間: ${elapsed.toFixed(1)}秒`);

      // エイリアスのバリデーション
      const aliases: Alias[] = [];

      // エイリアス1（必須）
      if (values.alias1Title && values.alias1Owner && values.alias1Extension && values.alias1Command) {
        aliases.push({
          id: `alias_1_${Date.now()}`,
          title: values.alias1Title,
          target: {
            owner: values.alias1Owner,
            extension: values.alias1Extension,
            command: values.alias1Command,
          },
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "エイリアス1は必須項目です",
          message: "すべてのフィールドを入力してください",
        });
        setIsSubmitting(false);
        return;
      }

      // エイリアス2（任意）
      if (values.alias2Title && values.alias2Owner && values.alias2Extension && values.alias2Command) {
        aliases.push({
          id: `alias_2_${Date.now()}`,
          title: values.alias2Title,
          target: {
            owner: values.alias2Owner,
            extension: values.alias2Extension,
            command: values.alias2Command,
          },
        });
      }

      // エイリアス3（任意）
      if (values.alias3Title && values.alias3Owner && values.alias3Extension && values.alias3Command) {
        aliases.push({
          id: `alias_3_${Date.now()}`,
          title: values.alias3Title,
          target: {
            owner: values.alias3Owner,
            extension: values.alias3Extension,
            command: values.alias3Command,
          },
        });
      }

      // エイリアスマネージャーに保存
      await saveAliases(aliases);

      await showToast({
        style: Toast.Style.Success,
        title: "セットアップ完了",
        message: `${aliases.length}個のエイリアスを登録しました。ログ収集を開始します。`,
      });

      // オンボーディング完了後、ルートに戻る
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "セットアップエラー",
        message: error instanceof Error ? error.message : "不明なエラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="セットアップ完了" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description
        title="Command Clinic へようこそ"
        text={`操作ログを収集して、AI が最適化提案を生成します。

⚠️ 重要: Launcher は「エイリアス登録型ランチャー」です。
登録したお気に入りコマンドのみを起動・記録します。
Raycast本体のような全コマンドアクセスではありません。

初回セットアップを完了しましょう（約2分）。`}
      />

      <Form.Separator />

      <Form.Description
        title="ステップ 1: グローバルショートカット"
        text="推奨: ⌥⌘K を設定してください（Raycast設定 > Extensions > Command Clinic）"
      />

      <Form.TextField
        id="globalShortcut"
        title="推奨ショートカット"
        placeholder="⌥⌘K"
        defaultValue="⌥⌘K"
        info="このショートカットは Raycast 設定で手動で設定する必要があります"
      />

      <Form.Separator />

      <Form.Description
        title="ステップ 2: エイリアス登録"
        text="頻繁に使用する3つのコマンドを登録してください。インストール済みの拡張機能を指定してください。"
      />

      <Form.Description
        title="推奨エイリアス例"
        text={`• GitHub Search (raycast/github/search-repositories)\n• Jira Issues (raycast/jira/search-issues)\n• Notion Search (notion/notion/search-page)\n\n⚠️ 注意: Raycast built-in機能（File Search等）は現在サポートされていません。`}
      />

      <Form.Description
        title="⚠️ 初回起動時の許可"
        text="サードパーティ拡張は初回起動時に許可プロンプトが表示されます。「Always Open Command」を選択してください。拡張機能がインストールされていない場合はエラーが表示されます。"
      />

      <Form.Separator />

      <Form.Description title="エイリアス 1（必須）" text="インストール済みの拡張機能を推奨" />
      <Form.TextField
        id="alias1Title"
        title="タイトル"
        placeholder="GitHub Search Repositories"
        defaultValue={RECOMMENDED_ALIASES[0].title}
      />
      <Form.TextField
        id="alias1Owner"
        title="オーナー"
        placeholder="raycast"
        defaultValue={RECOMMENDED_ALIASES[0].target.owner}
      />
      <Form.TextField
        id="alias1Extension"
        title="拡張機能名"
        placeholder="github"
        defaultValue={RECOMMENDED_ALIASES[0].target.extension}
      />
      <Form.TextField
        id="alias1Command"
        title="コマンド名"
        placeholder="search-repositories"
        defaultValue={RECOMMENDED_ALIASES[0].target.command}
      />

      <Form.Separator />

      <Form.Description title="エイリアス 2（任意）" text="追加のコマンドを登録" />
      <Form.TextField
        id="alias2Title"
        title="タイトル"
        placeholder="Clipboard History"
        defaultValue={RECOMMENDED_ALIASES[1].title}
      />
      <Form.TextField
        id="alias2Owner"
        title="オーナー"
        placeholder="raycast"
        defaultValue={RECOMMENDED_ALIASES[1].target.owner}
      />
      <Form.TextField
        id="alias2Extension"
        title="拡張機能名"
        placeholder="clipboard-history"
        defaultValue={RECOMMENDED_ALIASES[1].target.extension}
      />
      <Form.TextField
        id="alias2Command"
        title="コマンド名"
        placeholder="clipboard-history"
        defaultValue={RECOMMENDED_ALIASES[1].target.command}
      />

      <Form.Separator />

      <Form.Description title="エイリアス 3（任意）" text="追加のコマンドを登録" />
      <Form.TextField id="alias3Title" title="タイトル" placeholder="Window Management" />
      <Form.TextField id="alias3Owner" title="オーナー" placeholder="raycast" />
      <Form.TextField id="alias3Extension" title="拡張機能名" placeholder="window-management" />
      <Form.TextField id="alias3Command" title="コマンド名" placeholder="tile-window" />

      <Form.Separator />

      <Form.Description
        title="📋 データ保護とプライバシー"
        text={`すべてのログはローカルに保存されます（外部送信なし）。

• 保存場所: デバイス内の専用ディレクトリ
• 保持期間: 7日間（自動削除）
• 外部送信: 分析実行時のみ Claude API へ送信
• ユーザー制御: 分析は明示的にトリガーした時のみ実行

API キーは Raycast Preferences で安全に管理されます。`}
      />
    </Form>
  );
}
