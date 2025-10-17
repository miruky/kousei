import type { Issue, PatternRule } from '../types';

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

// ！ ？ は全角の感嘆符・疑問符、） は全角の閉じ丸括弧
const TERMINATORS = new Set(['。', '!', '?', '！', '？']);
const CLOSERS = new Set(['」', '』', ')', '）', '”', '"']);

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;

  // text === 元テキスト.slice(start, end) の不変条件を保つため、前後の空白は
  // 切り落とした分だけ start / end も詰める
  const push = (endExclusive: number) => {
    const raw = text.slice(start, endExclusive);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      out.push({ text: trimmed, start: start + lead, end: start + lead + trimmed.length });
    }
    start = endExclusive;
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? '';
    if (ch === '\n') {
      push(i);
      start = i + 1;
      i += 1;
      continue;
    }
    if (TERMINATORS.has(ch)) {
      let j = i + 1;
      while (j < text.length && CLOSERS.has(text[j] ?? '')) j += 1;
      push(j);
      i = j;
      continue;
    }
    i += 1;
  }
  push(text.length);
  return out;
}

// ） は全角の閉じ丸括弧
const CLOSE = '」』)）”"';
const POLITE_END = new RegExp(
  `(でしょう|ましょう|でした|ました|ません|ください|です|ます)(?=[${CLOSE}]*$)`,
);
const PLAIN_END = new RegExp(
  `(であった|ではない|である|だろう|だった|ものだ|のだ|だ)(?=[${CLOSE}]*$)`,
);
const SAME_END = new RegExp(`(でした|ました|ません|です|ます)(?=[${CLOSE}]*$)`);

function stripTerminator(s: string): string {
  return s.replace(/[。!?！？\s]+$/u, '');
}

interface MarkedSentence {
  kind: 'polite' | 'plain';
  start: number;
  end: number;
  token: string;
}

function checkMixedStyle(sentences: Sentence[]): Issue[] {
  const marked: MarkedSentence[] = [];
  for (const s of sentences) {
    const core = stripTerminator(s.text);
    const pm = POLITE_END.exec(core);
    const lm = pm === null ? PLAIN_END.exec(core) : null;
    const m = pm ?? lm;
    if (m === null) continue;
    const token = m[1] ?? m[0];
    marked.push({
      kind: pm !== null ? 'polite' : 'plain',
      start: s.start + m.index,
      end: s.start + m.index + token.length,
      token,
    });
  }
  const polite = marked.filter((m) => m.kind === 'polite');
  const plain = marked.filter((m) => m.kind === 'plain');
  if (polite.length === 0 || plain.length === 0) return [];

  // 同数のときは「です・ます」を基調とみなし、だ・である側を指摘する
  const minority = polite.length < plain.length ? polite : plain;
  const majorityLabel = minority === plain ? 'です・ます調' : 'だ・である調';
  const minorityLabel = minority === plain ? 'だ・である調' : 'です・ます調';

  return minority.map((m) => ({
    ruleId: 'style/mixed-style',
    category: 'style' as const,
    severity: 'warning' as const,
    start: m.start,
    end: m.end,
    text: m.token,
    message: `文体の混在。本文の基調は${majorityLabel}だが、この文は${minorityLabel}で結ばれている`,
  }));
}

function checkSentenceLoad(sentences: Sentence[]): Issue[] {
  const issues: Issue[] = [];
  for (const s of sentences) {
    const len = s.text.replace(/\s/g, '').length;
    if (len >= 100) {
      issues.push({
        ruleId: 'style/long-sentence',
        category: 'style',
        severity: 'info',
        start: s.start,
        end: s.end,
        text: s.text,
        message: `1文が${len}字ある。2〜3文に分けると読みやすい`,
      });
    }
    const commas = (s.text.match(/、/g) ?? []).length;
    if (commas >= 5) {
      issues.push({
        ruleId: 'style/comma-overload',
        category: 'style',
        severity: 'info',
        start: s.start,
        end: s.end,
        text: s.text,
        message: `読点が${commas}個ある。文の分割か語順の整理を検討`,
      });
    }
  }
  return issues;
}

function checkSameEnding(sentences: Sentence[]): Issue[] {
  const issues: Issue[] = [];
  let runToken = '';
  let runCount = 0;
  for (const s of sentences) {
    const core = stripTerminator(s.text);
    const m = SAME_END.exec(core);
    const token = m?.[1] ?? '';
    if (token !== '' && token === runToken) {
      runCount += 1;
      if (runCount >= 3 && m !== null) {
        issues.push({
          ruleId: 'style/same-ending',
          category: 'style',
          severity: 'info',
          start: s.start + m.index,
          end: s.start + m.index + token.length,
          text: token,
          message: `「${token}」で終わる文が${runCount}つ続いている。文末に変化をつけると単調さが消える`,
        });
      }
    } else {
      runToken = token;
      runCount = token === '' ? 0 : 1;
    }
  }
  return issues;
}

export function checkStyle(text: string): Issue[] {
  const sentences = splitSentences(text);
  return [
    ...checkMixedStyle(sentences),
    ...checkSentenceLoad(sentences),
    ...checkSameEnding(sentences),
  ];
}

const HALF_KANA =
  'ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
const DAKUTEN_TARGETS = /[カキクケコサシスセソタチツテトハヒフヘホ]/;
const HANDAKUTEN_TARGETS = /[ハヒフヘホ]/;

export function toFullWidthKana(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (ch === 'ﾞ') {
      const prev = out.slice(-1);
      if (prev === 'ウ') {
        out = `${out.slice(0, -1)}ヴ`;
      } else if (DAKUTEN_TARGETS.test(prev)) {
        out = out.slice(0, -1) + String.fromCharCode(prev.charCodeAt(0) + 1);
      } else {
        out += '゛';
      }
    } else if (ch === 'ﾟ') {
      const prev = out.slice(-1);
      if (HANDAKUTEN_TARGETS.test(prev)) {
        out = out.slice(0, -1) + String.fromCharCode(prev.charCodeAt(0) + 2);
      } else {
        out += '゜';
      }
    } else if (code >= 0xff66 && code <= 0xff9d) {
      out += HALF_KANA[code - 0xff66] ?? ch;
    } else {
      out += ch;
    }
  }
  return out;
}

export function toHalfWidthAlnum(input: string): string {
  // ！-～ は全角ASCII領域。半角との差は常に 0xfee0
  return input.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

export const stylePatternRules: PatternRule[] = [
  {
    id: 'style/no-renzoku',
    category: 'style',
    severity: 'info',
    pattern: /(?:[^の、。\s]{1,8}の){3,}[^の、。\s]/g,
    message: '「の」が3回以上連続している。係り受けを整理すると読みやすい',
  },
  {
    id: 'style/hankaku-kana',
    category: 'style',
    severity: 'warning',
    pattern: /[ｦ-ﾟ]+/g,
    message: '半角カタカナ。全角カタカナに統一する',
    suggest: (m) => toFullWidthKana(m[0]),
  },
  {
    id: 'style/zenkaku-alnum',
    category: 'style',
    severity: 'info',
    // 全角の英字(Ａ-Ｚ, ａ-ｚ)と数字(０-９)。
    // 「2.0」のように全角ピリオド・カンマでつながる並びはひとまとまりで扱う
    pattern: /[Ａ-Ｚａ-ｚ０-９]+(?:[．，][Ａ-Ｚａ-ｚ０-９]+)*/g,
    message: '全角英数字。半角に統一すると他の英数字と揃う',
    suggest: (m) => toHalfWidthAlnum(m[0]),
  },
  {
    id: 'style/double-particle',
    category: 'style',
    severity: 'error',
    pattern: /([をにへで])\1/g,
    message: '同じ助詞が連続している。タイプミスの可能性が高い',
    suggest: (m) => m[1] ?? '',
  },
];
