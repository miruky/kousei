// 配色テーマの状態。auto はOS設定(prefers-color-scheme)に追従し、
// 実際に塗るのは light か dark のどちらか。:root[data-theme] でCSSへ伝える。
// 解決と適用を分けてあるのは、描画前に走る head の小さなスクリプトと
// 同じ判定を共有して初回のちらつきを防ぐため。

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'kousei.theme.v1';

const CYCLE: readonly ThemeMode[] = ['auto', 'light', 'dark'];

/** 保存値を安全にモードへ寄せる。未知の値は auto とみなす。 */
export function parseMode(raw: string | null | undefined): ThemeMode {
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto';
}

/** トグルで回す次のモード。auto → light → dark → auto。 */
export function nextMode(mode: ThemeMode): ThemeMode {
  const i = CYCLE.indexOf(mode);
  return CYCLE[(i + 1) % CYCLE.length]!;
}

/** モードとOS設定から、実際に塗るテーマを決める。 */
export function resolveTheme(mode: ThemeMode, systemDark: boolean): ResolvedTheme {
  if (mode === 'auto') return systemDark ? 'dark' : 'light';
  return mode;
}

export function modeLabel(mode: ThemeMode): string {
  return { auto: '自動', light: 'ライト', dark: 'ダーク' }[mode];
}

/**
 * テーマの適用とOS設定の監視。DOMに触れるのでブラウザでのみ生成する。
 * auto のときは OS のライト/ダーク切り替えに追従して塗り直す。
 */
export class ThemeController {
  mode: ThemeMode;

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
    this.mode = parseMode(this.read());
    this.media.addEventListener('change', () => {
      if (this.mode === 'auto') this.apply();
    });
    this.apply();
  }

  /** 次のモードへ進めて保存・適用する。 */
  cycle(): ThemeMode {
    this.mode = nextMode(this.mode);
    this.write(this.mode);
    this.apply();
    return this.mode;
  }

  private apply(): void {
    document.documentElement.dataset.theme = resolveTheme(this.mode, this.media.matches);
  }

  private read(): string | null {
    try {
      return this.storage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }

  private write(mode: ThemeMode): void {
    try {
      this.storage.setItem(THEME_KEY, mode);
    } catch {
      // 保存できない環境では次回も auto から始める
    }
  }
}
