// 検査結果を持ち出せるよう、Issue列と統計をMarkdownのレポートへ整形する。
// 描画には関わらない純粋関数なので、出力をそのままテストで固定できる。

import type { Stats } from './engine';
import { categoryLabels, type Issue, severityLabels } from './types';

function suffix(issue: Issue): string {
  if (issue.suggestion === undefined || issue.suggestion === issue.text) return '';
  return issue.suggestion === '' ? ' → 削除' : ` → 「${issue.suggestion}」`;
}

export function formatReport(issues: readonly Issue[], stats: Stats): string {
  const sev = stats.bySeverity;
  const lines: string[] = [
    '# 校正レポート',
    '',
    `- 本文: ${stats.chars}字 / ${stats.sentences}文`,
    `- 指摘: ${issues.length}件(エラー ${sev.error} / 警告 ${sev.warning} / 参考 ${sev.info})`,
    '',
  ];

  if (issues.length === 0) {
    lines.push('指摘はありません。');
    return lines.join('\n');
  }

  for (const issue of issues) {
    lines.push(
      `- [${categoryLabels[issue.category]} / ${severityLabels[issue.severity]}] 「${issue.text}」${suffix(issue)}`,
    );
    lines.push(`  - ${issue.message}`);
  }
  return lines.join('\n');
}
