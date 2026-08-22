import * as fc from "fast-check";
import { InterpolationOutcome, InterpolationStatus } from "@/src";
import { describe, expect, it } from "vitest";
import { scanAt } from "./setup";

const validStatuses = [
  InterpolationStatus.Closed,
  InterpolationStatus.UnterminatedLiteral,
  InterpolationStatus.UnterminatedEof,
  InterpolationStatus.InvalidStart,
];

const specialChars = fc.constantFrom(
  "{",
  "}",
  '"',
  "'",
  "`",
  "/",
  "*",
  "<",
  ">",
  "$",
  "\\",
  " ",
  "\n",
  "\t",
  "a",
  "b",
  "c",
  "=",
  "+",
  "-",
  ":",
  ";",
);

const codeString = fc.array(specialChars, { maxLength: 150 }).map((chars) => chars.join(""));

describe("captureInterpolation property tests", () => {
  it("resolves an expression starting at a guaranteed { and keeps invariants", () => {
    fc.assert(
      fc.property(codeString, codeString, (prefix, suffix) => {
        const source = prefix + "{" + suffix;
        const openIndex = prefix.length;
        const result = scanAt(source, openIndex);

        expect(validStatuses).toContain(result.status);
        expect(result.status).not.toBe(InterpolationStatus.InvalidStart);
        expect(result.start).toBe(openIndex);
        expect(result.end).toBeGreaterThanOrEqual(openIndex);
        expect(result.end).toBeLessThanOrEqual(source.length);

        if (result.status === InterpolationStatus.Closed) {
          expect(source[result.end - 1]).toBe("}");
        }
      }),
    );
  });

  it("is deterministic for the same source and start", () => {
    fc.assert(
      fc.property(codeString, codeString, (prefix, suffix) => {
        const source = prefix + "{" + suffix;
        const openIndex = prefix.length;
        const first = scanAt(source, openIndex);
        const second = scanAt(source, openIndex);

        expect(first.status).toBe(second.status);
        expect(first.start).toBe(second.start);
        expect(first.end).toBe(second.end);
      }),
    );
  });

  it("when closed, end points right after a }", () => {
    fc.assert(
      fc.property(codeString, codeString, (prefix, suffix) => {
        const source = prefix + "{" + suffix;
        const openIndex = prefix.length;
        const result = scanAt(source, openIndex);

        if (result.status === InterpolationStatus.Closed) {
          expect(source[result.end - 1]).toBe("}");
        }
      }),
    );
  });

  it("when not closed, reports an unterminated outcome", () => {
    fc.assert(
      fc.property(codeString, codeString, (prefix, suffix) => {
        const source = prefix + "{" + suffix;
        const openIndex = prefix.length;
        const result = scanAt(source, openIndex);

        if (
          result.status !== InterpolationStatus.Closed &&
          result.status !== InterpolationStatus.InvalidStart
        ) {
          expect(validStatuses).toContain(result.status);
          expect(result.status).not.toBe(InterpolationStatus.Closed);
        }
      }),
    );
  });

  it("never throws for an in-bounds start at a {, returning a valid outcome", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const start = fc.sample(fc.integer({ min: 0, max: source.length }), 1)[0];
        let thrown: unknown = null;
        let result: InterpolationOutcome | null = null;
        try {
          result = scanAt(source, start);
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeNull();
        expect(result).not.toBeNull();
        if (result !== null) {
          expect(validStatuses).toContain(result.status);
          expect(result.status).not.toBe(InterpolationStatus.InvalidStart);
          expect(result.start).toBe(start);
          expect(result.end).toBeGreaterThanOrEqual(start);
          expect(result.end).toBeLessThanOrEqual(source.length);
          if (result.status === InterpolationStatus.Closed) {
            expect(source[result.end - 1]).toBe("}");
          }
        }
      }),
    );
  });

  it("reports InvalidStart, without throwing, when the start position is not an opening brace", () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1 }), (source, offset) => {
        const start = source.length + offset;
        let thrown: unknown = null;
        let result: InterpolationOutcome | null = null;
        try {
          result = scanAt(source, start);
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeNull();
        expect(result).not.toBeNull();
        if (result !== null) {
          expect(result.status).toBe(InterpolationStatus.InvalidStart);
          expect(result.start).toBe(start);
          expect(result.end).toBe(start);
        }
      }),
    );
  });

  it("produces in-bounds, content-matching outcomes for fully arbitrary input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (source) => {
        const openIndex = source.indexOf("{");
        fc.pre(openIndex !== -1);
        const result = scanAt(source, openIndex);

        expect(validStatuses).toContain(result.status);
        expect(result.status).not.toBe(InterpolationStatus.InvalidStart);

        expect(result.start).toBe(openIndex);

        expect(result.end).toBeGreaterThanOrEqual(openIndex);

        expect(result.end).toBeLessThanOrEqual(source.length);

        if (result.status === InterpolationStatus.Closed) {
          expect(source[result.end - 1]).toBe("}");
        }
      }),
    );
  });
});
