import { describe, expect, it } from 'vitest';
import { analyze, lint } from './engine';

const SAMPLE = [
  '新しいサーバーの構成について説明します。サーバの設定は、管理画面から変更することができます。',
  'まず最初に、ユーザー登録の流れを確認します。承認済みのユーザがログインすると、ダッシュボードを見れるようになります。',
  'この挙動に違和感を感じる人もいるかもしれないが、現行の仕様は的を得た設計である。',
  '詳細は、担当の者が、資料を、まとめて、追って、説明させていただきますので、後で後悔しないよう、当日までに目を通しておいてください。',
  'なお、バージョン２．０の変更点は、まだ未確定です。',
].join('\n');

describe('lint', () => {
  it('空文字列には何も指摘しない', () => {
    expect(lint('')).toHaveLength(0);
  });

  it('指摘のない文章には何も返さない', () => {
    expect(lint('短い報告です。問題はありません。')).toHaveLength(0);
  });

  it('すべての指摘で text が本文の該当範囲と一致する', () => {
    const issues = lint(SAMPLE);
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(SAMPLE.slice(issue.start, issue.end)).toBe(issue.text);
    }
  });

  it('指摘は開始位置の昇順で返る', () => {
    const issues = lint(SAMPLE);
    for (let i = 1; i < issues.length; i++) {
      expect(issues[i]!.start).toBeGreaterThanOrEqual(issues[i - 1]!.start);
    }
  });

  it('4カテゴリすべてを横断して検出する', () => {
    const cats = new Set(lint(SAMPLE).map((i) => i.category));
    expect(cats).toContain('variant');
    expect(cats).toContain('redundancy');
    expect(cats).toContain('misuse');
    expect(cats).toContain('style');
  });
});

describe('analyze', () => {
  it('文字数は空白と改行を除いて数える', () => {
    const { stats } = analyze('一二三 四五\n六。');
    expect(stats.chars).toBe(7);
    expect(stats.sentences).toBe(2);
  });

  it('カテゴリ別・重大度別の集計が総数と一致する', () => {
    const { issues, stats } = analyze(SAMPLE);
    expect(stats.issueCount).toBe(issues.length);
    const catSum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    const sevSum = Object.values(stats.bySeverity).reduce((a, b) => a + b, 0);
    expect(catSum).toBe(issues.length);
    expect(sevSum).toBe(issues.length);
  });

  it('空文字列の統計はすべてゼロ', () => {
    const { stats } = analyze('');
    expect(stats.chars).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.issueCount).toBe(0);
  });
});
