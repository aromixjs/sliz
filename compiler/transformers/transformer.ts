import { Node } from "../parser/ast";
import { ExtractedExpression, PreProcessError, PreProcessResult } from "./types";

export type TransformedNode = TextNode | ElementNode | ConditionalNode;

interface TextNode {
  type: "text";
  value: string;
}

interface ElementNode {
  type: "element";
  tag: string;
  attributes: Record<string, string>;
  children: TransformedNode[];
}

interface ConditionalNode {
  type: "conditional";
  expr: string;
  consequent: TransformedNode;
}

export interface TransformResult {
  ast: TransformedNode[];
  errors: PreProcessError[];
}

export function transform(htmlAst: Node[], results: PreProcessResult[]) {
  const expressions = new Map<string, ExtractedExpression>();
  const errors: PreProcessError[] = [];

  for (const result of results) {
    for (const [id, expr] of result.expressions) {
      expressions.set(id, expr);
    }
    errors.push(...result.errors);
  }

  const ast = htmlAst.map((node) => transformNode(node, expressions, errors));
  return { ast, errors };
}

function transformNode(
  node: Node,
  expressions: Map<string, ExtractedExpression>,
  errors: PreProcessError[],
): TransformedNode {
  if (node.type === "text") {
    return node;
  }

  if (node.type !== "element") {
    return { type: "text", value: "" };
  }

  const { ".when": whenId, ...rest } = node.attributes;
  const children = node.children.map((c: Node) => transformNode(c, expressions, errors));

  let current: TransformedNode = {
    type: "element",
    tag: node.tag,
    attributes: rest,
    children,
  };

  if (whenId) {
    const expr = expressions.get(whenId);
    if (!expr) {
      errors.push({ message: `Unresolved .when expression`, start: 0 });
    } else {
      current = { type: "conditional", expr: expr.source, consequent: current };
    }
  }

  return current;
}
