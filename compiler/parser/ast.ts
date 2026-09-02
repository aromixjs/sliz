export interface BaseNode {
  start: number;
  end: number;
}

export interface AttributeNode extends BaseNode {
  type: "Attribute";
  name: string;
  value: string | null;
  quoted: boolean;
}

export interface ElementNode extends BaseNode {
  type: "Element";
  name: string;
  attributes: AttributeNode[];
  children: Node[];
  selfClosing: boolean;
}

export interface TextNode extends BaseNode {
  type: "Text";
  value: string;
}

export interface CommentNode extends BaseNode {
  type: "Comment";
  value: string;
}

export interface JsInterpolationNode extends BaseNode {
  type: "JsInterpolation";
  value: string;
}

export interface RootNode extends BaseNode {
  type: "Root";
  children: Node[];
}

export type Node = ElementNode | TextNode | CommentNode | JsInterpolationNode | RootNode;

export interface Diagnostic {
  message: string;
  start: number;
  end: number;
  severity: "error" | "warning";
}
