import ts from "typescript";
import { captureInterpolation } from "../src/tokenizer/interpolation";

const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard);
let source = "{ userID + 4 } userData+5";
scanner.setText(source);
scanner.resetTokenState(0);

const output = captureInterpolation(scanner);

const expr = source.slice(output.start, output.end);

console.dir({ output, expr }, { depth: null });
