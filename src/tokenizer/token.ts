export enum TokenType {
  OpeningTagStart = "OpeningTagStart",
  OpeningDeclarationStart = "OpeningDeclarationStart",
  TagName = "TagName",
  ClosingTagStart = "ClosingTagStart",
  NormalTagEnd = "NormalTagEnd",
  SelfClosingTagEnd = "SelfClosingTagEnd",
  UnsupportedTagName = "UnsupportedTagName",
  UnterminatedTag = "UnterminatedTag",

  AttributeName = "AttributeName",
  Equals = "Equals",
  QuotedAttributeValue = "QuotedAttributeValue",
  UnterminatedQuotedAttributeValue = "UnterminatedQuotedAttributeValue",
  UnQuotedAttributeValue = "UnQuotedAttributeValue",

  CommentStart = "CommentStart",
  CommentEnd = "CommentEnd",
  CommentContent = "CommentContent",
  UnterminatedComment = "UnterminatedComment",

  JsInterpolation = "JsInterpolation",
  UnterminatedJsLiteral = "UnterminatedJsLiteral",
  UnterminatedJsInterpolation = "UnterminatedJsInterpolation",

  Text = "Text",

  Unknown = "Unknown",
  Eof = "Eof",
}

/*===== Base =====*/

export interface BaseToken {
  type: TokenType;
  start: number;
  end: number;
}

/*=== Tag Tokens ===*/
export interface OpeningTagStartToken extends BaseToken {
  type: TokenType.OpeningTagStart;
}
export interface OpeningDeclarationStartToken extends BaseToken {
  type: TokenType.OpeningDeclarationStart;
}
export interface TagNameToken extends BaseToken {
  type: TokenType.TagName;
  value: string;
}

export interface ClosingTagStartToken extends BaseToken {
  type: TokenType.ClosingTagStart;
}

export interface NormalTagEndToken extends BaseToken {
  type: TokenType.NormalTagEnd;
}

export interface SelfClosingTagEndToken extends BaseToken {
  type: TokenType.SelfClosingTagEnd;
}

export interface UnsupportedTagNameToken extends BaseToken {
  type: TokenType.UnsupportedTagName;
  value: string;
}

export interface UnterminatedTag extends BaseToken {
  type: TokenType.UnterminatedTag;
}

/*=== Html Attribute Tokens ===*/

export interface AttributeNameToken extends BaseToken {
  type: TokenType.AttributeName;
  value: string;
}

export interface EqualsToken extends BaseToken {
  type: TokenType.Equals;
}

export interface QuotedAttributeValueToken extends BaseToken {
  type: TokenType.QuotedAttributeValue;
  value: string;
}

export interface UnterminatedQuotedAttributeValueToken extends BaseToken {
  type: TokenType.UnterminatedQuotedAttributeValue;
}

export interface UnQuotedAttributeValueToken extends BaseToken {
  type: TokenType.UnQuotedAttributeValue;
  value: string;
}

/*=== Html Comment Tokens ===*/

export interface CommentStartToken extends BaseToken {
  type: TokenType.CommentStart;
}

export interface CommentEndToken extends BaseToken {
  type: TokenType.CommentEnd;
}

export interface CommentContentToken extends BaseToken {
  type: TokenType.CommentContent;
  value: string;
}

export interface UnterminatedCommentToken extends BaseToken {
  type: TokenType.UnterminatedComment;
}

/*=== Js Expression Tokens ===*/

export interface JsInterpolationToken extends BaseToken {
  type: TokenType.JsInterpolation;
  value: string;
}

export interface UnterminatedJsLiteralToken extends BaseToken {
  type: TokenType.UnterminatedJsLiteral;
  value: string;
}

export interface UnterminatedJsInterpolationToken extends BaseToken {
  type: TokenType.UnterminatedJsInterpolation;
  value: string;
}

/*=== Content Tokens ===*/

export interface TextToken extends BaseToken {
  type: TokenType.Text;
  value: string;
}

/*=== Fallback Tokens ===*/

export interface UnknownToken extends BaseToken {
  type: TokenType.Unknown;
  value: string;
}

export interface EofToken extends BaseToken {
  type: TokenType.Eof;
}

/*=== Token ===*/
export type Token =
  | OpeningTagStartToken
  | OpeningDeclarationStartToken
  | TagNameToken
  | ClosingTagStartToken
  | NormalTagEndToken
  | SelfClosingTagEndToken
  | UnsupportedTagNameToken
  | UnterminatedTag
  | AttributeNameToken
  | EqualsToken
  | QuotedAttributeValueToken
  | UnterminatedQuotedAttributeValueToken
  | UnQuotedAttributeValueToken
  | CommentStartToken
  | CommentEndToken
  | CommentContentToken
  | UnterminatedCommentToken
  | JsInterpolationToken
  | UnterminatedJsLiteralToken
  | UnterminatedJsInterpolationToken
  | TextToken
  | UnknownToken
  | EofToken;
