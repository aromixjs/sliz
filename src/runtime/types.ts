import { AromixHttpRequest } from "../router/request";
import { Hook } from "./hook";

export type ServerFn<Self, Expose, Input> = (
  self: Self,
  request: AromixHttpRequest,
  input: () => Input,
) => MaybePromise<{
  expose: Expose;
  hooks: Array<Hook>;
}>;

export type Template = Array<{}>;
export type TemplateFn<Expose> = (expose: Expose) => Template;

export interface ComponentMeta<Self, Expose, Input> {
  id: string;
  input: Input;
  self: Self;
  server: ServerFn<Self, Expose, Input>;
  template: TemplateFn<Expose>;
}
