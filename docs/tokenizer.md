# Sliz Tokenizer

The tokenizer's job is to take raw `sliz` source and turn it into a flat list of tokens the parser can walk.

Here is the api definition:

```ts
const tokens = new SlizTokenizer(source).tokenize();
```

That's the whole entry point. `tokenize()` loops over the source once, character by character, dispatching based on what it sees next, until it runs out of input, then emits a final `Eof` token.

## How dispatch works

At any point in the source, the tokenizer is looking at one of a handful of things: the start of a comment, a declaration like `<!DOCTYPE html>`, a closing tag, an opening tag, or, if none of those match, plain text. The main loop just checks for each of these in order and hands off to the matching consumer:

```ts
if (this.isComment) { ... }
if (this.isCommentEndSymbol) { ... }
if (this.isDeclaration) { ... }
if (this.isClosingTag) { ... }
if (this.isOpeningTag) { ... }
this.consumeText();
```

Every one of those `is*` checks is a plain lookahead, it peeks at the current character and a few ahead of it, and never advances the cursor. Once a branch matches, the corresponding `consume*` method takes over and does the actual advancing.

## Tags

Opening and closing tags go through the same shape: consume the `<` (or `</`), consume the tag name, and for opening tags, consume attributes, then consume whatever ends the tag, `>` or `/>`.

Tag names are checked against a small unsupported set, currently just `script` and `style`. Sliz doesn't try to understand what's inside those tags the way HTML parsers do. It just tokenizes them like any other tag, emits an `UnsupportedTagName` token alongside the normal `TagName` token, and moves on. The parser is the one that actually rejects them. This mirrors how JSX treats these tags too, there's no special raw-text mode, the author just isn't meant to put arbitrary script/style content there.

If a tag never actually closes, whitespace and attributes run out and neither `>` nor `/>` shows up, the tokenizer emits an `UnterminatedTag` token at that position instead of just silently stopping. Every construct that can run off the end of the source without closing properly gets a token like this, so the parser never has to infer failure just from the shape of the surrounding tokens.

## Attributes

Attribute scanning loops: skip whitespace, check for the tag end, and if neither, read a name. If the name is followed by `=`, read a value. A value can be quoted (`"..."` or `'...'`), unquoted, or a `{...}` expression.

Attribute names can't be JS expressions, only values and text content can be. If a stray `{` shows up somewhere a name is expected, it just falls through to being an `Unknown` token, and the parser is left to flag it as an error.

## Text and interpolation

Text is everything that isn't a tag, comment, or declaration. The tokenizer walks forward emitting one `Text` token per run of plain characters, but the moment it hits a `{`, it stops, closes off whatever text was accumulated, and hands off to interpolation resolution.

Resolving `{...}` isn't a naive brace-count. It's backed by `JsInterpolationResolver`, which runs the real TypeScript scanner over the source starting at the brace. That's what lets it correctly handle nested braces, template literals with their own `${}` interpolations inside, strings, and regex vs division ambiguity, all inside a single `{expr}`, without the tokenizer needing to know anything about JS syntax itself. It just asks the resolver "where does this expression actually end," and gets back one of three outcomes: closed cleanly, unterminated because of an open string/template literal, or unterminated because the source just ran out. Each maps to its own token type, so an unclosed `{` never gets treated the same as one that closed properly.

## Comments

`<!--` starts a comment, `-->` ends one. HTML comments can't really nest, but if a `<!--` shows up again while already inside a comment, the tokenizer emits a zero-width `CommentStart` marker at that point and keeps going, rather than pretending it didn't see it. If the comment never closes, it emits `UnterminatedComment` at EOF. This is intentional, the tokenizer flags it and moves on; deciding what a stray nested comment actually means is left to the parser.

## The rule underneath all of it

Nothing in the tokenizer throws, and nothing silently drops information. Every place input could go wrong, an unclosed tag, an unclosed comment, an unclosed expression, an unclosed quoted value, has a dedicated token type for it, emitted at the exact position things broke. That's what lets the parser build real diagnostics later, instead of the tokenizer just giving up and taking the rest of the compile pipeline down with it.
