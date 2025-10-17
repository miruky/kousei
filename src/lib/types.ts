export type Category = 'variant' | 'redundancy' | 'misuse' | 'style';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  ruleId: string;
  category: Category;
  severity: Severity;
  /** UTF-16コード単位の開始位置。String#sliceにそのまま渡せる */
  start: number;
  end: number;
  /** 指摘対象の本文。text.slice(start, end) と常に一致する */
  text: string;
  message: string;
  /** 機械的に置換しても意味が変わらない場合のみ提示する */
  suggestion?: string;
}

export interface PatternRule {
  id: string;
  category: Category;
  severity: Severity;
  pattern: RegExp;
  message: string | ((m: RegExpExecArray) => string);
  suggest?: (m: RegExpExecArray) => string | undefined;
}

export const categoryLabels: Record<Category, string> = {
  variant: '表記ゆれ',
  redundancy: '冗長表現',
  misuse: '誤用',
  style: '文体',
};

export const severityLabels: Record<Severity, string> = {
  error: 'エラー',
  warning: '警告',
  info: '参考',
};
