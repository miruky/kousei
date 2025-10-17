import type { Issue } from '../types';

// 表記ゆれは単独の出現では問題にならず、同じ文書に複数の表記が混在して初めて
// 指摘になる。そのためパターン規則とは別に、文書全体を集計してから判定する。
export interface VariantGroup {
  id: string;
  /**
   * 同じ語の表記クラス。先頭のクラスを同数時の採用形とする。
   * クラス間で語形のインデックスを揃えておくと、活用形ごとの置換先を導ける。
   */
  classes: string[][];
  /** 漢字で始まる・終わる語形の前後に漢字や数字を許さない(熟語の一部を除外) */
  boundary?: boolean;
  /**
   * boundaryのうち直前側の漢字チェックだけを外す。「申請出来ます」のように
   * 漢語名詞の直後に来る語形を数えたいときに使う
   */
  allowKanjiBefore?: boolean;
  /** 直前の1文字がこれなら別語とみなして数えない */
  notAfter?: string[];
}

export const variantGroups: VariantGroup[] = [
  { id: 'server', classes: [['サーバー'], ['サーバ']] },
  { id: 'user', classes: [['ユーザー'], ['ユーザ']] },
  { id: 'computer', classes: [['コンピューター'], ['コンピュータ']] },
  { id: 'folder', classes: [['フォルダー'], ['フォルダ']] },
  { id: 'printer', classes: [['プリンター'], ['プリンタ']] },
  { id: 'browser', classes: [['ブラウザー'], ['ブラウザ']] },
  { id: 'interface', classes: [['インターフェース'], ['インターフェイス'], ['インタフェース']] },
  // 「上出来」「不出来」は名詞、「出来事」は熟語なので数えない。
  // 「申請出来ます」のような漢語直後の「出来」は表記ゆれとして数える
  {
    id: 'dekiru',
    boundary: true,
    allowKanjiBefore: true,
    notAfter: ['上', '不'],
    classes: [['でき'], ['出来']],
  },
  { id: 'kudasai', boundary: true, classes: [['ください'], ['下さい']] },
  // 「致し方ない」を巻き込まないよう「ま」まで含めて照合する
  { id: 'itashimasu', boundary: true, classes: [['いたしま'], ['致しま']] },
  { id: 'itadaku', boundary: true, classes: [['いただ'], ['頂']] },
  // 「3件に及び」は動詞「及ぶ」の連用形なので、接続詞の表記ゆれとは区別する
  { id: 'oyobi', boundary: true, notAfter: ['に', 'も'], classes: [['および'], ['及び']] },
  { id: 'sarani', boundary: true, classes: [['さらに'], ['更に']] },
  { id: 'tadashi', boundary: true, classes: [['ただし'], ['但し']] },
  { id: 'subete', boundary: true, classes: [['すべて'], ['全て']] },
  {
    id: 'okonau',
    boundary: true,
    // 「行った」は「いった」と読み分けられないため、活用形に含めない
    classes: [
      ['行う', '行い', '行わ', '行え'],
      ['行なう', '行ない', '行なわ', '行なえ'],
    ],
  },
  { id: 'toiawase', classes: [['問い合わせ'], ['問合せ'], ['問合わせ']] },
  { id: 'uchiawase', classes: [['打ち合わせ'], ['打合せ'], ['打ち合せ']] },
  { id: 'moushikomi', classes: [['申し込み'], ['申込み']] },
  { id: 'toriatsukai', classes: [['取り扱い'], ['取扱い']] },
  { id: 'tatoeba', boundary: true, classes: [['例えば'], ['たとえば']] },
  { id: 'mata', classes: [['また、'], ['又、']] },
  { id: 'matawa', boundary: true, classes: [['または'], ['又は']] },
  { id: 'nao', classes: [['なお、'], ['尚、']] },
  {
    id: 'arigatou',
    classes: [['ありがとうございま'], ['有難うございま'], ['有り難うございま']],
  },
  { id: 'yoroshiku', classes: [['よろしくお願い'], ['宜しくお願い']] },
  // 「まこと」「ひとこと」を巻き込まないよう、直前の文字で別語を除外する
  { id: 'koto', boundary: true, notAfter: ['ま', 'と', 'み'], classes: [['こと'], ['事']] },
];

const KANJI = '一-龠々';

function isKanji(ch: string): boolean {
  return new RegExp(`[${KANJI}]`).test(ch);
}

function isKatakana(ch: string): boolean {
  return /[ァ-ヶー]/.test(ch);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formSource(form: string, group: VariantGroup): string {
  let src = escapeRegExp(form);
  const first = form.charAt(0);
  const last = form.charAt(form.length - 1);
  if (group.boundary) {
    if (isKanji(first) && !group.allowKanjiBefore) src = `(?<![${KANJI}0-9０-９])${src}`;
    if (isKanji(last)) src = `${src}(?![${KANJI}0-9０-９])`;
  }
  // 「ユーザビリティ」の中の「ユーザ」を数えないよう、カタカナ語は語末を区切る
  if (isKatakana(last)) src = `${src}(?![ァ-ヶー])`;
  return src;
}

interface FormRef {
  classIndex: number;
  formIndex: number;
  form: string;
}

export function detectVariants(text: string, groups: VariantGroup[] = variantGroups): Issue[] {
  const issues: Issue[] = [];
  for (const group of groups) {
    const refs: FormRef[] = [];
    group.classes.forEach((forms, classIndex) => {
      forms.forEach((form, formIndex) => refs.push({ classIndex, formIndex, form }));
    });
    const byForm = new Map(refs.map((r) => [r.form, r]));
    // 「サーバー」より先に「サーバ」が当たらないよう、長い語形を先に試す
    const alternation = [...refs]
      .sort((a, b) => b.form.length - a.form.length)
      .map((r) => formSource(r.form, group))
      .join('|');
    const re = new RegExp(alternation, 'g');

    const hits: { ref: FormRef; start: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      const ref = byForm.get(m[0]);
      if (!ref) continue;
      const prev = m.index > 0 ? (text[m.index - 1] ?? '') : '';
      if (group.notAfter && prev !== '' && group.notAfter.includes(prev)) continue;
      hits.push({ ref, start: m.index });
    }

    const counts = new Map<number, number>();
    for (const h of hits) {
      counts.set(h.ref.classIndex, (counts.get(h.ref.classIndex) ?? 0) + 1);
    }
    if (counts.size < 2) continue;

    let majority = 0;
    let best = -1;
    for (let ci = 0; ci < group.classes.length; ci++) {
      const c = counts.get(ci) ?? 0;
      if (c > best) {
        best = c;
        majority = ci;
      }
    }
    const majorityForms = group.classes[majority] ?? [];
    const majorityLead = majorityForms[0] ?? '';

    for (const h of hits) {
      if (h.ref.classIndex === majority) continue;
      issues.push({
        ruleId: `variant/${group.id}`,
        category: 'variant',
        severity: 'warning',
        start: h.start,
        end: h.start + h.ref.form.length,
        text: h.ref.form,
        message: `表記ゆれ。「${h.ref.form}」と「${majorityLead}」が混在している。本文の基準は「${majorityLead}」`,
        suggestion: majorityForms[h.ref.formIndex] ?? majorityLead,
      });
    }
  }
  return issues;
}
