import { tokenize } from "../tokenizer/tokenize";
import { CompilerContext } from "./context";

export function compile(context: CompilerContext) {
  const tokens = tokenize(context.source);
  return { tokens };
}
