import type { PatternRule } from '../types';

// ら抜きは一段・カ変動詞だけに起きるため、誤検出を避けて語幹を列挙する。
// 仮定形「見れば」「出れば」は正しい形なので、後続に「ば」を含めない。
const RANUKI_STEMS = [
  '見',
  '食べ',
  '来',
  '出',
  '寝',
  '着',
  '起き',
  '降り',
  '借り',
  '信じ',
  '感じ',
  '覚え',
  '答え',
  '変え',
  '伝え',
  '捨て',
  '並べ',
  '比べ',
  '調べ',
  '受け',
  '続け',
  '始め',
  '決め',
  'やめ',
  '開け',
];

// さ入れは五段動詞の使役に余計な「さ」が入る現象。語幹は五段の未然形を列挙する。
// サ変(説明させて)や一段(見させて)は正しい形なので含めない。
const SAIRE_STEMS = [
  '読ま',
  '休ま',
  '飲ま',
  '歌わ',
  '行か',
  '帰ら',
  '働か',
  '書か',
  '作ら',
  '送ら',
  'やら',
  '取ら',
  '持た',
  '待た',
  '遊ば',
  '学ば',
  '住ま',
  '飛ば',
];

// い抜きも語幹列挙で誤検出を抑える。「捨ててる」のような て+てる は拾えないが、
// 「育てる」「慌てる」を巻き込むよりも取りこぼしを選ぶ。
const INUKI_TE_STEMS = [
  'し',
  '来',
  '見',
  '食べ',
  'やっ',
  '思っ',
  '言っ',
  '行っ',
  '持っ',
  '入っ',
  '待っ',
  '知っ',
  '使っ',
  '作っ',
  '残っ',
  '聞い',
  '書い',
];

const INUKI_DE_STEMS = ['読ん', '飲ん', '進ん', '住ん', '遊ん', '選ん', '並ん', '飛ん'];

const NINOMAI_FIX: Record<string, string> = {
  む: '二の舞を演じる',
  んだ: '二の舞を演じた',
  んで: '二の舞を演じて',
};

export const misuseRules: PatternRule[] = [
  {
    id: 'misuse/ra-nuki',
    category: 'misuse',
    severity: 'warning',
    pattern: new RegExp(
      `(${RANUKI_STEMS.join('|')})れ(る|ます|ません|ない|なかった|ました|た|そう)`,
      'g',
    ),
    message: 'ら抜き言葉。可能の意味では「〜られる」が書き言葉の標準',
    suggest: (m) => `${m[1] ?? ''}られ${m[2] ?? ''}`,
  },
  {
    id: 'misuse/sa-ire',
    category: 'misuse',
    severity: 'warning',
    pattern: new RegExp(`(${SAIRE_STEMS.join('|')})させ`, 'g'),
    message: 'さ入れ言葉。五段動詞の使役は「〜せる」で、「さ」は入らない',
    suggest: (m) => `${m[1] ?? ''}せ`,
  },
  {
    id: 'misuse/i-nuki-te',
    category: 'misuse',
    severity: 'info',
    pattern: new RegExp(`(${INUKI_TE_STEMS.join('|')})て(る|た|ます|ました|ない)`, 'g'),
    message: 'い抜き言葉。書き言葉では「〜ている」の形が標準',
    suggest: (m) => `${m[1] ?? ''}てい${m[2] ?? ''}`,
  },
  {
    id: 'misuse/i-nuki-de',
    category: 'misuse',
    severity: 'info',
    pattern: new RegExp(`(${INUKI_DE_STEMS.join('|')})で(る|た|ます|ました|ない)`, 'g'),
    message: 'い抜き言葉。書き言葉では「〜でいる」の形が標準',
    suggest: (m) => `${m[1] ?? ''}でい${m[2] ?? ''}`,
  },
  {
    id: 'misuse/mato-wo-eru',
    category: 'misuse',
    severity: 'info',
    pattern: /的を得(る|た|て|ない)/g,
    message: '本来は「的を射る」とされる(「的を得る」を許容する辞書もある)',
    suggest: (m) => `的を射${m[1] ?? 'る'}`,
  },
  {
    id: 'misuse/omei-bankai',
    category: 'misuse',
    severity: 'info',
    pattern: /汚名挽回/g,
    message: '「汚名返上」と「名誉挽回」の混用とされる',
    suggest: () => '汚名返上',
  },
  {
    id: 'misuse/oshimo-osarenu',
    category: 'misuse',
    severity: 'warning',
    pattern: /押しも押されぬ/g,
    message: '本来の形は「押しも押されもせぬ」',
    suggest: () => '押しも押されもせぬ',
  },
  {
    id: 'misuse/toritsuku-hima',
    category: 'misuse',
    severity: 'warning',
    pattern: /取り?(?:付|つ)く暇/g,
    message: '正しくは「取り付く島がない」',
    suggest: () => '取り付く島',
  },
  {
    id: 'misuse/setsujoku-harasu',
    category: 'misuse',
    severity: 'warning',
    pattern: /雪辱を晴ら/g,
    message: '「雪辱」自体が「恥をすすぐ」意。「雪辱を果たす」が定着した形',
    suggest: () => '雪辱を果た',
  },
  {
    id: 'misuse/ninomai-fumu',
    category: 'misuse',
    severity: 'info',
    pattern: /二の舞を踏(む|んだ|んで)/g,
    message: '「二の舞を演じる」と「二の足を踏む」の混用とされる',
    suggest: (m) => NINOMAI_FIX[m[1] ?? 'む'],
  },
  {
    id: 'misuse/shokushi',
    category: 'misuse',
    severity: 'info',
    pattern: /食指をそそ(られ|る)/g,
    message: '「食指が動く」と「(興味を)そそられる」の混用とされる',
    suggest: (m) => (m[1] === 'られ' ? '興味をそそられ' : undefined),
  },
  {
    id: 'misuse/nijuu-hitei',
    category: 'misuse',
    severity: 'info',
    pattern: /ない(?:ことは|わけでは|でも)ない/g,
    message: '二重否定。意図的な含みでなければ肯定形に直すと読みやすい',
  },
];
