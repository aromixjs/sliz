import { getRouterParams, H3, } from "h3";
import { Router } from "./router";
import { unit } from "@aromix/core";
import { serve } from "h3/node";
import { HandlerContext } from "./handler";

export interface ViewConfig {
   name: string
   port: number,
   host: string,
   routes: Router[]
}

export function view(config: ViewConfig) {
   const app = new H3()
   const routeMeta = config.routes.flatMap(r => r.routes)
   const rpcRegistry = new Map<string, object>()
   for (const route of routeMeta) {

      app.get(route.path, async (event) => {
         const ctx: HandlerContext = {
            params: getRouterParams(event),
            query: new URLSearchParams(event.req.url),
            headers: event.req.headers,
            url: event.req.url
         }


         if (route.type === 'render' && route.loader) {
            const mod = await route.loader()
            return mod;
         } else if (route.type === 'handle' && route.handler) {
            return await route.handler(ctx)
         }

      })

   }




   let server: ReturnType<typeof serve>;
   return unit({
      name: config.name,
      start() {
         server = serve(app, { port: config.port, hostname: config.host })
      },
      stop() {
         if (server) {
            server.close()
         }
      }

   })


}