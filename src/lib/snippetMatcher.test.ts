import { describe, it, expect } from 'vitest';
import { normalizeCondition } from './conditionNormalizer';
import { SnippetMatcher } from './snippetMatcher';

describe('conditionNormalizer', () => {
  it('normalizes basic conditions', () => {
    expect(normalizeCondition("code != null")).toBe("code != null");
    expect(normalizeCondition("code!=null")).toBe("code != null");
    expect(normalizeCondition("code       !=\n  NULL")).toBe("code != null");
    expect(normalizeCondition("code != Null")).toBe("code != null");
    expect(normalizeCondition("MyVar != null")).toBe("MyVar != null");
  });

  it('handles unary operators', () => {
    expect(normalizeCondition("!flag")).toBe("!flag");
  });

  it('strips outer parentheses', () => {
    expect(normalizeCondition("(code != null)")).toBe("code != null");
    expect(normalizeCondition("((code != null))")).toBe("(code != null)");
    expect(normalizeCondition("(a != null && b > 0)")).toBe("a != null && b > 0");
  });

  it('normalizes complex operator spacing', () => {
    expect(normalizeCondition("x>=1")).toBe("x >= 1");
    expect(normalizeCondition("a&&b")).toBe("a && b");
  });
});

describe('SnippetMatcher', () => {
  const matcher = new SnippetMatcher({
    exact: {
      "code != null": "商品コードが入力された場合"
    },
    patterns: [
      { pattern: "{var} != null", template: "{var}がnullでない場合" },
      { pattern: "{var} == {val}", template: "{var}が{val}の場合" },
      { pattern: "!{var}", template: "{var}がfalseの場合" }
    ]
  });

  it('matches exact conditions with normalization', () => {
    expect(matcher.match("code != null").text).toBe("商品コードが入力された場合");
    expect(matcher.match("code!=null").text).toBe("商品コードが入力された場合");
    expect(matcher.match("code       !=\nNULL").text).toBe("商品コードが入力された場合");
  });

  it('matches pattern conditions', () => {
    const res = matcher.match("order != null");
    expect(res.matched).toBe(true);
    expect(res.text).toBe("orderがnullでない場合");
    expect(res.matchKind).toBe("pattern");
    expect(res.patternUsed).toBe("{var} != null");
  });

  it('matches multi-placeholder patterns', () => {
    const res = matcher.match("type == 1");
    expect(res.text).toBe("typeが1の場合");
    expect(res.matchKind).toBe("pattern");
  });

  it('matches unary patterns', () => {
    const res = matcher.match("!isActive");
    expect(res.text).toBe("isActiveがfalseの場合");
  });

  it('falls back for unmatched conditions', () => {
    const res = matcher.match("flag.equals(\"true\")");
    expect(res.matched).toBe(false);
    expect(res.text).toBe("flag.equals(\"true\")");
    expect(res.matchKind).toBe("fallback");
  });

  it('does not match compound conditions with simple patterns', () => {
    const res = matcher.match("code != null && name != null");
    expect(res.matched).toBe(false);
    expect(res.matchKind).toBe("fallback");
  });
});
