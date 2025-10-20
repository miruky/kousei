export type { Category, Issue, PatternRule, Severity } from './types';
export { categoryLabels, severityLabels } from './types';
export type { Stats } from './engine';
export { analyze, lint, patternRules, runPatternRule } from './engine';
export { applyAllFixes, applyFix, fixableIssues } from './fixes';
export { ThemeController, modeLabel, type ThemeMode } from './theme';
export { formatReport } from './report';
export { detectVariants, variantGroups } from './rules/variants';
export type { VariantGroup } from './rules/variants';
export { redundancyRules } from './rules/redundancy';
export { misuseRules } from './rules/misuse';
export type { Sentence } from './rules/style';
export {
  checkStyle,
  splitSentences,
  stylePatternRules,
  toFullWidthKana,
  toHalfWidthAlnum,
} from './rules/style';
