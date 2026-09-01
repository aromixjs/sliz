export interface PreProcessError {
  message: string;
  start: number;
}

export interface PreProcessResult {
  expressions: Map<string, ExtractedExpression>;
  errors: PreProcessError[];
}

export interface ExtractedExpression {
  id: number;
  source: string;
  start: number;
  end: number;
}
