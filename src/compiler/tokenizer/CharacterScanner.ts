export class CharacterScanner<Token = unknown> {
  private index = 0;
  readonly source: string;
  private readonly tokens: Array<Token> = [];

  constructor(source: string) {
    this.source = source;
  }

  /*===== Character codes =====*/
  protected readonly null = 0;
  protected readonly backspace = 8;
  protected readonly tab = 9;
  protected readonly lineFeed = 10;
  protected readonly verticalTab = 11;
  protected readonly formFeed = 12;
  protected readonly carriageReturn = 13;
  protected readonly space = 32;

  protected readonly exclamationMark = 33;
  protected readonly doubleQuote = 34;
  protected readonly hash = 35;
  protected readonly dollar = 36;
  protected readonly percent = 37;
  protected readonly ampersand = 38;
  protected readonly singleQuote = 39;

  protected readonly openParen = 40;
  protected readonly closeParen = 41;
  protected readonly asterisk = 42;
  protected readonly plus = 43;
  protected readonly comma = 44;
  protected readonly minus = 45;
  protected readonly dot = 46;
  protected readonly slash = 47;

  protected readonly colon = 58;
  protected readonly semicolon = 59;
  protected readonly lessThan = 60;
  protected readonly equals = 61;
  protected readonly greaterThan = 62;
  protected readonly questionMark = 63;
  protected readonly at = 64;

  protected readonly upperA = 65;
  protected readonly upperB = 66;
  protected readonly upperC = 67;
  protected readonly upperD = 68;
  protected readonly upperE = 69;
  protected readonly upperF = 70;
  protected readonly upperG = 71;
  protected readonly upperH = 72;
  protected readonly upperI = 73;
  protected readonly upperJ = 74;
  protected readonly upperK = 75;
  protected readonly upperL = 76;
  protected readonly upperM = 77;
  protected readonly upperN = 78;
  protected readonly upperO = 79;
  protected readonly upperP = 80;
  protected readonly upperQ = 81;
  protected readonly upperR = 82;
  protected readonly upperS = 83;
  protected readonly upperT = 84;
  protected readonly upperU = 85;
  protected readonly upperV = 86;
  protected readonly upperW = 87;
  protected readonly upperX = 88;
  protected readonly upperY = 89;
  protected readonly upperZ = 90;

  protected readonly openBracket = 91;
  protected readonly backslash = 92;
  protected readonly closeBracket = 93;
  protected readonly caret = 94;
  protected readonly underscore = 95;
  protected readonly backtick = 96;

  protected readonly lowerA = 97;
  protected readonly lowerB = 98;
  protected readonly lowerC = 99;
  protected readonly lowerD = 100;
  protected readonly lowerE = 101;
  protected readonly lowerF = 102;
  protected readonly lowerG = 103;
  protected readonly lowerH = 104;
  protected readonly lowerI = 105;
  protected readonly lowerJ = 106;
  protected readonly lowerK = 107;
  protected readonly lowerL = 108;
  protected readonly lowerM = 109;
  protected readonly lowerN = 110;
  protected readonly lowerO = 111;
  protected readonly lowerP = 112;
  protected readonly lowerQ = 113;
  protected readonly lowerR = 114;
  protected readonly lowerS = 115;
  protected readonly lowerT = 116;
  protected readonly lowerU = 117;
  protected readonly lowerV = 118;
  protected readonly lowerW = 119;
  protected readonly lowerX = 120;
  protected readonly lowerY = 121;
  protected readonly lowerZ = 122;

  protected readonly openBrace = 123;
  protected readonly pipe = 124;
  protected readonly closeBrace = 125;
  protected readonly tilde = 126;

  protected readonly zero = 48;
  protected readonly one = 49;
  protected readonly two = 50;
  protected readonly three = 51;
  protected readonly four = 52;
  protected readonly five = 53;
  protected readonly six = 54;
  protected readonly seven = 55;
  protected readonly eight = 56;
  protected readonly nine = 57;

  /*===== Position =====*/
  protected get position(): number {
    return this.index;
  }

  protected get eof(): boolean {
    return this.index >= this.source.length;
  }

  protected peek(): number {
    return this.source.charCodeAt(this.index);
  }

  protected peekAtOffset(offset: number): number {
    return this.source.charCodeAt(this.index + offset);
  }

  protected advance(): void {
    this.index++;
  }

  protected advanceBy(offset: number): void {
    this.index = Math.max(0, Math.min(this.index + offset, this.source.length));
  }

  protected advanceIf(condition: boolean): void {
    if (condition) {
      this.index++;
    }
  }

  protected advanceTo(position: number): void {
    this.index = position;
  }

  protected getChars(start: number): string {
    return this.source.slice(start, this.index);
  }

  /*===== Generic character-class checks =====*/
  protected get isWhitespace(): boolean {
    const code = this.peek();

    return (
      code === this.space ||
      code === this.tab ||
      code === this.lineFeed ||
      code === this.formFeed ||
      code === this.carriageReturn ||
      code === this.verticalTab
    );
  }

  protected get isQuote(): boolean {
    const code = this.peek();
    return code === this.singleQuote || code === this.doubleQuote;
  }

  protected get isLineBreak(): boolean {
    const code = this.peek();
    return code === this.carriageReturn || code === this.lineFeed;
  }

  /*===== Token emission =====*/
  protected emit(token: Token): void {
    this.tokens.push(token);
  }

  protected emitIf(condition: boolean, token: Token): void {
    if (condition) {
      this.tokens.push(token);
    }
  }

  protected getTokens(): Array<Token> {
    return this.tokens;
  }

  protected clearTokens(): void {
    this.tokens.length = 0;
  }

  protected skipWhiteSpace(): void {
    while (!this.eof && this.isWhitespace) {
      this.advance();
    }
  }
}
