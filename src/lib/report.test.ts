import { describe, expect, it } from 'vitest';
import { analyze } from './engine';
import { formatReport } from './report';

describe('formatReport', () => {
  it('指摘が無ければその旨を書く', () => {
    const { issues, stats } = analyze('短い報告です。');
    const report = formatReport(issues, stats);
    expect(report).toContain('# 校正レポート');
    expect(report).toContain('指摘はありません。');
  });

  it('見出し・統計・各指摘の行を含む', () => {
    const { issues, stats } = analyze('サーバーとサーバが混在する。サーバーを確認した。');
    const report = formatReport(issues, stats);
    expect(report.startsWith('# 校正レポート')).toBe(true);
    expect(report).toContain(`- 指摘: ${issues.length}件`);
    // サーバ → サーバー の置換提案が矢印付きで出る
    expect(report).toContain('「サーバ」 → 「サーバー」');
  });

  it('提案のない指摘は矢印を付けない', () => {
    const issues = [
      {
        ruleId: 'test',
        category: 'style' as const,
        severity: 'info' as const,
        start: 0,
        end: 2,
        text: '長文',
        message: '一文が長い',
      },
    ];
    const stats = {
      chars: 2,
      sentences: 1,
      issueCount: 1,
      byCategory: { variant: 0, redundancy: 0, misuse: 0, style: 1 },
      bySeverity: { error: 0, warning: 0, info: 1 },
    };
    const report = formatReport(issues, stats);
    expect(report).toContain('「長文」');
    expect(report).not.toContain('→');
  });
});
