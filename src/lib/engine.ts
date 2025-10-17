import type { Category, Issue, PatternRule, Severity } from './types';
import { redundancyRules } from './rules/redundancy';
import { misuseRules } from './rules/misuse';
import { detectVariants } from './rules/variants';
import { checkStyle, splitSentences, stylePatternRules } from './rules/style';

export const patternRules: PatternRule[] = [
  ...redundancyRules,
  ...misuseRules,
  ...stylePatternRules,
];

export function runPatternRule(text: string, rule: PatternRule): Issue[] {
  const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`;
  const re = new RegExp(rule.pattern.source, flags);
  const out: Issue[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    out.push({
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
      message: typeof rule.message === 'function' ? rule.message(m) : rule.message,
      suggestion: rule.suggest?.(m),
    });
  }
  return out;
}

export function lint(text: string): Issue[] {
  if (text.length === 0) return [];
  return [
    ...patternRules.flatMap((rule) => runPatternRule(text, rule)),
    ...detectVariants(text),
    ...checkStyle(text),
  ].sort((a, b) => a.start - b.start || a.end - b.end || a.ruleId.localeCompare(b.ruleId));
}

export interface Stats {
  /** 空白・改行を除いた文字数 */
  chars: number;
  sentences: number;
  issueCount: number;
  byCategory: Record<Category, number>;
  bySeverity: Record<Severity, number>;
}

export function analyze(text: string): { issues: Issue[]; stats: Stats } {
  const issues = lint(text);
  const byCategory: Record<Category, number> = { variant: 0, redundancy: 0, misuse: 0, style: 0 };
  const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    byCategory[issue.category] += 1;
    bySeverity[issue.severity] += 1;
  }
  return {
    issues,
    stats: {
      chars: text.replace(/\s/g, '').length,
      sentences: splitSentences(text).length,
      issueCount: issues.length,
      byCategory,
      bySeverity,
    },
  };
}
