import { AromixHttpRequest } from "../router/request";
import { Hook } from "./hook";

export type ServerFn<Self, Expose, Props> = (
  self: Self,
  request: AromixHttpRequest,
  input: () => Props,
) => MaybePromise<{
  expose: Expose;
  hooks: Array<Hook>;
  actions:Array<{}>
}>;

export type Template = Array<{}>;
export type TemplateFn<Expose> = (expose: Expose) => Template;

export interface ComponentMeta<Self, Expose, Props> {
  id: string;
  props: Props;
  self: Self;
  server: ServerFn<Self, Expose, Props>;
  template: TemplateFn<Expose>;
}
