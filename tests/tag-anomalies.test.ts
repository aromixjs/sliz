import { SlizTokenizer } from "@/src";
import { describe, expect, it } from "vitest";
import { TokenType } from "../src/compiler/tokenizer/token";

describe("tag attribute anomalies", () => {
  it("expression with > comparison in attribute", () => {
    const tokens = new SlizTokenizer("<div class={a > b}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("expression with < comparison in attribute", () => {
    const tokens = new SlizTokenizer("<div class={a < b}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("expression with || in attribute", () => {
    const tokens = new SlizTokenizer("<div class={a || b}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("expression with && in attribute", () => {
    const tokens = new SlizTokenizer("<div class={a && b}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("multiple expressions in attributes", () => {
    const tokens = new SlizTokenizer("<div class={a} id={b}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("unterminated expression in attribute", () => {
    const tokens = new SlizTokenizer("<div class={unclosed>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.UnterminatedJsInterpolation,
      TokenType.UnterminatedTag,
      TokenType.Eof,
    ]);
  });

  it("unterminated expression EOF", () => {
    const tokens = new SlizTokenizer("<div class={unclosed").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.UnterminatedJsInterpolation,
      TokenType.UnterminatedTag,
      TokenType.Eof,
    ]);
  });

  it("} in unquoted attribute value", () => {
    const tokens = new SlizTokenizer("<div class=test}>").tokenize();

    expect(tokens[0]).toEqual({ type: TokenType.OpeningTagStart, start: 0, end: 1 });
    expect(tokens[1]).toEqual({ type: TokenType.TagName, start: 1, end: 4, value: "div" });
    expect(tokens[2]).toEqual({ type: TokenType.AttributeName, start: 5, end: 10, value: "class" });
    expect(tokens[3]).toEqual({ type: TokenType.Equals, start: 10, end: 11 });
    expect(tokens[4]).toEqual({
      type: TokenType.UnQuotedAttributeValue,
      start: 11,
      end: 16,
      value: "test}",
    });
    expect(tokens[5]).toEqual({ type: TokenType.NormalTagEnd, start: 16, end: 17 });
    expect(tokens[6].type).toBe(TokenType.Eof);
  });

  it("} in attribute value then expression", () => {
    const tokens = new SlizTokenizer("<div class=test}>{{data</div>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.UnQuotedAttributeValue,
      TokenType.NormalTagEnd,
      TokenType.UnterminatedJsInterpolation,
      TokenType.Eof,
    ]);
  });

  it("self-closing with expression", () => {
    const tokens = new SlizTokenizer("<div class={expr} />").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.SelfClosingTagEnd,
      TokenType.Eof,
    ]);
  });

  it("expression with ternary", () => {
    const tokens = new SlizTokenizer("<div class={a ? b : c}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("expression with string containing special chars", () => {
    const tokens = new SlizTokenizer("<div class={'hello'}>").tokenize();
    const expressionTokens = tokens.filter((token) => token.type === TokenType.JsInterpolation);

    expect(expressionTokens).toHaveLength(1);
    expect(expressionTokens[0]).toEqual({
      type: TokenType.JsInterpolation,
      start: 11,
      end: 20,
      value: "{'hello'}",
    });
  });

  it("boolean attribute", () => {
    const tokens = new SlizTokenizer("<div disabled>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("attribute with missing value after =", () => {
    const tokens = new SlizTokenizer("<div class= >").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("unterminated quoted attribute value", () => {
    const tokens = new SlizTokenizer('<div class="unclosed').tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
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

  it("unquoted value with || after } does not loop", () => {
    const tokens = new SlizTokenizer("<div class=test} || }}>{{data 123</div>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.UnQuotedAttributeValue,
      TokenType.AttributeName,
      TokenType.Unknown,
      TokenType.NormalTagEnd,
      TokenType.UnterminatedJsInterpolation,
      TokenType.Eof,
    ]);
  });
});

describe("malformed tags", () => {
  it("bare <", () => {
    const tokens = new SlizTokenizer("<").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([TokenType.Text, TokenType.Eof]);
  });

  it("bare </", () => {
    const tokens = new SlizTokenizer("</").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([TokenType.Text, TokenType.Eof]);
  });

  it("</>", () => {
    const tokens = new SlizTokenizer("</>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([TokenType.Text, TokenType.Eof]);
  });

  it("extra } before >", () => {
    const tokens = new SlizTokenizer("<div }>>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.Unknown,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.Eof,
    ]);
  });

  it("empty braces inside tag", () => {
    const tokens = new SlizTokenizer("<div {}>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.Unknown,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });
});

// Script tag isn't supported so it will output wrong tokens its ok
// the first unsupportedTagName token is well need to handle error
describe("raw text tags", () => {
  it("script with < operator", () => {
    const tokens = new SlizTokenizer("<script>if(a<b){}</script>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.UnsupportedTagName,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.Unknown,
      TokenType.AttributeName,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("unterminated script", () => {
    const tokens = new SlizTokenizer("<script>code").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.UnsupportedTagName,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.Eof,
    ]);
  });

  it("style tag", () => {
    const tokens = new SlizTokenizer("<style>.a{color:red}</style>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.UnsupportedTagName,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.JsInterpolation,
      TokenType.ClosingTagStart,
      TokenType.TagName,
      TokenType.UnsupportedTagName,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("unterminated style", () => {
    const tokens = new SlizTokenizer("<style>css").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.UnsupportedTagName,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.Eof,
    ]);
  });
});

describe("comments and declarations", () => {
  it("unterminated comment", () => {
    const tokens = new SlizTokenizer("<!-- comment").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.CommentStart,
      TokenType.CommentContent,
      TokenType.UnterminatedComment,
      TokenType.Eof,
    ]);
  });

  it("unterminated doctype", () => {
    const tokens = new SlizTokenizer("<!DOCTYPE html").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningDeclarationStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.UnterminatedTag,
      TokenType.Eof,
    ]);
  });
});

describe("full tag lifecycle", () => {
  it("div with expression then content then closing", () => {
    const tokens = new SlizTokenizer("<div class={expr}>text</div>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.AttributeName,
      TokenType.Equals,
      TokenType.JsInterpolation,
      TokenType.NormalTagEnd,
      TokenType.Text,
      TokenType.ClosingTagStart,
      TokenType.TagName,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });

  it("nested divs with expressions", () => {
    const tokens = new SlizTokenizer("<div>{a}<span>{b}</span></div>").tokenize();
    const types = tokens.map((token) => token.type);

    expect(types).toEqual([
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.NormalTagEnd,
      TokenType.JsInterpolation,
      TokenType.OpeningTagStart,
      TokenType.TagName,
      TokenType.NormalTagEnd,
      TokenType.JsInterpolation,
      TokenType.ClosingTagStart,
      TokenType.TagName,
      TokenType.NormalTagEnd,
      TokenType.ClosingTagStart,
      TokenType.TagName,
      TokenType.NormalTagEnd,
      TokenType.Eof,
    ]);
  });
});
