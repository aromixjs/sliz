import { describe, expect, it } from "vitest";
import { scanAt, slice } from "./setup";
import { InterpolationOutcome, InterpolationStatus } from "@/src";

describe("closing brace (core behavior)", () => {
  it("closes an empty expression {}", () => {
    const source = "{}";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.start).toBe(0);
    expect(result.end).toBe(2);
    expect(slice(source, result)).toBe("{}");
  });

  it("closes a simple identifier expression {a}", () => {
    const source = "{a}";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{a}");
  });

  it("closes an arithmetic expression with surrounding whitespace", () => {
    const source = "{ a + b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a + b }");
  });

  it('closes the originally-provided example {userId+ /*"name*/}', () => {
    const source = '{userId+ /*"name*/}';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{userId+ /*"name*/}');
  });

  it("closes an arrow function expression { a => b }", () => {
    const source = "{ a => b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a => b }");
  });

  it("closes a comparison with spaces { a < b }", () => {
    const source = "{ a < b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a < b }");
  });

  it("closes a <= comparison { a <= b }", () => {
    const source = "{ a <= b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a <= b }");
  });

  it("stops scanning at the first } and ignores trailing text", () => {
    const source = "{a} b";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(3);
    expect(slice(source, result)).toBe("{a}");
  });
  it("respects a non-zero start offset", () => {
    const source = "x = {a}";
    const result = scanAt(source, 4);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.start).toBe(4);
    expect(result.end).toBe(7);
    expect(slice(source, result)).toBe("{a}");
  });
});

describe("string literals", () => {
  it("closes a double-quoted string expression", () => {
    const source = '{ "hello" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{ "hello" }');
  });

  it("closes a single-quoted string expression", () => {
    const source = "{ 'hello' }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ 'hello' }");
  });

  it("handles an escaped quote inside a double-quoted string", () => {
    const source = '{ "a\\"b" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{ "a\\"b" }');
  });

  it("handles an escaped quote inside a single-quoted string", () => {
    const source = "{ 'it\\'s' }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ 'it\\'s' }");
  });

  it("handles a doubled backslash before the closing quote", () => {
    const source = '{ "a\\\\" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{ "a\\\\" }');
  });
});

describe("braces inside string literals", () => {
  it("keeps a } that lives inside the string as part of the span", () => {
    const source = '{ "}" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{ "}" }');
  });

  it("emits UnterminatedLiteral when the closing quote is missing", () => {
    const source = '{ "abc }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedLiteral);
    expect(slice(source, result)).toBe('{ "abc }');
  });

  it("terminates a string at a literal newline (malformed input, graceful)", () => {
    const source = '{ "abc\ndef" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedLiteral);
    expect(slice(source, result).startsWith('{ "abc')).toBe(true);
  });
});

describe("template literals", () => {
  it("closes a plain template literal", () => {
    const source = "{ `hi` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `hi` }");
  });

  it("closes a template literal that spans a newline", () => {
    const source = "{ `a\nb` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a\nb` }");
  });

  it("keeps an escaped backtick inside a template literal", () => {
    const source = "{ `a\\`b` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a\\`b` }");
  });

  it("captures the whole template (including ${...}) as one span", () => {
    const source = "{ `a${b}c` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a${b}c` }");
  });

  it("resolves a nested interpolation object literal inside a template", () => {
    const source = "{ `x${ {y: 1} }z` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `x${ {y: 1} }z` }");
  });

  it("emits UnterminatedLiteral when the backtick is missing", () => {
    const source = "{ `abc }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedLiteral);
    expect(slice(source, result)).toBe("{ `abc }");
  });

  it("emits an unterminated outcome for an unclosed template interpolation", () => {
    const source = "{ `x${ y `";
    const result = scanAt(source, 0);
    expect(result.status).not.toBe(InterpolationStatus.Closed);
  });
});

describe("comments", () => {
  it("closes after a line comment", () => {
    const source = "{ a // note\n b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a // note\n b }");
  });

  it("closes after a block comment", () => {
    const source = "{ /* c */ }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ /* c */ }");
  });

  it("does not let a } inside a block comment terminate the expression", () => {
    const source = "{ /* } */ x }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ /* } */ x }");
  });

  it("emits UnterminatedEof when the block comment is never closed", () => {
    const source = "{ /* c }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedEof);
    expect(slice(source, result)).toBe("{ /* c }");
  });

  it("does not treat a line comment as extending past the newline", () => {
    const source = "{ a // note\n b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a // note\n b }");
  });
});

describe("nested braces", () => {
  it("closes a nested object literal { { a: 1 } }", () => {
    const source = "{ { a: 1 } }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(12);
    expect(slice(source, result)).toBe("{ { a: 1 } }");
  });

  it("closes deeply nested braces { { { x } } }", () => {
    const source = "{ { { x } } }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(13);
    expect(slice(source, result)).toBe("{ { { x } } }");
  });

  it("closes a nested group inside a template interpolation", () => {
    const source = "{ `a${ (b) }c` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a${ (b) }c` }");
  });
});

describe("regex / division disambiguation", () => {
  it("treats / as division (not regex) when not after a regex-triggering token", () => {
    const source = "{ a / b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a / b }");
  });

  it("re-lexes / as a regex after return and ignores } inside the regex body", () => {
    const source = "{ return /}/ }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ return /}/ }");
  });

  it("re-lexes / as a regex after = and ignores } inside the regex body", () => {
    const source = "{ x = /}/ }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ x = /}/ }");
  });

  it("treats a regex with flags and quantifiers as a single span", () => {
    const source = "{ return /[a-z]+/gim }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ return /[a-z]+/gim }");
  });

  it("emits UnterminatedLiteral for an unclosed regex after =", () => {
    const source = "{ x = /abc }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedLiteral);
    expect(slice(source, result)).toBe("{ x = /abc");
  });

  it("emits UnterminatedLiteral for an unclosed regex after return", () => {
    const source = "{ return /abc }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedLiteral);
    expect(slice(source, result)).toBe("{ return /abc");
  });
});

describe("template interpolation depth", () => {
  it("closes a template with multiple interpolations", () => {
    const source = "{ `a${b}c${d}e` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a${b}c${d}e` }");
  });

  it("closes a nested template literal inside an interpolation", () => {
    const source = "{ `outer${ `inner${x}` }` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `outer${ `inner${x}` }` }");
  });

  it("keeps a } inside a plain template literal (no ${) as literal content", () => {
    const source = "{ `a}b` }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ `a}b` }");
  });

  it("keeps a } inside a double-quoted string as literal content", () => {
    const source = '{ "a}b" }';
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{ "a}b" }');
  });
});

describe("deep nesting / scale", () => {
  it("closes 200 levels of nested braces", () => {
    const source = "{".repeat(200) + "x" + "}".repeat(200);
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(source.length);
    expect(slice(source, result)).toBe(source);
  });

  it("closes 200 levels of nested template interpolations", () => {
    const prefix = "`a${".repeat(200);
    const suffix = "}b`".repeat(200);
    const source = "{" + prefix + "x" + suffix + "}";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(source.length);
    expect(slice(source, result)).toBe(source);
  });
});

describe("malformed input / graceful degradation", () => {
  it("reports UnterminatedEof when no } is present", () => {
    const source = "{ a + b";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.UnterminatedEof);
    expect(slice(source, result)).toBe("{ a + b");
  });
});

describe("whitespace handling", () => {
  it("closes an empty expression { }", () => {
    const source = "{ }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ }");
  });

  it("closes a whitespace-only expression {   }", () => {
    const source = "{   }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{   }");
  });

  it("stops at the first } for adjacent expressions {a}{b}", () => {
    const source = "{a}{b}";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(3);
    expect(slice(source, result)).toBe("{a}");
  });

  it("keeps internal whitespace in the span { a - -b }", () => {
    const source = "{ a - -b }";
    const result = scanAt(source, 0);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ a - -b }");
  });
});

describe("guards", () => {
  it("reports InvalidStart for a negative start without throwing", () => {
    const source = "{a}";
    let thrown: unknown;
    let result: InterpolationOutcome | undefined;
    try {
      result = scanAt(source, -2);
      console.log(result);
    } catch (error) {
      console.log(error);

      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(result?.status).toBe(InterpolationStatus.InvalidStart);
  });

  it("reports InvalidStart for a NaN start without throwing", () => {
    const source = "{a}";
    let thrown: unknown;
    let result: InterpolationOutcome | undefined;
    try {
      result = scanAt(source, Number.NaN);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(result?.status).toBe(InterpolationStatus.InvalidStart);
  });

  it("reports InvalidStart for an out-of-range positive start without throwing", () => {
    const source = "{a}";
    let thrown: unknown;
    let result: InterpolationOutcome | undefined;
    try {
      result = scanAt(source, 99);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(result?.status).toBe(InterpolationStatus.InvalidStart);
  });

  it("reports InvalidStart when not positioned at {", () => {
    const source = "userId+ /*name*/}";
    let thrown: unknown;
    let result: InterpolationOutcome | undefined;
    try {
      result = scanAt(source, 0);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(result?.status).toBe(InterpolationStatus.InvalidStart);
  });
});

describe("realistic multi-slot source", () => {
  const source =
    "<script server>\n" +
    '  const name = "world";\n' +
    "  const items = [1, 2, 3];\n" +
    "  const ready = true;\n" +
    '  const kind = "primary";\n' +
    "</script>\n\n" +
    '<div class="card-{kind}">\n' +
    '  <main class="{container}">\n' +
    "    <h1>{greeting + name}</h1>\n" +
    "    <ul>\n" +
    '      {items.map((item) => `<li class="{row}">{item}</li>`)}\n' +
    "    </ul>\n" +
    '    <button .when="{ready}">{submitLabel}</button>\n' +
    "  </main>\n" +
    "</div>";

  it("resolves the {kind} attribute expression slot", () => {
    const result = scanAt(source, source.indexOf("{kind}"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{kind}");
  });

  it("resolves the {container} class expression slot", () => {
    const result = scanAt(source, source.indexOf("{container}"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{container}");
  });

  it("resolves the {greeting + name} interpolation slot", () => {
    const result = scanAt(source, source.indexOf("{greeting + name}"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{greeting + name}");
  });

  it("resolves the {ready} directive expression slot", () => {
    const result = scanAt(source, source.indexOf("{ready}"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{ready}");
  });

  it("resolves the {submitLabel} slot", () => {
    const result = scanAt(source, source.indexOf("{submitLabel}"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe("{submitLabel}");
  });

  it("resolves the .map expression with an embedded template literal", () => {
    const result = scanAt(source, source.indexOf("{items.map"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, result)).toBe('{items.map((item) => `<li class="{row}">{item}</li>`)}');
  });

  it("keeps inner {row}/{item} inside the template literal (single span)", () => {
    const result = scanAt(source, source.indexOf("{items.map"));
    expect(result.status).toBe(InterpolationStatus.Closed);
    const text = slice(source, result);
    expect(text).toContain("{row}");
    expect(text).toContain("{item}");
  });

  it("stops at the first } for an expression embedded in an attribute (card-{kind})", () => {
    const kindIndex = source.indexOf("{kind}");
    const result = scanAt(source, kindIndex);
    expect(result.status).toBe(InterpolationStatus.Closed);
    expect(result.end).toBe(kindIndex + 6);
  });

  it("resolves independently across repeated calls on the same slot", () => {
    scanAt(source, source.indexOf("{kind}"));
    const afterContainer = scanAt(source, source.indexOf("{container}"));
    expect(afterContainer.status).toBe(InterpolationStatus.Closed);
    expect(slice(source, afterContainer)).toBe("{container}");
  });

  it("scans every { in the source without throwing and degrades gracefully", () => {
    let searchFrom = 0;
    let position = source.indexOf("{", searchFrom);
    while (position !== -1) {
      const result = scanAt(source, position);
      const isGraceful =
        result.status === InterpolationStatus.Closed ||
        result.status === InterpolationStatus.UnterminatedLiteral ||
        result.status === InterpolationStatus.UnterminatedEof ||
        result.status === InterpolationStatus.InvalidStart;
      expect(isGraceful).toBe(true);
      searchFrom = position + 1;
      position = source.indexOf("{", searchFrom);
    }
  });
});
