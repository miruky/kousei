import { describe, expect, it } from 'vitest';
import { lint } from './engine';
import { applyAllFixes, applyFix, fixableIssues } from './fixes';
import type { Issue } from './types';

const issueOf = (over: Partial<Issue>): Issue => ({
  ruleId: 'test/rule',
  category: 'style',
  severity: 'info',
  start: 0,
  end: 1,
  text: 'あ',
  message: 'テスト用',
  ...over,
});

describe('applyFix', () => {
  it('指摘の範囲だけを提案で置き換える', () => {
    const text = '変更することができます。';
    const issue = lint(text).find((i) => i.ruleId === 'redundancy/suru-koto-ga-dekiru');
    expect(issue && applyFix(text, issue)).toBe('変更できます。');
  });

  it('本文が変わって範囲が一致しない指摘は適用しない', () => {
    const stale = issueOf({ start: 0, end: 3, text: 'サーバ', suggestion: 'サーバー' });
    expect(applyFix('別の文章です。', stale)).toBe('別の文章です。');
  });

  it('提案のない指摘は本文を変えない', () => {
    const noSuggestion = issueOf({ text: '別の' });
    expect(applyFix('別の文章です。', noSuggestion)).toBe('別の文章です。');
  });
});

describe('fixableIssues', () => {
  it('提案を持つ指摘だけを返す', () => {
    const a = issueOf({ start: 0, end: 2, text: 'ああ', suggestion: 'い' });
    const b = issueOf({ start: 3, end: 5, text: 'うう' });
    expect(fixableIssues([a, b])).toEqual([a]);
  });

  it('重なり合う指摘は先に始まるものだけを残す', () => {
    const first = issueOf({ start: 0, end: 4, text: 'あいうえ', suggestion: 'X' });
    const overlap = issueOf({ start: 2, end: 6, text: 'うえおか', suggestion: 'Y' });
    const after = issueOf({ start: 4, end: 6, text: 'おか', suggestion: 'Z' });
    expect(fixableIssues([overlap, first, after])).toEqual([first, after]);
  });
});

describe('applyAllFixes', () => {
  it('複数の修正を位置ずれなしでまとめて適用する', () => {
    const text = '変更することができます。まず最初に確認します。';
    const { text: fixed, applied } = applyAllFixes(text, lint(text));
    expect(fixed).toBe('変更できます。最初に確認します。');
    expect(applied).toBe(2);
  });

  it('表記ゆれの修正で全体が多数派の表記に揃う', () => {
    const text = 'サーバーとサーバとサーバーの監視。';
    const { text: fixed } = applyAllFixes(text, lint(text));
    expect(fixed).toBe('サーバーとサーバーとサーバーの監視。');
  });

  it('修正対象がなければ本文をそのまま返す', () => {
    const text = '問題のない文章です。';
    const { text: fixed, applied } = applyAllFixes(text, lint(text));
    expect(fixed).toBe(text);
    expect(applied).toBe(0);
  });
});
