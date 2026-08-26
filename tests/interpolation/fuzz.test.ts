import { InterpolationOutcome, InterpolationStatus } from "@/src";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scanAt, slice } from "./setup";

const validStatuses = [
  InterpolationStatus.Closed,
  InterpolationStatus.UnterminatedLiteral,
  InterpolationStatus.UnterminatedEof,
];

const allStatuses = [...validStatuses, InterpolationStatus.InvalidStart];

describe("JsInterpolationResolver heavy fuzzing", () => {
  // Leaf tokens that never contain a structural }.
  const leaf = fc.oneof(
    fc.constantFrom("a", "b", "c", "x", "y", "1", "2", "3"),
    fc.constantFrom(" + ", " - ", " * ", " % ", " = ", " < ", " > ", " ; ", ", ", " "),
    fc.constantFrom(" => "),
  );

  // Strings/templates/comments with a }-free, lexer-safe alphabet.
  const safeString = fc
    .array(fc.constantFrom("a", "b", "c", "1", "2", " "), { maxLength: 8 })
    .map((chars) => `"${chars.join("")}"`);
  const safeTemplate = fc
    .array(fc.constantFrom("a", "b", "c", "1", "2", " "), { maxLength: 8 })
    .map((chars) => "`" + chars.join("") + "`");
  const blockComment = fc
    .array(fc.constantFrom("a", "b", "c", " "), { maxLength: 6 })
    .map((chars) => `/* ${chars.join("")} */`);

  // innerExpr may include standalone brace groups; they are always nested
  // inside ( ) [ ] or ${ } so they never become the top-level closer.
  function innerExpr(depth: number): fc.Arbitrary<string> {
    const atom = fc.oneof(leaf, safeString, safeTemplate, blockComment);
    if (depth <= 0) return atom;
    const deeper = innerExpr(depth - 1);
    const braceGroup = deeper.map((segment) => `{${segment}}`);
    const parenGroup = deeper.map((segment) => `(${segment})`);
    const bracketGroup = deeper.map((segment) => `[${segment}]`);
    const templInterp = deeper.map((segment) => "`a${" + segment + "}b`");
    return fc.oneof(atom, braceGroup, parenGroup, bracketGroup, templInterp, deeper);
  }

  // topExpr must not start with a standalone brace group, so the only
  // brace-frame-level } is the wrapper we append.
  function topExpr(depth: number): fc.Arbitrary<string> {
    const atom = fc.oneof(leaf, safeString, safeTemplate, blockComment);
    if (depth <= 0) return atom;
    const inner = innerExpr(depth - 1);
    const parenGroup = inner.map((segment) => `(${segment})`);
    const bracketGroup = inner.map((segment) => `[${segment}]`);
    const templInterp = inner.map((segment) => "`a${" + segment + "}b`");
    return fc.oneof(atom, parenGroup, bracketGroup, templInterp, inner);
  }

  it("closes a well-formed fuzzed expression at exactly its wrapper }", () => {
    fc.assert(
      fc.property(fc.string(), topExpr(4), fc.string(), (prefix, expr, suffix) => {
        fc.pre(!expr.startsWith("{"));
        const source = prefix + "{" + expr + "}" + suffix;
        const open = prefix.length;
        const result = scanAt(source, open);
        expect(result.status).toBe(InterpolationStatus.Closed);
        expect(result.start).toBe(open);
        expect(result.end).toBe(open + expr.length + 2);
        expect(slice(source, result)).toBe("{" + expr + "}");
      }),
    );
  });

  it("never throws and keeps invariants on fully arbitrary input", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const open = source.indexOf("{");
        fc.pre(open !== -1);
        const result = scanAt(source, open);
        expect(validStatuses).toContain(result.status);
        expect(result.start).toBe(open);
        expect(result.end).toBeGreaterThanOrEqual(open);
        expect(result.end).toBeLessThanOrEqual(source.length);
        expect(slice(source, result)).toBe(source.slice(open, result.end));
        if (result.status === InterpolationStatus.Closed) {
          expect(source[result.end - 1]).toBe("}");
        }
      }),
    );
  });

  it("re-resolving a closed span is itself closed and self-contained", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const open = source.indexOf("{");
        fc.pre(open !== -1);
        const result = scanAt(source, open);
        if (result.status === InterpolationStatus.Closed) {
          const text = slice(source, result);
          const sub = scanAt(text, 0);
          expect(sub.status).toBe(InterpolationStatus.Closed);
          expect(sub.end).toBe(text.length);
        }
      }),
    );
  });

  it("never throws for any start index (in-range or out-of-range)", () => {
    fc.assert(
      fc.property(fc.string(), fc.integer(), (source, offset) => {
        const start = source.length + offset;
        let thrown: unknown = null;
        let result: InterpolationOutcome | undefined;
        try {
          result = scanAt(source, start);
        } catch (error) {
          thrown = error;
        }
        expect(thrown).toBeNull();
        expect(result).toBeDefined();
        expect(allStatuses).toContain(result?.status);
      }),
      { numRuns: 2000 },
    );
  });

  it("resolves every { in a fuzzed document with a shared instance, no throw", () => {
    const slot = topExpr(3).map((expr) => "{" + expr + "}");
    fc.assert(
      fc.property(
        fc.array(slot, { maxLength: 12 }),
        fc.array(fc.string(), { maxLength: 13 }),
        (slots, between) => {
          let source = "";
          for (let index = 0; index < slots.length; index++) {
            source += (between[index] ?? "") + slots[index];
          }
          source += between[slots.length] ?? "";
          let from = 0;
          let position = source.indexOf("{", from);
          while (position !== -1) {
            const result = scanAt(source, position);
            expect(validStatuses).toContain(result.status);
            expect(result.start).toBe(position);
            if (position < source.length) {
              expect(result.end).toBeGreaterThanOrEqual(position);
              expect(result.end).toBeLessThanOrEqual(source.length);
              expect(slice(source, result)).toBe(source.slice(position, result.end));
            }
            if (result.status === InterpolationStatus.Closed) {
              expect(source[result.end - 1]).toBe("}");
            }
            from = position + 1;
            position = source.indexOf("{", from);
          }
        },
      ),
    );
  });

  describe("regex ground truth", () => {
    // A leading * after the opening / forms a block comment (/*); an empty body
    // forms a line comment (//). Avoid both so the lexer keeps it a regex.
    const regexFirst = fc.constantFrom("a", "b", "c", "1", "2", ".", "+", "?", "(");
    const regexRest = fc.constantFrom("a", "b", "c", "1", "2", ".", "+", "*", "?", "(", ")");
    const regexBody = fc
      .tuple(regexFirst, fc.array(regexRest, { maxLength: 7 }))
      .map(([first, rest]) => first + rest.join(""));
    const regexFlags = fc.array(fc.constantFrom("g", "i", "m", "s"), {
      maxLength: 3,
    });
    const regexExpr = fc
      .tuple(regexBody, regexFlags)
      .map(([body, flags]) => `return /${body}/${flags.join("")}`);

    it("closes a fuzzed regex literal at its wrapper }", () => {
      fc.assert(
        fc.property(fc.string(), regexExpr, fc.string(), (prefix, expr, suffix) => {
          const source = prefix + "{" + expr + "}" + suffix;
          const open = prefix.length;
          const result = scanAt(source, open);
          expect(result.status).toBe(InterpolationStatus.Closed);
          expect(result.end).toBe(open + expr.length + 2);
          expect(slice(source, result)).toBe("{" + expr + "}");
        }),
        { numRuns: 2000 },
      );
    });
  });

  describe("division ground truth", () => {
    const divExpr = fc
      .tuple(
        fc.constantFrom("a", "b", "x", "y", "1", "2"),
        fc.constantFrom("a", "b", "x", "y", "1", "2"),
      )
      .map(([left, right]) => `${left} / ${right}`);

    it("treats fuzzed a / b as division and closes at its wrapper }", () => {
      fc.assert(
        fc.property(fc.string(), divExpr, fc.string(), (prefix, expr, suffix) => {
          const source = prefix + "{" + expr + "}" + suffix;
          const open = prefix.length;
          const result = scanAt(source, open);
          expect(result.status).toBe(InterpolationStatus.Closed);
          expect(result.end).toBe(open + expr.length + 2);
          expect(slice(source, result)).toBe("{" + expr + "}");
        }),
      );
    });
  });
});
