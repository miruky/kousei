import './style.css';
import {
  analyze,
  applyAllFixes,
  applyFix,
  categoryLabels,
  fixableIssues,
  modeLabel,
  severityLabels,
  ThemeController,
} from './lib';
import type { Category, Issue, Stats, ThemeMode } from './lib';

const themeIcon = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const THEME_ICON: Record<ThemeMode, string> = {
  auto: themeIcon(
    '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  ),
  light: themeIcon(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>',
  ),
  dark: themeIcon('<path d="M20.5 14.6A8 8 0 0 1 9.4 3.5 7 7 0 1 0 20.5 14.6z"/>'),
};

const STORE_KEY = 'kousei:text';

const SAMPLE_TEXT = [
  '新しいサーバーの構成について説明します。サーバの設定は、管理画面から変更することができます。',
  'まず最初に、ユーザー登録の流れを確認します。承認済みのユーザがログインすると、ダッシュボードを見れるようになります。',
  'この挙動に違和感を感じる人もいるかもしれないが、現行の仕様は的を得た設計である。',
  '詳細は、担当の者が、資料を、まとめて、追って、説明させていただきますので、後で後悔しないよう、当日までに目を通しておいてください。',
  'なお、バージョン２．０の変更点は、まだ未確定です。',
].join('\n');

const LOGO_SVG = `<svg viewBox="0 0 64 64" role="img" aria-label="kouseiのロゴ" class="logo">
  <g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="7" width="46" height="50" rx="7"/>
    <path d="M19 21h26"/><path d="M19 32h14"/><path d="M19 43h26"/>
  </g>
  <g fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round">
    <ellipse cx="36" cy="32" rx="13" ry="8"/><path d="M47 38l8 9"/>
  </g>
</svg>`;

const EMPTY_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true" class="empty-mark">
  <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="7" width="46" height="50" rx="7"/>
    <path d="M22 33l7 7 14-16"/>
  </g>
</svg>`;

const FILTERS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'variant', label: categoryLabels.variant },
  { key: 'redundancy', label: categoryLabels.redundancy },
  { key: 'misuse', label: categoryLabels.misuse },
  { key: 'style', label: categoryLabels.style },
];

function mustFind<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`${selector} が見つからない`);
  return el;
}

const app = mustFind<HTMLDivElement>('#app');

app.innerHTML = `
  <header class="site-header">
    <div class="brand">
      ${LOGO_SVG}
      <div>
        <span class="kicker">日本語校正</span>
        <h1>kousei</h1>
        <p class="tagline">表記ゆれ・冗長表現・誤用・文体の乱れを、ブラウザの中だけで検出する</p>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" id="btn-theme" class="icon-btn" aria-label="配色テーマ"></button>
      <a class="repo-link" href="https://github.com/miruky/kousei" rel="noopener">GitHub</a>
    </div>
  </header>
  <main class="layout">
    <section class="pane editor-pane" aria-label="本文の編集">
      <div class="toolbar">
        <button type="button" id="btn-sample">サンプル文</button>
        <button type="button" id="btn-clear">クリア</button>
        <span class="toolbar-spacer"></span>
        <button type="button" id="btn-fix-all" class="primary"></button>
        <button type="button" id="btn-copy">コピー</button>
      </div>
      <div class="editor">
        <div class="backdrop" aria-hidden="true"><div class="hl-content"></div></div>
        <textarea id="input" spellcheck="false"
          aria-label="校正する文章"
          placeholder="ここに文章を貼り付けると、その場で検査が始まります。"></textarea>
      </div>
      <div class="statusbar" aria-live="polite" id="statusbar"></div>
    </section>
    <aside class="pane issues-pane" aria-label="検査結果">
      <div class="filters" role="group" aria-label="カテゴリで絞り込み" id="filters"></div>
      <ul class="issues" id="issue-list"></ul>
      <div class="empty" id="empty" hidden>
        ${EMPTY_SVG}
        <p id="empty-message"></p>
      </div>
    </aside>
  </main>
  <footer class="site-footer">
    <p>文章はどこにも送信されず、このページの中だけで処理される。MIT License</p>
  </footer>
`;

const textarea = mustFind<HTMLTextAreaElement>('#input');
const hlContent = mustFind<HTMLDivElement>('.hl-content');
const backdrop = mustFind<HTMLDivElement>('.backdrop');
const issueList = mustFind<HTMLUListElement>('#issue-list');
const emptyBox = mustFind<HTMLDivElement>('#empty');
const emptyMessage = mustFind<HTMLParagraphElement>('#empty-message');
const statusbar = mustFind<HTMLDivElement>('#statusbar');
const filtersBox = mustFind<HTMLDivElement>('#filters');
const btnSample = mustFind<HTMLButtonElement>('#btn-sample');
const btnClear = mustFind<HTMLButtonElement>('#btn-clear');
const btnFixAll = mustFind<HTMLButtonElement>('#btn-fix-all');
const btnCopy = mustFind<HTMLButtonElement>('#btn-copy');
const btnTheme = mustFind<HTMLButtonElement>('#btn-theme');

const theme = new ThemeController();
function syncThemeButton(mode: ThemeMode): void {
  btnTheme.innerHTML = THEME_ICON[mode];
  btnTheme.setAttribute('aria-label', `配色テーマ: ${modeLabel(mode)}(クリックで切り替え)`);
}
syncThemeButton(theme.mode);
btnTheme.addEventListener('click', () => syncThemeButton(theme.cycle()));

let issues: Issue[] = [];
let filter: Category | 'all' = 'all';
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function visibleIssues(): Issue[] {
  return filter === 'all' ? issues : issues.filter((i) => i.category === filter);
}

function renderHighlights(text: string, visible: Issue[]): void {
  let html = '';
  let pos = 0;
  visible.forEach((issue, idx) => {
    if (issue.start < pos) return; // 重なった指摘は先のものだけを塗る
    html += escapeHtml(text.slice(pos, issue.start));
    html += `<mark class="hl hl-${issue.category}" data-idx="${idx}">${escapeHtml(
      text.slice(issue.start, issue.end),
    )}</mark>`;
    pos = issue.end;
  });
  html += escapeHtml(text.slice(pos));
  hlContent.innerHTML = `${html}\n`;
}

function renderFilters(): void {
  filtersBox.textContent = '';
  for (const f of FILTERS) {
    const count =
      f.key === 'all' ? issues.length : issues.filter((i) => i.category === f.key).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip chip-${f.key}${filter === f.key ? ' active' : ''}`;
    chip.setAttribute('aria-pressed', String(filter === f.key));
    chip.textContent = `${f.label} ${count}`;
    chip.addEventListener('click', () => {
      filter = f.key;
      render();
    });
    filtersBox.append(chip);
  }
}

function jumpTo(issue: Issue, idx: number): void {
  textarea.focus();
  textarea.setSelectionRange(issue.start, issue.end);
  const mark = hlContent.querySelector<HTMLElement>(`mark[data-idx="${idx}"]`);
  if (mark) {
    textarea.scrollTop = Math.max(0, mark.offsetTop - textarea.clientHeight / 3);
    backdrop.scrollTop = textarea.scrollTop;
    mark.classList.remove('flash');
    requestAnimationFrame(() => mark.classList.add('flash'));
  }
}

function renderIssues(visible: Issue[]): void {
  issueList.textContent = '';
  if (visible.length === 0) {
    emptyBox.hidden = false;
    emptyMessage.textContent =
      textarea.value.trim() === ''
        ? '本文を入力すると、検査結果がここに並ぶ。'
        : filter === 'all'
          ? 'この文章への指摘はない。'
          : 'このカテゴリの指摘はない。';
    return;
  }
  emptyBox.hidden = true;
  visible.forEach((issue, idx) => {
    const li = document.createElement('li');
    li.className = `issue issue-${issue.category}`;
    li.style.setProperty('--d', `${Math.min(idx, 8) * 40}ms`);

    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'issue-body';
    body.setAttribute('aria-label', `本文の該当箇所へ移動: ${truncate(issue.text, 24)}`);

    const head = document.createElement('span');
    head.className = 'issue-head';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = categoryLabels[issue.category];
    const sev = document.createElement('span');
    sev.className = `sev sev-${issue.severity}`;
    sev.textContent = severityLabels[issue.severity];
    const excerpt = document.createElement('span');
    excerpt.className = 'excerpt';
    excerpt.textContent = `「${truncate(issue.text, 24)}」`;
    head.append(badge, sev, excerpt);

    const msg = document.createElement('span');
    msg.className = 'message';
    msg.textContent = issue.message;

    body.append(head, msg);
    body.addEventListener('click', () => jumpTo(issue, idx));
    li.append(body);

    if (issue.suggestion !== undefined && issue.suggestion !== issue.text) {
      const fix = document.createElement('button');
      fix.type = 'button';
      fix.className = 'fix-btn';
      fix.textContent =
        issue.suggestion === '' ? '削除する' : `「${truncate(issue.suggestion, 20)}」に修正`;
      fix.addEventListener('click', () => {
        textarea.value = applyFix(textarea.value, issue);
        persist();
        render();
      });
      li.append(fix);
    }
    issueList.append(li);
  });
}

function renderStatus(stats: Stats): void {
  const sev = stats.bySeverity;
  statusbar.innerHTML = [
    `<span>${stats.chars}字</span>`,
    `<span>${stats.sentences}文</span>`,
    `<span class="sev-count"><span class="dot dot-error"></span>${sev.error}</span>`,
    `<span class="sev-count"><span class="dot dot-warning"></span>${sev.warning}</span>`,
    `<span class="sev-count"><span class="dot dot-info"></span>${sev.info}</span>`,
  ].join('');
}

function render(): void {
  const { issues: all, stats } = analyze(textarea.value);
  issues = all;
  const visible = visibleIssues();
  renderHighlights(textarea.value, visible);
  renderFilters();
  renderIssues(visible);
  renderStatus(stats);
  const fixCount = fixableIssues(issues).length;
  btnFixAll.textContent = `まとめて修正 ${fixCount}`;
  btnFixAll.disabled = fixCount === 0;
}

function persist(): void {
  try {
    localStorage.setItem(STORE_KEY, textarea.value);
  } catch {
    // プライベートモードなどで保存できなくても動作は続ける
  }
}

textarea.addEventListener('input', () => {
  persist();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(render, 200);
});

textarea.addEventListener('scroll', () => {
  backdrop.scrollTop = textarea.scrollTop;
  backdrop.scrollLeft = textarea.scrollLeft;
});

btnSample.addEventListener('click', () => {
  textarea.value = SAMPLE_TEXT;
  persist();
  render();
});

btnClear.addEventListener('click', () => {
  textarea.value = '';
  persist();
  render();
  textarea.focus();
});

btnFixAll.addEventListener('click', () => {
  const { text, applied } = applyAllFixes(textarea.value, issues);
  if (applied > 0) {
    textarea.value = text;
    persist();
    render();
  }
});

btnCopy.addEventListener('click', () => {
  void navigator.clipboard.writeText(textarea.value).then(() => {
    btnCopy.textContent = 'コピーした';
    setTimeout(() => {
      btnCopy.textContent = 'コピー';
    }, 1500);
  });
});

let stored: string | null = null;
try {
  stored = localStorage.getItem(STORE_KEY);
} catch {
  stored = null;
}
textarea.value = stored ?? SAMPLE_TEXT;
render();
