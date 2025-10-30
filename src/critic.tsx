/**
 * Critic コンポーネント
 * タスク 7.1 & 7.2: AI 分析結果表示機能
 */

import { Detail, ActionPanel, Action, List, Toast, showToast, Clipboard, open, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readRecentLogs } from "../lib/log";
import { fetchAnalysis } from "../lib/claude";
import { generateSnippetYAML, generateMacroShell, formatShortcutGuide } from "../lib/templates";
import type { Proposal, ExtensionHint } from "../types";

/**
 * 提案を Markdown 形式でフォーマット
 */
function formatProposal(proposal: Proposal): string {
  const typeEmoji = {
    shortcut: "⌨️",
    snippet: "📝",
    macro: "🔗"
  };

  const typeLabel = {
    shortcut: "ショートカット提案",
    snippet: "スニペット提案",
    macro: "マクロ提案"
  };

  let markdown = `# ${typeEmoji[proposal.type]} ${typeLabel[proposal.type]}\n\n`;
  markdown += `## ${proposal.title}\n\n`;
  markdown += `**理由**: ${proposal.rationale}\n\n`;

  // 証拠データの表示
  if (proposal.evidence) {
    markdown += `### 📊 証拠データ\n\n`;

    if (proposal.evidence.count !== undefined) {
      markdown += `- **頻度**: ${proposal.evidence.count}回\n`;
    }

    if (proposal.evidence.aliases && proposal.evidence.aliases.length > 0) {
      markdown += `- **関連エイリアス**: ${proposal.evidence.aliases.join(", ")}\n`;
    }

    if (proposal.evidence.time_windows && proposal.evidence.time_windows.length > 0) {
      markdown += `- **時間帯**: ${proposal.evidence.time_windows.join(", ")}\n`;
    }

    markdown += `\n`;
  }

  // 信頼度スコアの表示
  const confidencePercent = Math.round(proposal.confidence * 100);
  markdown += `**信頼度**: ${confidencePercent}%\n\n`;

  // ペイロードの詳細表示
  markdown += `### 💡 実装内容\n\n`;

  if ("shortcut" in proposal.payload) {
    const { aliasId, suggestedHotkey } = proposal.payload.shortcut;
    markdown += `- **エイリアス**: ${aliasId}\n`;
    markdown += `- **推奨ホットキー**: ${suggestedHotkey}\n`;
    markdown += `\n**手順**: Raycast Settings > Extensions > Command Critic > ${aliasId} のホットキーを設定してください。\n`;
  } else if ("snippet" in proposal.payload) {
    const { text, alias } = proposal.payload.snippet;
    markdown += `- **スニペット**: \`${alias}\`\n`;
    markdown += `- **展開後**: ${text}\n`;
    markdown += `\n**手順**: 下のアクションから YAML 定義をコピーし、Raycast Settings > Extensions > Snippets に貼り付けてください。\n`;
  } else if ("macro" in proposal.payload) {
    const { sequence } = proposal.payload.macro;
    markdown += `- **連鎖シーケンス**:\n`;
    sequence.forEach((step, index) => {
      markdown += `  ${index + 1}. ${step}\n`;
    });
    markdown += `\n**手順**: 下のアクションから Shell スクリプトをコピーし、Raycast Script Commands ディレクトリに保存してください。\n`;
  }

  return markdown;
}

/**
 * 提案なしの場合のメッセージ
 */
function getNoProposalsMessage(logsCount: number): string {
  if (logsCount === 0) {
    return `# 📭 データ不足

現在、分析可能なログがありません。

**次のステップ**:
1. Launcher を使用してコマンドを起動
2. 数日間の操作を記録
3. 再度分析を実行

最低でも 3 日分の操作ログがあると、より正確な提案が可能になります。`;
  }

  return `# ✅ ワークフローは最適化済み

${logsCount}件のログを分析しましたが、改善提案は見つかりませんでした。

**これは良いサインです！**
- 現在のワークフローは効率的です
- 重複した操作パターンはありません
- 自動化の機会は少ない状態です

引き続き Raycast を効率的に使用してください。`;
}

/**
 * Critic: AI 分析結果表示コンポーネント
 */
export default function Critic() {
  const { data, isLoading, error } = usePromise(async () => {
    try {
      // ログを読み込み（要件 3.2, 3.3）
      const logs = await readRecentLogs(7, 100);

      if (logs.length === 0) {
        return { proposals: [], extensionHints: [], logsCount: 0 };
      }

      // AI 分析を実行（要件 3.1）+ Phase 2 拡張機能ヒント
      const result = await fetchAnalysis(logs);

      return {
        proposals: result.proposals,
        extensionHints: result.extension_hints || [],
        logsCount: logs.length
      };
    } catch (err: any) {
      // エラーをトーストで表示（要件 9.2）
      await showToast({
        style: Toast.Style.Failure,
        title: "分析エラー",
        message: err.message || "AI分析に失敗しました"
      });
      throw err;
    }
  });

  // ローディング中
  if (isLoading) {
    return <Detail isLoading={true} markdown="# 🔍 分析中...\n\nログを読み込んで AI 分析を実行しています。しばらくお待ちください。" />;
  }

  // エラー発生時
  if (error) {
    return (
      <Detail
        markdown={`# ❌ エラーが発生しました\n\n${error.message}\n\n**トラブルシューティング**:\n- API キーが正しく設定されているか確認\n- インターネット接続を確認\n- しばらく待ってから再試行`}
        actions={
          <ActionPanel>
            <Action.Push title="Retry" target={<Critic />} />
          </ActionPanel>
        }
      />
    );
  }

  // 提案がない場合（要件 3.11, 4.8）
  if (!data || (data.proposals.length === 0 && data.extensionHints.length === 0)) {
    return <Detail markdown={getNoProposalsMessage(data?.logsCount || 0)} />;
  }

  // 提案リストを表示（要件 4.1-4.7）+ Phase 2 拡張機能推奨
  return (
    <List>
      {/* 既存の提案セクション */}
      {data.proposals.length > 0 && (
        <List.Section title="🎯 最適化提案">
          {data.proposals.map((proposal, index) => (
            <List.Item
              key={`proposal-${index}`}
              icon={Icon.Bolt}
              title={proposal.title}
              subtitle={`${proposal.type} · ${Math.round(proposal.confidence * 100)}%`}
              accessories={[
                { text: proposal.rationale }
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<ProposalDetail proposal={proposal} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Phase 2: 拡張機能推奨セクション */}
      {data.extensionHints && data.extensionHints.length > 0 && (
        <List.Section title="💡 拡張機能の推奨">
          {data.extensionHints.map((hint, index) => (
            <List.Item
              key={`extension-${index}`}
              icon={Icon.Download}
              title={hint.extension_name}
              subtitle={`"${hint.keyword}" を ${hint.frequency}回検出`}
              accessories={[
                { text: hint.description }
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Search in Raycast Store"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => open(`raycast://store/search?q=${encodeURIComponent(hint.suggested_search)}`)}
                  />
                  <Action.Push
                    title="View Details"
                    target={<ExtensionRecommendation hint={hint} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/**
 * ProposalDetail: 個別の提案詳細表示
 * タスク 8.2: コピーアクションとディープリンク
 */
function ProposalDetail({ proposal }: { proposal: Proposal }) {
  const markdown = formatProposal(proposal);

  // スニペット定義をコピー（要件 5.1, 5.2）
  const copySnippet = async () => {
    try {
      const yaml = generateSnippetYAML(proposal);
      await Clipboard.copy(yaml);
      await showToast({
        style: Toast.Style.Success,
        title: "コピー完了",
        message: "スニペット定義をクリップボードにコピーしました"
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "コピー失敗",
        message: err.message
      });
    }
  };

  // マクロテンプレートをコピー（要件 5.3, 5.4）
  const copyMacro = async () => {
    try {
      const script = generateMacroShell(proposal);
      await Clipboard.copy(script);
      await showToast({
        style: Toast.Style.Success,
        title: "コピー完了",
        message: "マクロスクリプトをクリップボードにコピーしました"
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "コピー失敗",
        message: err.message
      });
    }
  };

  // Raycast 設定を開く（要件 5.5, 5.6）
  const openSettings = async () => {
    try {
      await open("raycast://extensions/settings");
      await showToast({
        style: Toast.Style.Success,
        title: "設定画面を開きました",
        message: "Extensions タブから Command Critic を探してください"
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "開けませんでした",
        message: "手動で Raycast Settings を開いてください"
      });
    }
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* 提案タイプに応じたアクション */}
          {"snippet" in proposal.payload && (
            <>
              <Action
                title="Copy Snippet Definition"
                onAction={copySnippet}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Open Snippets Settings"
                onAction={() => open("raycast://extensions/snippets")}
              />
            </>
          )}
          {"macro" in proposal.payload && (
            <>
              <Action
                title="Copy Macro Template"
                onAction={copyMacro}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Open Script Commands Folder"
                onAction={() => open("~/Documents/Raycast/Scripts")}
              />
            </>
          )}
          {"shortcut" in proposal.payload && (
            <Action
              title="Open Raycast Settings"
              onAction={openSettings}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/**
 * ExtensionRecommendation: 拡張機能推奨の詳細表示（Phase 2）
 */
function ExtensionRecommendation({ hint }: { hint: ExtensionHint }) {
  const markdown = `# 💡 拡張機能の推奨

## ${hint.extension_name}

**検出パターン**: \`${hint.keyword}\`
**検出頻度**: ${hint.frequency}回

### なぜこの拡張機能が役立つか

${hint.description}

### 次のステップ

1. 下のアクションから "Search in Raycast Store" をクリック
2. Raycast Store で "${hint.suggested_search}" を検索
3. 拡張機能をインストール
4. Command Critic のエイリアスに追加して利用開始

### 利用パターンの改善例

現在:
- 手動で "${hint.keyword}" を入力
- ブラウザや他のアプリに切り替え
- 効率的でない操作フロー

拡張機能導入後:
- Raycast から直接アクセス
- キーボードショートカットで高速化
- 統合されたワークフロー

**投資対効果**:
週${hint.frequency}回の操作 × 30秒の時間短縮 = 週${Math.round(hint.frequency * 0.5)}分の効率化`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Search in Raycast Store"
            icon={Icon.MagnifyingGlass}
            onAction={() => open(`raycast://store/search?q=${encodeURIComponent(hint.suggested_search)}`)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="View Raycast Store"
            icon={Icon.Globe}
            onAction={() => open("https://www.raycast.com/store")}
          />
        </ActionPanel>
      }
    />
  );
}
