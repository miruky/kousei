import type { Issue } from './types';

/**
 * 修正案を持つ指摘のうち、互いに重ならないものだけを開始位置順に返す。
 * 重なった指摘を同時に置換すると位置がずれるため、先に始まるものを優先する。
 */
export function fixableIssues(issues: Issue[]): Issue[] {
  const sorted = issues
    .filter((i) => i.suggestion !== undefined && i.suggestion !== i.text)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Issue[] = [];
  let cursor = -1;
  for (const issue of sorted) {
    if (issue.start < cursor) continue;
    out.push(issue);
    cursor = issue.end;
  }
  return out;
}

/** 1件だけ適用する。指摘が古く本文と一致しない場合は何もしない */
export function applyFix(text: string, issue: Issue): string {
  if (issue.suggestion === undefined) return text;
  if (text.slice(issue.start, issue.end) !== issue.text) return text;
  return text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end);
}

/** 重ならない修正をまとめて適用する。後ろから置換して位置ずれを避ける */
export function applyAllFixes(text: string, issues: Issue[]): { text: string; applied: number } {
  const targets = fixableIssues(issues);
  let result = text;
  for (let k = targets.length - 1; k >= 0; k--) {
    const issue = targets[k];
    if (issue === undefined) continue;
    result = result.slice(0, issue.start) + (issue.suggestion ?? '') + result.slice(issue.end);
  }
  return { text: result, applied: targets.length };
}
