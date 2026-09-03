import { AromixHttpRequest } from "../router/request"

export interface RenderContext<Props extends object> {
   props: Props,
   request: AromixHttpRequest
}

export interface AvComponent<
   Instance extends { SelfType: any, PropType: any } = any,
   ServerExpose extends object = any
> {
   new(): Instance,
   Server(
      self: Instance['SelfType'],
      request: AromixHttpRequest,
      props: () => Instance['PropType']
   ): {
      expose: ServerExpose,
      actions: Array<object>,
      hooks: Array<object>
   }

   Template(exposed: ServerExpose): Array<object>
   SelfMeta: Record<string, any>
   SelfDefaults: Instance["SelfType"];
}
