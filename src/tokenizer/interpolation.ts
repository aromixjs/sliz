import ts from "typescript";

export enum FrameKind {
  Brace,
  TemplateInterpolation,
}

const RegexExpectedAfter = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ReturnKeyword,
  ts.SyntaxKind.TypeOfKeyword,
  ts.SyntaxKind.InstanceOfKeyword,
  ts.SyntaxKind.InKeyword,
  ts.SyntaxKind.OfKeyword,
  ts.SyntaxKind.NewKeyword,
  ts.SyntaxKind.DeleteKeyword,
  ts.SyntaxKind.VoidKeyword,
  ts.SyntaxKind.YieldKeyword,
  ts.SyntaxKind.ThrowKeyword,
  ts.SyntaxKind.CaseKeyword,
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.OpenParenToken,
  ts.SyntaxKind.OpenBraceToken,
  ts.SyntaxKind.OpenBracketToken,
  ts.SyntaxKind.CommaToken,
  ts.SyntaxKind.SemicolonToken,
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionToken,
  ts.SyntaxKind.ColonToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
]);

const TriviaKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.ShebangTrivia,
  ts.SyntaxKind.ConflictMarkerTrivia,
]);

export enum InterpolationStatus {
  Closed = "Closed",
  UnterminatedLiteral = "UnterminatedLiteral",
  UnterminatedEof = "UnterminatedEof",
  InvalidStart = "InvalidStart",
}

export interface InterpolationOutcome {
  status: InterpolationStatus;
  start: number;
  end: number;
}

export function captureInterpolation(scanner: ts.Scanner): InterpolationOutcome {
  const start = scanner.getTokenStart();

  let kind = scanner.scan();
  if (kind !== ts.SyntaxKind.OpenBraceToken) {
    return {
      status: InterpolationStatus.InvalidStart,
      start,
      end: start,
    };
  }

  const stack: FrameKind[] = [FrameKind.Brace];
  let previousSignificantKind = ts.SyntaxKind.OpenBraceToken;

  while (true) {
    let kind = scanner.scan();

    if (TriviaKinds.has(kind)) {
      continue;
    }

    if (kind === ts.SyntaxKind.SlashToken || kind === ts.SyntaxKind.SlashEqualsToken) {
      if (RegexExpectedAfter.has(previousSignificantKind)) {
        kind = scanner.reScanSlashToken();
      }
    }

    if (
      kind === ts.SyntaxKind.CloseBraceToken &&
      stack[stack.length - 1] === FrameKind.TemplateInterpolation
    ) {
      kind = scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
    }

    if (scanner.isUnterminated()) {
      const end = scanner.getTokenEnd();
      return {
        status: InterpolationStatus.UnterminatedLiteral,
        start,
        end,
      };
    }

    if (kind === ts.SyntaxKind.EndOfFileToken) {
      const end = scanner.getTokenEnd();
      return {
        status: InterpolationStatus.UnterminatedEof,
        start,
        end,
      };
    }
    if (kind === ts.SyntaxKind.OpenBraceToken) {
      stack.push(FrameKind.Brace);
    }

    if (kind === ts.SyntaxKind.TemplateHead) {
      stack.push(FrameKind.TemplateInterpolation);
    }

    if (kind === ts.SyntaxKind.CloseBraceToken || kind === ts.SyntaxKind.TemplateTail) {
      stack.pop();
      if (stack.length === 0) {
        const end = scanner.getTokenEnd();
        return {
          status: InterpolationStatus.Closed,
          start,
          end,
        };
      }
    }

    previousSignificantKind = kind;
  }
}
