import { AromixHttpRequest } from "../router/request";

export interface AvComponent<
  Prop extends object = any,
  Self extends object = any,
  TServerExpose extends object = any,
> {
  SelfDefaults: Self;

  c(props: Prop): {
    type: "component";
    reference: any;
    props: Prop;
  };

  Server(
    self: Self,
    request: AromixHttpRequest,
    props: Prop,
  ): {
    expose: TServerExpose;
    actions: Record<string, string>;
    hooks: Array<object>;
  };

  Template(exposed: TServerExpose): Array<object>;
}
