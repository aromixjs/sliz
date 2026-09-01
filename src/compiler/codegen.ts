import { TransformedNode } from "./transformers/transformer";
import { ExtractedExpression } from "./transformers/types";

export function generate(nodes: TransformedNode[], expressions: Map<string, ExtractedExpression>) {
  let output = "";

  for (const node of nodes) {
    output += generateNode(node, expressions);
  }

  return output;
}

function generateNode(
  node: TransformedNode,
  expressions: Map<string, ExtractedExpression>,
): string {
  switch (node.type) {
    case "text":
      return emitAppend(resolveText(node.value, expressions));
    case "element": {
      const attrs = Object.entries(node.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("");
      const open = emitAppend(`<${node.tag}${attrs}>`);
      const children = node.children.map((c) => generateNode(c, expressions)).join("");
      const close = emitAppend(`</${node.tag}>`);
      return open + children + close;
    }
    case "conditional":
      return `if (${node.expr}) {\n${generateNode(node.consequent, expressions)}}\n`;
  }
}

function resolveText(value: string, expressions: Map<string, ExtractedExpression>): string {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  return value.replace(uuidPattern, (id) => {
    const expr = expressions.get(id);
    return expr ? `\${${expr.source}}` : id;
  });
}

function emitAppend(text: string): string {
  return `html += \`${text.replace(/`/g, "\\`")}\`;\n`;
}
