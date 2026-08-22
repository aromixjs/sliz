import ts from "typescript";
import { CharacterScanner } from "./CharacterScanner";
import { captureInterpolation, InterpolationStatus } from "./interpolation";
import { Token, TokenType } from "./token";

export class SlizTokenizer extends CharacterScanner<Token> {
  private readonly scanner: ts.Scanner;
  private readonly unSupportedTagNames = new Set(["script", "style"]);

  constructor(source: string) {
    super(source);
    this.scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      source,
    );
  }

  private isHtmlIdentifier(code: number): boolean {
    return (
      !Number.isNaN(code) &&
      code !== this.null &&
      code !== this.space &&
      code !== this.tab &&
      code !== this.lineFeed &&
      code !== this.carriageReturn &&
      code !== this.formFeed &&
      code !== this.slash &&
      code !== this.greaterThan &&
      code !== this.equals &&
      code !== this.doubleQuote &&
      code !== this.singleQuote &&
      code !== this.lessThan &&
      code !== this.openBrace &&
      code !== this.closeBrace
    );
  }

  /*===== Comments =====*/
  private get isComment(): boolean {
    return (
      this.peek() === this.lessThan &&
      this.peekAtOffset(1) === this.exclamationMark &&
      this.peekAtOffset(2) === this.minus &&
      this.peekAtOffset(3) === this.minus
    );
  }

  private get isCommentEndSymbol(): boolean {
    return (
      this.peek() === this.minus &&
      this.peekAtOffset(1) === this.minus &&
      this.peekAtOffset(2) === this.greaterThan
    );
  }

  private consumeCommentStart() {
    const start = this.position;
    this.advanceBy(4);
    this.emit({ type: TokenType.CommentStart, start, end: this.position });
  }

  private consumeCommentContent() {
    const start = this.position;

    while (!this.eof && !this.isCommentEndSymbol) {
      if (this.isComment) {
        this.emit({ type: TokenType.CommentStart, start: this.position, end: this.position });
        this.advanceBy(4);
        continue;
      }

      this.advance();
    }

    this.emitIf(this.position > start, {
      type: TokenType.CommentContent,
      start,
      end: this.position,
      value: this.getChars(start),
    });

    this.emitIf(this.eof, {
      type: TokenType.UnterminatedComment,
      start,
      end: this.position,
    });
  }

  private consumeCommentEnd() {
    const start = this.position;
    this.advanceBy(3);
    this.emit({ type: TokenType.CommentEnd, start, end: this.position });
  }
  /*===== Declaration =====*/
  private get isDeclaration(): boolean {
    return (
      this.peek() === this.lessThan &&
      this.peekAtOffset(1) === this.exclamationMark &&
      this.isHtmlIdentifier(this.peekAtOffset(2))
    );
  }

  private consumeOpeningDeclaration() {
    const start = this.position;
    this.advanceBy(2);
    this.emit({
      type: TokenType.OpeningDeclarationStart,
      start,
      end: this.position,
    });
  }

  /*===== Tag =====*/
  private get isTagEnd(): boolean {
    return (
      this.peek() === this.greaterThan ||
      (this.peek() === this.slash && this.peekAtOffset(1) === this.greaterThan)
    );
  }

  private get isClosingTag() {
    return (
      this.peek() === this.lessThan &&
      this.peekAtOffset(1) === this.slash &&
      this.isHtmlIdentifier(this.peekAtOffset(2))
    );
  }

  private get isOpeningTag() {
    return this.peek() === this.lessThan && this.isHtmlIdentifier(this.peekAtOffset(1));
  }

  private consumeOpeningTagStart() {
    const start = this.position;
    this.advance();
    this.emit({
      type: TokenType.OpeningTagStart,
      start,
      end: this.position,
    });
  }

  private consumeClosingTagStart() {
    const start = this.position;
    this.advanceBy(2);
    this.emit({
      type: TokenType.ClosingTagStart,
      start,
      end: this.position,
    });
  }

  private consumeTagName() {
    const nameStart = this.position;

    while (!this.eof && this.isHtmlIdentifier(this.peek())) {
      this.advance();
    }

    const value = this.getChars(nameStart);
    this.emit({
      type: TokenType.TagName,
      start: nameStart,
      end: this.position,
      value,
    });

    this.emitIf(this.unSupportedTagNames.has(value.toLowerCase()), {
      type: TokenType.UnsupportedTagName,
      start: nameStart,
      end: this.position,
      value,
    });
  }

  private consumeTagEndIfPresent() {
    this.skipWhiteSpace();
    if (this.eof || !this.isTagEnd) {
      this.emit({
        type: TokenType.UnterminatedTag,
        start: this.position,
        end: this.position,
      });

      return;
    }
    const start = this.position;
    const selfClosing = this.peek() === this.slash && this.peekAtOffset(1) === this.greaterThan;
    if (selfClosing) {
      this.advanceBy(2);
      this.emit({
        type: TokenType.SelfClosingTagEnd,
        start,
        end: this.position,
      });
    } else {
      this.advance();
      this.emit({
        type: TokenType.NormalTagEnd,
        start,
        end: this.position,
      });
    }
  }

  /*===== Attributes =====*/

  private consumeTagAttributesIfPresent() {
    while (!this.eof) {
      this.skipWhiteSpace();

      if (this.eof || this.isTagEnd) {
        break;
      }

      if (this.isHtmlIdentifier(this.peek())) {
        this.consumeAttributeName();
        this.skipWhiteSpace();

        if (!this.eof && this.peek() === this.equals) {
          this.consumeEqual();
          this.skipWhiteSpace();
          this.consumeAttributeValue();
        }
        continue;
      }
      this.consumeUnknown();
    }
  }

  private consumeAttributeName() {
    const start = this.position;
    while (!this.eof && this.isHtmlIdentifier(this.peek())) {
      this.advance();
    }
    this.emit({
      type: TokenType.AttributeName,
      start,
      end: this.position,
      value: this.getChars(start),
    });
  }

  private consumeEqual() {
    const start = this.position;
    this.advance();
    this.emit({ type: TokenType.Equals, start, end: this.position });
  }

  private consumeAttributeValue() {
    const code = this.peek();
    const isExpression = code === this.openBrace;
    const isQuoted = !isExpression && this.isQuote;
    const isUnquoted = !isExpression && !isQuoted;

    if (isExpression) {
      this.consumeJsInterpolation();
    }

    if (isQuoted) {
      this.consumeQuotedAttributeValue();
    }

    if (isUnquoted) {
      this.consumeUnquotedAttributeValue();
    }
  }

  private consumeQuotedAttributeValue() {
    const start = this.position;
    const quote = this.peek();
    this.advance();
    while (!this.eof && this.peek() !== quote) {
      this.advance();
    }

    this.advanceIf(!this.eof);

    this.emit({
      type: TokenType.QuotedAttributeValue,
      start,
      end: this.position,
      value: this.getChars(start),
    });

    this.emitIf(this.eof, {
      type: TokenType.UnterminatedQuotedAttributeValue,
      start,
      end: this.position,
    });
  }

  private consumeUnquotedAttributeValue() {
    const start = this.position;

    while (!this.eof && !this.isWhitespace && !this.isTagEnd) {
      this.advance();
    }

    this.emitIf(this.position > start, {
      type: TokenType.UnQuotedAttributeValue,
      start,
      end: this.position,
      value: this.getChars(start),
    });
  }

  /*===== Js Interpolation =====*/
  private consumeJsInterpolation() {
    const start = this.position;
    this.scanner.resetTokenState(start);
    const outcome = captureInterpolation(this.scanner);
    this.advanceTo(outcome.end);

    if (outcome.status === InterpolationStatus.Closed) {
      this.emit({
        type: TokenType.JsInterpolation,
        start,
        end: outcome.end,
        value: this.getChars(start),
      });
      return;
    }

    if (outcome.status === InterpolationStatus.UnterminatedLiteral) {
      this.emit({
        type: TokenType.UnterminatedJsLiteral,
        start: outcome.start,
        end: outcome.end,
        value: this.getChars(start),
      });
      return;
    }

    if (outcome.status === InterpolationStatus.UnterminatedEof) {
      this.emit({
        type: TokenType.UnterminatedJsInterpolation,
        start,
        end: outcome.end,
        value: this.getChars(start),
      });
      return;
    }
  }

  /*===== Unknown =====*/
  private consumeUnknown() {
    const start = this.position;

    while (
      !this.eof &&
      !this.isWhitespace &&
      !this.isTagEnd &&
      !this.isHtmlIdentifier(this.peek())
    ) {
      this.advance();
    }

    this.emitIf(this.position > start, {
      type: TokenType.Unknown,
      start,
      end: this.position,
      value: this.getChars(start),
    });
  }

  /*===== Text =====*/
  private consumeText() {
    let segmentStart = this.position;

    while (
      !this.eof &&
      !this.isComment &&
      !this.isCommentEndSymbol &&
      !this.isOpeningTag &&
      !this.isClosingTag &&
      !this.isDeclaration
    ) {
      if (this.peek() === this.openBrace) {
        this.emitIf(this.position > segmentStart, {
          type: TokenType.Text,
          start: segmentStart,
          end: this.position,
          value: this.getChars(segmentStart),
        });

        this.consumeJsInterpolation();
        segmentStart = this.position;

        continue;
      }

      this.advance();
    }

    this.emitIf(this.position > segmentStart, {
      type: TokenType.Text,
      start: segmentStart,
      end: this.position,
      value: this.getChars(segmentStart),
    });
  }

  public tokenize() {
    while (!this.eof) {
      if (this.isComment) {
        this.consumeCommentStart();
        this.consumeCommentContent();
        continue;
      }

      if (this.isCommentEndSymbol) {
        this.consumeCommentEnd();
        continue;
      }

      if (this.isDeclaration) {
        this.consumeOpeningDeclaration();
        this.consumeTagName();
        this.consumeTagAttributesIfPresent();
        this.consumeTagEndIfPresent();
        continue;
      }

      if (this.isClosingTag) {
        this.consumeClosingTagStart();
        this.consumeTagName();
        this.consumeTagEndIfPresent();
        continue;
      }

      if (this.isOpeningTag) {
        this.consumeOpeningTagStart();
        this.consumeTagName();
        this.consumeTagAttributesIfPresent();
        this.consumeTagEndIfPresent();
        continue;
      }

      this.consumeText();
    }

    this.emit({
      type: TokenType.Eof,
      start: this.position,
      end: this.position,
    });
    return this.getTokens();
  }
}
