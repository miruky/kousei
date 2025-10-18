import { describe, expect, it } from 'vitest';
import { lint } from './engine';
import { applyFix } from './fixes';

const byRule = (text: string, id: string) => lint(text).filter((i) => i.ruleId === id);

describe('ら抜き言葉', () => {
  it('「見れる」を検出し「見られる」を提案する', () => {
    const issues = byRule('ここから富士山が見れる。', 'misuse/ra-nuki');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.suggestion).toBe('見られる');
  });

  it('「食べれない」「来れた」も活用形ごと直す', () => {
    expect(byRule('生ものは食べれない。', 'misuse/ra-nuki')[0]?.suggestion).toBe('食べられない');
    expect(byRule('ようやく来れた。', 'misuse/ra-nuki')[0]?.suggestion).toBe('来られた');
  });

  it('仮定形「見れば」「出れば」は正しい形なので指摘しない', () => {
    expect(byRule('結果を見れば分かる。', 'misuse/ra-nuki')).toHaveLength(0);
    expect(byRule('早く家を出れば間に合う。', 'misuse/ra-nuki')).toHaveLength(0);
  });

  it('五段動詞の可能形「帰れる」「読める」は指摘しない', () => {
    expect(byRule('今日は早く帰れる。', 'misuse/ra-nuki')).toHaveLength(0);
  });
});

describe('さ入れ言葉', () => {
  it('「休まさせていただく」を検出し「休ませて」へ直す', () => {
    const text = '明日は休まさせていただきます。';
    const issue = byRule(text, 'misuse/sa-ire')[0];
    expect(issue && applyFix(text, issue)).toBe('明日は休ませていただきます。');
  });

  it('正しい使役「読ませていただく」「説明させていただく」は指摘しない', () => {
    expect(byRule('原稿を読ませていただきます。', 'misuse/sa-ire')).toHaveLength(0);
    expect(byRule('要点を説明させていただきます。', 'misuse/sa-ire')).toHaveLength(0);
  });
});

describe('い抜き言葉', () => {
  it('「知ってます」「読んでる」を参考レベルで検出する', () => {
    const te = byRule('結果はもう知ってます。', 'misuse/i-nuki-te');
    expect(te[0]?.severity).toBe('info');
    expect(te[0]?.suggestion).toBe('知っています');
    expect(byRule('毎朝新聞を読んでる。', 'misuse/i-nuki-de')[0]?.suggestion).toBe('読んでいる');
  });

  it('「知っています」は指摘しない', () => {
    expect(byRule('結果はもう知っています。', 'misuse/i-nuki-te')).toHaveLength(0);
  });
});

describe('慣用句の誤用', () => {
  it('「的を得た」は「的を射た」を提案する(参考レベル)', () => {
    const issues = byRule('的を得た指摘だった。', 'misuse/mato-wo-eru');
    expect(issues[0]?.severity).toBe('info');
    expect(issues[0]?.suggestion).toBe('的を射た');
  });

  it('「汚名挽回」「押しも押されぬ」「取り付く暇」を検出する', () => {
    expect(byRule('汚名挽回のチャンスだ。', 'misuse/omei-bankai')[0]?.suggestion).toBe('汚名返上');
    expect(byRule('押しも押されぬ実力者。', 'misuse/oshimo-osarenu')[0]?.suggestion).toBe(
      '押しも押されもせぬ',
    );
    expect(byRule('取り付く暇もない。', 'misuse/toritsuku-hima')[0]?.suggestion).toBe('取り付く島');
  });

  it('「二の舞を踏んだ」は活用を合わせて「二の舞を演じた」へ直す', () => {
    const text = '前任者の二の舞を踏んだ。';
    const issue = byRule(text, 'misuse/ninomai-fumu')[0];
    expect(issue && applyFix(text, issue)).toBe('前任者の二の舞を演じた。');
  });

  it('「雪辱を晴らす」は「雪辱を果たす」へ直す', () => {
    const text = '前回の雪辱を晴らす。';
    const issue = byRule(text, 'misuse/setsujoku-harasu')[0];
    expect(issue && applyFix(text, issue)).toBe('前回の雪辱を果たす。');
  });
});

describe('二重否定', () => {
  it('「ないことはない」を参考として検出する(提案はしない)', () => {
    const issues = byRule('行けないことはない。', 'misuse/nijuu-hitei');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.suggestion).toBeUndefined();
  });
});
