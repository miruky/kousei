import { describe, expect, it } from 'vitest';
import { detectVariants } from './rules/variants';

describe('表記ゆれの検出', () => {
  it('多数派でない表記だけを指摘し、多数派の形を提案する', () => {
    const text = 'サーバーを再起動した。その後サーバの状態を確認し、サーバーの監視に戻った。';
    const issues = detectVariants(text);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('サーバ');
    expect(issues[0]?.suggestion).toBe('サーバー');
    expect(text.slice(issues[0]?.start, issues[0]?.end)).toBe('サーバ');
  });

  it('1種類の表記しか出てこなければ指摘しない', () => {
    expect(detectVariants('サーバの設定をサーバ管理者が変更する。')).toHaveLength(0);
  });

  it('「ユーザビリティ」の中の「ユーザ」は数えない', () => {
    const text = 'ユーザビリティの調査でユーザーの声を集めた。';
    expect(detectVariants(text)).toHaveLength(0);
  });

  it('同数のときは先頭に定義した表記を採用する', () => {
    const issues = detectVariants('サーバは起動済み。サーバーも確認した。');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('サーバ');
  });

  it('熟語の中の漢字は数えない(上出来・出来事)', () => {
    const text = '上出来な出来事だったので、安心できる。';
    expect(detectVariants(text)).toHaveLength(0);
  });

  it('「できます」と「出来ます」の混在を検出する', () => {
    const issues = detectVariants('ここで申請できます。あちらでも申請出来ます。');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('出来');
    expect(issues[0]?.suggestion).toBe('でき');
  });

  it('「いたします」と「致します」の混在を検出し、「致し方ない」は無視する', () => {
    const issues = detectVariants('お願いいたします。後日確認を致します。致し方ない。');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('致しま');
  });

  it('動詞「及ぶ」の連用形は接続詞「及び」として数えない', () => {
    const text = '被害は3件に及び、対応および報告を行った。';
    expect(detectVariants(text)).toHaveLength(0);
  });

  it('送り仮名のゆれは対応する活用形へ置き換える', () => {
    const text = '点検を行う。記録を行ない、最後に報告を行う。';
    const issues = detectVariants(text);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('行ない');
    expect(issues[0]?.suggestion).toBe('行い');
  });

  it('「仕事」「大事」の「事」は数えず、単独の「事」と「こと」の混在は拾う', () => {
    const text = '大事な仕事の事を考える。やるべきことも多い。';
    const issues = detectVariants(text);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.text).toBe('事');
    expect(issues[0]?.suggestion).toBe('こと');
  });

  it('「まことに」「ひとこと」の中の「こと」は数えない', () => {
    expect(detectVariants('まことにありがたいお言葉、ひとこと添えます。')).toHaveLength(0);
  });
});
