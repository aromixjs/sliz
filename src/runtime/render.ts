import { AromixHttpRequest } from "../router/request";

export interface RenderContext<Self extends object, Props extends object> {
   props: Props,
   request: AromixHttpRequest,
   self: Self
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
}





export function render<
   Instance extends { SelfType: any, PropType: any },
   Expose extends object
>(
   component: AvComponent<Instance, Expose>,
   context: RenderContext<Instance['SelfType'], Instance['PropType']>
) {



}