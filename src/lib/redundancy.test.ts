import { describe, expect, it } from 'vitest';
import { lint } from './engine';
import { applyFix } from './fixes';

const byRule = (text: string, id: string) => lint(text).filter((i) => i.ruleId === id);

describe('冗長表現の検出', () => {
  it('「することができます」を検出し「できます」を提案する', () => {
    const issues = byRule(
      '設定は管理画面から変更することができます。',
      'redundancy/suru-koto-ga-dekiru',
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('することができます');
    expect(issues[0]?.suggestion).toBe('できます');
  });

  it('過去形・否定形にも活用形を合わせた提案をする', () => {
    expect(
      byRule('確認することができました。', 'redundancy/suru-koto-ga-dekiru')[0]?.suggestion,
    ).toBe('できました');
    expect(
      byRule('確認することができない。', 'redundancy/suru-koto-ga-dekiru')[0]?.suggestion,
    ).toBe('できない');
  });

  it('「できます」だけの文は指摘しない', () => {
    expect(
      byRule('設定は管理画面から変更できます。', 'redundancy/suru-koto-ga-dekiru'),
    ).toHaveLength(0);
  });

  it('「まず最初に」は「最初に」を提案する', () => {
    expect(byRule('まず最初に準備します。', 'redundancy/mazu-saisho')[0]?.suggestion).toBe(
      '最初に',
    );
  });

  it('「一番最初」「一番最後」を重言として検出する', () => {
    expect(byRule('一番最初の手順。', 'redundancy/ichiban-sai')[0]?.suggestion).toBe('最初');
    expect(byRule('一番最後に実行する。', 'redundancy/ichiban-sai')[0]?.suggestion).toBe('最後');
  });

  it('「違和感を感じる」は「違和感を覚える」を提案する', () => {
    const text = 'この説明に違和感を感じる。';
    const issue = byRule(text, 'redundancy/iwakan-kanjiru')[0];
    expect(issue).toBeDefined();
    expect(issue && applyFix(text, issue)).toBe('この説明に違和感を覚える。');
  });

  it('「まだ未確定」は「まだ」を削る', () => {
    const text = '仕様はまだ未確定です。';
    const issue = byRule(text, 'redundancy/mada-mi')[0];
    expect(issue && applyFix(text, issue)).toBe('仕様は未確定です。');
  });

  it('「後で後悔」「過半数を超える」「各ページごと」を検出する', () => {
    expect(byRule('後で後悔しないように。', 'redundancy/atode-koukai')).toHaveLength(1);
    expect(byRule('賛成が過半数を超えた。', 'redundancy/kahansuu')[0]?.suggestion).toBe(
      '半数を超え',
    );
    expect(byRule('各ページごとに設定する。', 'redundancy/kaku-goto')[0]?.suggestion).toBe(
      'ページごと',
    );
  });

  it('「約30分ほど」は重複として「約30分」を提案する', () => {
    expect(byRule('会議は約30分ほどかかる。', 'redundancy/yaku-hodo')[0]?.suggestion).toBe(
      '約30分',
    );
  });

  it('「したいと思います」は言い切りを提案する', () => {
    expect(
      byRule('結果を共有したいと思います。', 'redundancy/shitai-to-omoimasu')[0]?.suggestion,
    ).toBe('します');
  });

  it('「という形で」は提案なしの参考情報として出す', () => {
    const issues = byRule('通知するという形で対応した。', 'redundancy/toiu-katachi');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('info');
    expect(issues[0]?.suggestion).toBeUndefined();
  });
});
