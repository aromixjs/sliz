import { ComponentLoader, RouteHandler } from "./handler";

export interface RouteRecord {
   path: string;
   type: "render" | "handle";
   loader?: ComponentLoader;
   handler?: RouteHandler;
}

export interface RouterConfig {
   prefix: string
}

export class Router {
   public readonly routes: Array<RouteRecord> = []

   constructor(private config: RouterConfig) { }

   on(path: string) {
      const fullPath = this.config?.prefix + path

      const render = (loader: ComponentLoader) => {
         this.routes.push({ path: fullPath, type: "render", loader });
      }


      const handle = (handler: RouteHandler) => {
         this.routes.push({ path: fullPath, type: "handle", handler });
      }

      return { render, handle }
   }

}


export function router(config: RouterConfig = { prefix: '' }) {
   return new Router(config)
}
