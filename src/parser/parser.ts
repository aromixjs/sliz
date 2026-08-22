import { Token, TokenType } from "../tokenizer/token";
import { AttributeNode, CommentNode, Diagnostic, Node, RootNode } from "./ast";

type TokenOfType<T extends TokenType> = Extract<Token, { type: T }>;

export class SlizParser {
  private index = 0;
  private tokens: Array<Token>;
  private diagnostics: Array<Diagnostic> = [];

  constructor(tokens: Array<Token>) {
    this.tokens = tokens;
  }

  // Method, not a property — every call is a fresh, unnarrowed expression to TS.
  private peek(): Token {
    return this.tokens[this.index];
  }

  private advance() {
    if (this.index < this.tokens.length - 1) {
      this.index++;
    }
  }

  private expect<T extends TokenType>(type: T): TokenOfType<T> {
    const tok = this.peek();

    if (tok.type !== type) {
      this.diagnostics.push({
        message: `Expected token ${type} but got ${tok.type}`,
        start: tok.start,
        end: tok.end,
        severity: "error",
      });
      return tok as TokenOfType<T>;
    }

    this.advance();
    return tok as TokenOfType<T>;
  }

  private parseAttributes(): AttributeNode[] {
    const attrs: AttributeNode[] = [];

    while (this.peek().type === TokenType.AttributeName) {
      const nameToken = this.peek() as TokenOfType<TokenType.AttributeName>;
      this.advance();

      const afterName = this.peek();

      if (afterName.type !== TokenType.Equals) {
        attrs.push({
          type: "Attribute",
          name: nameToken.value,
          value: null,
          quoted: false,
          start: nameToken.start,
          end: nameToken.end,
        });
        continue;
      }

      this.advance(); // consume Equals

      const valueTok = this.peek();

      if (valueTok.type === TokenType.QuotedAttributeValue) {
        this.advance();
        attrs.push({
          type: "Attribute",
          name: nameToken.value,
          value: valueTok.value,
          quoted: true,
          start: nameToken.start,
          end: valueTok.end,
        });
        continue;
      }

      if (valueTok.type === TokenType.UnQuotedAttributeValue) {
        this.advance();
        attrs.push({
          type: "Attribute",
          name: nameToken.value,
          value: valueTok.value,
          quoted: false,
          start: nameToken.start,
          end: valueTok.end,
        });
        continue;
      }

      if (valueTok.type === TokenType.UnterminatedQuotedAttributeValue) {
        this.diagnostics.push({
          message: "Unterminated attribute value",
          start: valueTok.start,
          end: valueTok.end,
          severity: "error",
        });
        this.advance();
        attrs.push({
          type: "Attribute",
          name: nameToken.value,
          value: null,
          quoted: true,
          start: nameToken.start,
          end: valueTok.end,
        });
        continue;
      }

      // '=' with nothing usable after it
      this.diagnostics.push({
        message: "Expected attribute value after '='",
        start: valueTok.start,
        end: valueTok.end,
        severity: "error",
      });
      attrs.push({
        type: "Attribute",
        name: nameToken.value,
        value: null,
        quoted: false,
        start: nameToken.start,
        end: nameToken.end,
      });
    }

    return attrs;
  }

  private consumeClosingTag(openName: string): number {
    const closingStart = this.peek();
    this.advance(); // consume ClosingTagStart

    const nameToken = this.expect(TokenType.TagName);

    if (nameToken.value !== openName) {
      this.diagnostics.push({
        message: `Mismatched closing tag: expected </${openName}> but got </${nameToken.value}>`,
        start: closingStart.start,
        end: nameToken.end,
        severity: "error",
      });
    }

    const endToken = this.expect(TokenType.NormalTagEnd);
    return endToken.end;
  }

  private consumeElementStartTag(): Node {
    const startToken = this.peek();
    this.advance(); // consume OpeningTagStart

    const maybeUnsupported = this.peek();

    if (maybeUnsupported.type === TokenType.UnsupportedTagName) {
      this.diagnostics.push({
        message: `Unsupported tag name: ${maybeUnsupported.value}`,
        start: maybeUnsupported.start,
        end: maybeUnsupported.end,
        severity: "error",
      });
    }

    const nameToken = this.expect(TokenType.TagName);
    const attributes = this.parseAttributes();
    const children: Node[] = [];
    let endPos = nameToken.end;

    const afterAttrs = this.peek();

    if (afterAttrs.type === TokenType.SelfClosingTagEnd) {
      endPos = afterAttrs.end;
      this.advance();
      return {
        type: "Element",
        name: nameToken.value,
        attributes,
        children,
        selfClosing: true,
        start: startToken.start,
        end: endPos,
      };
    }

    if (afterAttrs.type === TokenType.UnterminatedTag) {
      this.diagnostics.push({
        message: `Unterminated tag: <${nameToken.value}>`,
        start: startToken.start,
        end: afterAttrs.end,
        severity: "error",
      });
      endPos = afterAttrs.end;
      this.advance();
      return {
        type: "Element",
        name: nameToken.value,
        attributes,
        children,
        selfClosing: false,
        start: startToken.start,
        end: endPos,
      };
    }

    if (afterAttrs.type === TokenType.NormalTagEnd) {
      endPos = afterAttrs.end;
      this.advance();
    } else {
      this.diagnostics.push({
        message: `Expected '>' or '/>' to close tag <${nameToken.value}>`,
        start: afterAttrs.start,
        end: afterAttrs.end,
        severity: "error",
      });
    }

    while (this.peek().type !== TokenType.Eof && this.peek().type !== TokenType.ClosingTagStart) {
      const child = this.parseNode();
      if (child !== null) {
        children.push(child);
      }
    }

    if (this.peek().type === TokenType.ClosingTagStart) {
      endPos = this.consumeClosingTag(nameToken.value);
    } else {
      this.diagnostics.push({
        message: `Unclosed element <${nameToken.value}>`,
        start: startToken.start,
        end: endPos,
        severity: "error",
      });
    }

    return {
      type: "Element",
      name: nameToken.value,
      attributes,
      children,
      selfClosing: false,
      start: startToken.start,
      end: endPos,
    };
  }

  private parseComment(): CommentNode {
    const startToken = this.peek();
    this.advance(); // consume CommentStart

    let value = "";
    let endPos = startToken.end;

    const contentTok = this.peek();

    if (contentTok.type === TokenType.CommentContent) {
      value = contentTok.value;
      endPos = contentTok.end;
      this.advance();
    }

    const closeTok = this.peek();

    if (closeTok.type === TokenType.CommentEnd) {
      endPos = closeTok.end;
      this.advance();
    } else if (closeTok.type === TokenType.UnterminatedComment) {
      this.diagnostics.push({
        message: "Unterminated comment",
        start: startToken.start,
        end: closeTok.end,
        severity: "error",
      });
      endPos = closeTok.end;
      this.advance();
    }

    return {
      type: "Comment",
      value,
      start: startToken.start,
      end: endPos,
    };
  }

  private parseNode(): Node | null {
    const tok = this.peek();

    if (tok.type === TokenType.OpeningTagStart) {
      return this.consumeElementStartTag();
    }

    if (tok.type === TokenType.CommentStart) {
      return this.parseComment();
    }

    if (tok.type === TokenType.Text) {
      this.advance();
      return {
        type: "Text",
        value: tok.value,
        start: tok.start,
        end: tok.end,
      };
    }

    if (tok.type === TokenType.JsInterpolation) {
      this.advance();
      return {
        type: "JsInterpolation",
        value: tok.value,
        start: tok.start,
        end: tok.end,
      };
    }

    if (
      tok.type === TokenType.UnterminatedJsInterpolation ||
      tok.type === TokenType.UnterminatedJsLiteral
    ) {
      this.diagnostics.push({
        message: "Unterminated JS expression",
        start: tok.start,
        end: tok.end,
        severity: "error",
      });
      this.advance();
      return {
        type: "JsInterpolation",
        value: tok.value,
        start: tok.start,
        end: tok.end,
      };
    }

    // OpeningDeclarationStart, Unknown, stray ClosingTagStart, etc.
    this.diagnostics.push({
      message: `Unexpected token: ${tok.type}`,
      start: tok.start,
      end: tok.end,
      severity: "error",
    });
    this.advance();
    return null;
  }

  public parse(): { root: RootNode; diagnostics: Diagnostic[] } {
    const children: Node[] = [];
    const startPos = this.peek().start;

    while (this.peek().type !== TokenType.Eof) {
      const node = this.parseNode();
      if (node !== null) {
        children.push(node);
      }
    }

    const root: RootNode = {
      type: "Root",
      children,
      start: startPos,
      end: this.peek().end,
    };

    return { root, diagnostics: this.diagnostics };
  }
}
