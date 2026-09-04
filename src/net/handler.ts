export interface HandlerContext {
   params: Record<string, string>
   query: URLSearchParams,
   headers: Headers,
   url: string,
}

export type RouteHandler = (ctx: HandlerContext) => any | Promise<any>;
export type ComponentLoader = () => Promise<any> | any;