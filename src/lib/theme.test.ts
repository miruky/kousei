import { describe, expect, it } from 'vitest';
import { modeLabel, nextMode, parseMode, resolveTheme } from './theme';

describe('parseMode', () => {
  it('既知のモードはそのまま返す', () => {
    expect(parseMode('light')).toBe('light');
    expect(parseMode('dark')).toBe('dark');
    expect(parseMode('auto')).toBe('auto');
  });

  it('未知・欠落した値は auto に寄せる', () => {
    expect(parseMode('sepia')).toBe('auto');
    expect(parseMode(null)).toBe('auto');
    expect(parseMode(undefined)).toBe('auto');
    expect(parseMode('')).toBe('auto');
  });
});

describe('nextMode', () => {
  it('auto → light → dark → auto と一巡する', () => {
    expect(nextMode('auto')).toBe('light');
    expect(nextMode('light')).toBe('dark');
    expect(nextMode('dark')).toBe('auto');
  });
});

describe('resolveTheme', () => {
  it('明示モードはOS設定に関わらずそのまま', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('auto はOS設定に従う', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });
});

describe('modeLabel', () => {
  it('各モードに日本語ラベルがある', () => {
    expect(modeLabel('auto')).toBe('自動');
    expect(modeLabel('light')).toBe('ライト');
    expect(modeLabel('dark')).toBe('ダーク');
  });
});
