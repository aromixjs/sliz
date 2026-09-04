import { AromixHttpRequest } from "../router/request";

export interface RenderContext<Props extends object> {
  props: Props;
  request: AromixHttpRequest;
}
