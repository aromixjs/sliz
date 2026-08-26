import { captureInterpolation, InterpolationOutcome } from "@/src";
import ts from "typescript";
export function scanAt(source: string, position: number) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  );
  scanner.resetTokenState(position);
  return captureInterpolation(scanner);
}

export function slice(source: string, result: InterpolationOutcome) {
  return source.slice(result.start, result.end);
}
