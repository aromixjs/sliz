import { InterpolationStatus, SlizTokenizer } from "@/src";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { TokenType } from "../src/compiler/tokenizer/token";
import { scanAt } from "./interpolation/setup";

const expression = fc.constantFrom(
  "a",
  "b",
  "x",
  "a + b",
  "x < y",
  "a > b",
  "f(1)",
  "a && b",
  "a || b",
  "a ? b : c",
  "'s'",
  "0",
);

const textChunk = fc.constantFrom("hello", "world", " plain text ", "42", "a+b", "true", "x.y");

const leaf = fc.oneof(
  fc.constantFrom("a", "b", "c", "x", "y", "1", "2", "3"),
  fc.constantFrom(" + ", " - ", " * ", " % ", " = ", " < ", " > ", " ; ", ", ", " "),
  fc.constantFrom(" => "),
);

const safeString = fc
  .array(fc.constantFrom("a", "b", "c", "1", "2", " "), { maxLength: 8 })
  .map((chars) => `"${chars.join("")}"`);
const safeTemplate = fc
  .array(fc.constantFrom("a", "b", "c", "1", "2", " "), { maxLength: 8 })
  .map((chars) => "`" + chars.join("") + "`");
const blockComment = fc
  .array(fc.constantFrom("a", "b", "c", " "), { maxLength: 6 })
  .map((chars) => `/* ${chars.join("")} */`);

function innerExpr(depth: number): fc.Arbitrary<string> {
  const atom = fc.oneof(leaf, safeString, safeTemplate, blockComment);
  if (depth <= 0) {
    return atom;
  }
  const deeper = innerExpr(depth - 1);
  const braceGroup = deeper.map((segment) => `{${segment}}`);
  const parenGroup = deeper.map((segment) => `(${segment})`);
  const bracketGroup = deeper.map((segment) => `[${segment}]`);
  const templInterp = deeper.map((segment) => "`a${" + segment + "}b`");
  return fc.oneof(atom, braceGroup, parenGroup, bracketGroup, templInterp, deeper);
}

function topExpr(depth: number): fc.Arbitrary<string> {
  const atom = fc.oneof(leaf, safeString, safeTemplate, blockComment);
  if (depth <= 0) {
    return atom;
  }
  const inner = innerExpr(depth - 1);
  const parenGroup = inner.map((segment) => `(${segment})`);
  const bracketGroup = inner.map((segment) => `[${segment}]`);
  const templInterp = inner.map((segment) => "`a${" + segment + "}b`");
  return fc.oneof(atom, parenGroup, bracketGroup, templInterp, inner);
}

const booleanAttribute = fc.constantFrom("disabled", "required", "checked");
const expressionAttribute = fc
  .tuple(fc.constantFrom("class", "id", "data-x", "href", "name"), expression)
  .map(([name, expr]) => `${name}={${expr}}`);
const attribute = fc.oneof(booleanAttribute, expressionAttribute);

describe("SlizTokenizer heavy fuzzing", () => {
  it("never throws and tiles arbitrary input (no swallowed chars, gaps are whitespace, values match slices)", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = new SlizTokenizer(source).tokenize();

        let cursor = 0;
        for (const token of tokens) {
          expect(token.start).toBeGreaterThanOrEqual(0);
          expect(token.end).toBeGreaterThanOrEqual(token.start);
          expect(token.end).toBeLessThanOrEqual(source.length);
          if (token.start > cursor) {
            const gap = source.slice(cursor, token.start);
            expect(gap.replace(/\s/g, "")).toBe("");
          }
          cursor = Math.max(cursor, token.end);
          if ("value" in token) {
            expect(token.value).toBe(source.slice(token.start, token.end));
          }
        }
        expect(cursor).toBe(source.length);
        expect(tokens[tokens.length - 1].type).toBe(TokenType.Eof);
      }),
      { numRuns: 10000 },
    );
  });

  it("closed interpolation tokens agree exactly with the resolver", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = new SlizTokenizer(source).tokenize();

        for (const token of tokens) {
          if (token.type === TokenType.JsInterpolation) {
            const outcome = scanAt(source, token.start);
            expect(outcome.status).toBe(InterpolationStatus.Closed);
            expect(outcome.end).toBe(token.end);
          }
        }
      }),
      { numRuns: 10000 },
    );
  });

  it("well-formed fuzzed expression attribute closes at exactly its wrapper }", () => {
    fc.assert(
      fc.property(topExpr(4), (expr) => {
        const source = `<div class={${expr}}>`;
        const tokens = new SlizTokenizer(source).tokenize();

        expect(tokens.map((token) => token.type)).toEqual([
          TokenType.OpeningTagStart,
          TokenType.TagName,
          TokenType.AttributeName,
          TokenType.Equals,
          TokenType.JsInterpolation,
          TokenType.NormalTagEnd,
          TokenType.Eof,
        ]);
        expect(tokens[4]).toEqual({
          type: TokenType.JsInterpolation,
          start: 11,
          end: 11 + expr.length + 2,
          value: `{${expr}}`,
        });
        expect(tokens[5].start).toBe(tokens[4].end);
      }),
      { numRuns: 3000 },
    );
  });

  it("well-formed fuzzed documents tokenize to exactly the expected shape", () => {
    fc.assert(
      fc.property(
        fc.array(attribute, { maxLength: 5 }),
        fc.array(textChunk, { maxLength: 5 }),
        (attributes, chunks) => {
          const innerText = chunks.join("");
          const source = `<div ${attributes.join(" ")}>${innerText}</div>`;
          const tokens = new SlizTokenizer(source).tokenize();

          const expectedTypes = [TokenType.OpeningTagStart, TokenType.TagName];
          for (const attribute of attributes) {
            expectedTypes.push(TokenType.AttributeName);
            if (attribute.includes("=")) {
              expectedTypes.push(TokenType.Equals, TokenType.JsInterpolation);
            }
          }
          expectedTypes.push(TokenType.NormalTagEnd);
          if (innerText.length > 0) {
            expectedTypes.push(TokenType.Text);
          }
          expectedTypes.push(
            TokenType.ClosingTagStart,
            TokenType.TagName,
            TokenType.NormalTagEnd,
            TokenType.Eof,
          );

          expect(tokens.map((token) => token.type)).toEqual(expectedTypes);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it("text over a tag-free alphabet tokenizes to exactly one Text token", () => {
    fc.assert(
      fc.property(fc.array(textChunk, { maxLength: 20 }), (chunks) => {
        const source = chunks.join("");
        fc.pre(source.length > 0);
        const tokens = new SlizTokenizer(source).tokenize();

        expect(tokens.map((token) => token.type)).toEqual([TokenType.Text, TokenType.Eof]);
        expect(tokens[0]).toEqual({
          type: TokenType.Text,
          start: 0,
          end: source.length,
          value: source,
        });
      }),
      { numRuns: 500 },
    );
  });

  it("every character code in tag positions keeps token invariants", () => {
    const shapes: Array<(character: string) => string> = [
      (character) => `<div a=${character}>`,
      (character) => `<div a="${character}">`,
      (character) => `<div a={${character}}>`,
      (character) => `<${character}>`,
      (character) => `{${character}}`,
      (character) => `${character}<div>`,
    ];

    const codes: number[] = [];
    for (let code = 0; code < 128; code++) {
      codes.push(code);
    }
    // em dash, line separator, and an astral-plane emoji: non-BMP text is exercised too
    codes.push(0x2014, 0x2028, 0x1f600);

    for (const code of codes) {
      const character = String.fromCharCode(code);
      for (const shape of shapes) {
        const source = shape(character);
        const tokens = new SlizTokenizer(source).tokenize();

        let cursor = 0;
        for (const token of tokens) {
          expect(token.start).toBeGreaterThanOrEqual(0);
          expect(token.end).toBeGreaterThanOrEqual(token.start);
          expect(token.end).toBeLessThanOrEqual(source.length);
          if (token.start > cursor) {
            const gap = source.slice(cursor, token.start);
            expect(gap.replace(/\s/g, "")).toBe("");
          }
          cursor = Math.max(cursor, token.end);
          if ("value" in token) {
            expect(token.value).toBe(source.slice(token.start, token.end));
          }
        }
        expect(cursor).toBe(source.length);
        expect(tokens[tokens.length - 1].type).toBe(TokenType.Eof);
      }
    }
  });

  describe("extreme stress (real inputs)", () => {
    it("1MB of plain text", () => {
      const source = "a".repeat(1_000_000);
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({
        type: TokenType.Text,
        start: 0,
        end: source.length,
        value: source,
      });
      expect(tokens[1].type).toBe(TokenType.Eof);
    });

    it("50k unterminated open braces", () => {
      const source = "{".repeat(50_000);
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens.map((token) => token.type)).toEqual([
        TokenType.UnterminatedJsInterpolation,
        TokenType.Eof,
      ]);
      expect(tokens[0].end).toBe(source.length);
    });

    it("20k attributes on one tag", () => {
      const source = `<div ${"a={x} ".repeat(20_000)}>`;
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens[tokens.length - 1].type).toBe(TokenType.Eof);
      expect(tokens.filter((token) => token.type === TokenType.AttributeName)).toHaveLength(20_000);
      expect(tokens.filter((token) => token.type === TokenType.JsInterpolation)).toHaveLength(
        20_000,
      );
    });

    it("3000 levels of nested braces in an attribute expression", () => {
      const body = "{".repeat(3000) + "x" + "}".repeat(3000);
      const source = `<div a={${body}}>`;
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens.map((token) => token.type)).toEqual([
        TokenType.OpeningTagStart,
        TokenType.TagName,
        TokenType.AttributeName,
        TokenType.Equals,
        TokenType.JsInterpolation,
        TokenType.NormalTagEnd,
        TokenType.Eof,
      ]);
      expect(tokens[4]).toEqual({
        type: TokenType.JsInterpolation,
        start: 7,
        end: 7 + body.length + 2,
        value: `{${body}}`,
      });
    });

    it("300 nested template interpolations in an attribute expression", () => {
      const body = "`a${".repeat(300) + "x" + "}b`".repeat(300);
      const source = `<div a={${body}}>`;
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens.map((token) => token.type)).toEqual([
        TokenType.OpeningTagStart,
        TokenType.TagName,
        TokenType.AttributeName,
        TokenType.Equals,
        TokenType.JsInterpolation,
        TokenType.NormalTagEnd,
        TokenType.Eof,
      ]);
      expect(tokens[4]).toEqual({
        type: TokenType.JsInterpolation,
        start: 7,
        end: 7 + body.length + 2,
        value: `{${body}}`,
      });
    });

    it("5000 nested divs", () => {
      const source = "<div>".repeat(5000) + "x" + "</div>".repeat(5000);
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens[tokens.length - 1].type).toBe(TokenType.Eof);
      expect(tokens).toHaveLength(5000 * 3 + 1 + 5000 * 3 + 1);
      expect(tokens.filter((token) => token.type === TokenType.TagName)).toHaveLength(10_000);
    });

    it("500k unterminated quoted attribute at eof", () => {
      const source = `<div a="${"x".repeat(500_000)}`;
      const tokens = new SlizTokenizer(source).tokenize();

      expect(tokens.map((token) => token.type)).toEqual([
        TokenType.OpeningTagStart,
        TokenType.TagName,
        TokenType.AttributeName,
        TokenType.Equals,
        TokenType.QuotedAttributeValue,
        TokenType.UnterminatedQuotedAttributeValue,
        TokenType.UnterminatedTag,
        TokenType.Eof,
      ]);
    });

    it("realistic multi-slot document", () => {
      const source =
        "<!DOCTYPE html>\n" +
        '<html lang="en">\n' +
        "<head>\n" +
        '  <meta charset="utf-8" />\n' +
        "  <title>{pageTitle}</title>\n" +
        "</head>\n" +
        "<body>\n" +
        '  <nav class="top-nav">\n' +
        '    <a href="/home">Home</a>\n' +
        '    <a href="/about">About</a>\n' +
        "  </nav>\n" +
        '  <main class="{container}">\n' +
        "    <h1>{greeting + name}</h1>\n" +
        "    <ul>\n" +
        '      {items.map((item) => `<li class="{row}">{item}</li>`)}\n' +
        "    </ul>\n" +
        '    <button .when="{ready}">{submitLabel}</button>\n' +
        "  </main>\n" +
        "</body>\n" +
        "</html>";
      const tokens = new SlizTokenizer(source).tokenize();

      let cursor = 0;
      for (const token of tokens) {
        expect(token.start).toBeGreaterThanOrEqual(0);
        expect(token.end).toBeGreaterThanOrEqual(token.start);
        expect(token.end).toBeLessThanOrEqual(source.length);
        if (token.start > cursor) {
          const gap = source.slice(cursor, token.start);
          expect(gap.replace(/\s/g, "")).toBe("");
        }
        cursor = Math.max(cursor, token.end);
        if ("value" in token) {
          expect(token.value).toBe(source.slice(token.start, token.end));
        }
      }
      expect(cursor).toBe(source.length);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.Eof);

      const interpolationSpans: Array<[number, number]> = [];
      for (const token of tokens) {
        if (token.type === TokenType.JsInterpolation) {
          interpolationSpans.push([token.start, token.end]);
        }
      }
      const needles = [
        "{pageTitle}",
        "{greeting + name}",
        "{submitLabel}",
        '{items.map((item) => `<li class="{row}">{item}</li>`)}',
      ];
      for (const needle of needles) {
        const index = source.indexOf(needle);
        expect(interpolationSpans).toContainEqual([index, index + needle.length]);
      }
    });
  });
});
