import { describe, expect, it } from 'vitest';
import { checkStyle, splitSentences, toFullWidthKana, toHalfWidthAlnum } from './rules/style';
import { lint } from './engine';

const byRule = (text: string, id: string) => lint(text).filter((i) => i.ruleId === id);

describe('splitSentences', () => {
  it('句点・感嘆符・改行で区切り、位置が本文と一致する', () => {
    const text = '今日は晴れ。明日は雨だ!\nあさっては不明';
    const sentences = splitSentences(text);
    expect(sentences.map((s) => s.text)).toEqual(['今日は晴れ。', '明日は雨だ!', 'あさっては不明']);
    for (const s of sentences) {
      expect(text.slice(s.start, s.end)).toBe(s.text);
    }
  });

  it('句点直後の閉じ括弧は前の文に含めて区切る', () => {
    const sentences = splitSentences('彼は「行く。」と言った。');
    expect(sentences.map((s) => s.text)).toEqual(['彼は「行く。」', 'と言った。']);
  });

  it('空行や空白だけの行は文として数えない', () => {
    expect(splitSentences('一文目。\n\n  \n二文目。')).toHaveLength(2);
  });
});

describe('文体の混在', () => {
  it('です・ます調が基調のとき、だ・である調の文末を指摘する', () => {
    const text = 'これは便利です。とても助かります。しかし課題も残るのである。';
    const issues = byRule(text, 'style/mixed-style');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('である');
    expect(text.slice(issues[0]?.start, issues[0]?.end)).toBe('である');
  });

  it('文体が揃っていれば指摘しない', () => {
    expect(byRule('これは便利です。とても助かります。', 'style/mixed-style')).toHaveLength(0);
    expect(byRule('これは便利だ。とても助かるのである。', 'style/mixed-style')).toHaveLength(0);
  });
});

describe('文の負荷', () => {
  it('100字を超える文を指摘する', () => {
    const long = `${'この説明はとても長く続いており、'.repeat(8)}終わります。`;
    expect(byRule(long, 'style/long-sentence')).toHaveLength(1);
  });

  it('読点が5つ以上ある文を指摘する', () => {
    const text = '詳細は、担当者が、資料を、まとめて、追って、説明します。';
    const issues = byRule(text, 'style/comma-overload');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('5');
  });

  it('短く読点の少ない文は指摘しない', () => {
    expect(byRule('短い文です。', 'style/long-sentence')).toHaveLength(0);
    expect(byRule('短い文です。', 'style/comma-overload')).toHaveLength(0);
  });
});

describe('同じ文末の連続', () => {
  it('同じ文末が3文続いたら3文目以降を指摘する', () => {
    const text = '朝に走ります。昼は泳ぎます。夜は休みます。翌日も走ります。';
    const issues = byRule(text, 'style/same-ending');
    expect(issues).toHaveLength(2);
    expect(issues[0]?.text).toBe('ます');
  });

  it('2文までは指摘しない', () => {
    expect(byRule('走ります。泳ぎます。', 'style/same-ending')).toHaveLength(0);
  });
});

describe('文字種', () => {
  it('半角カタカナを全角へ変換する提案を出す', () => {
    const issues = byRule('ﾃﾞｰﾀを確認した。', 'style/hankaku-kana');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.suggestion).toBe('データ');
  });

  it('toFullWidthKanaは濁点・半濁点・ヴを正しく合成する', () => {
    expect(toFullWidthKana('ﾃﾞｰﾀ')).toBe('データ');
    expect(toFullWidthKana('ｳﾞｧｲｵﾘﾝ')).toBe('ヴァイオリン');
    expect(toFullWidthKana('ﾊﾟﾝﾄﾞﾗ')).toBe('パンドラ');
  });

  it('全角英数字に半角化の提案を出す', () => {
    const issues = byRule('バージョン２．０をリリースした。', 'style/zenkaku-alnum');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('２．０');
    expect(issues[0]?.suggestion).toBe('2.0');
    expect(toHalfWidthAlnum('ＡＢＣ１２３')).toBe('ABC123');
  });

  it('半角の英数字は指摘しない', () => {
    expect(byRule('Version 2.0 をリリースした。', 'style/zenkaku-alnum')).toHaveLength(0);
  });
});

describe('助詞・係り受け', () => {
  it('同じ助詞の連続をエラーとして検出する', () => {
    const issues = byRule('資料をを送付した。', 'style/double-particle');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.suggestion).toBe('を');
  });

  it('「の」の3連続を参考として指摘する', () => {
    expect(byRule('私の母の友人の犬の話。', 'style/no-renzoku')).toHaveLength(1);
    expect(byRule('私の犬の話。', 'style/no-renzoku')).toHaveLength(0);
  });

  it('checkStyleは空文字列で何も返さない', () => {
    expect(checkStyle('')).toHaveLength(0);
  });
});
