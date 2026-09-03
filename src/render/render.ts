import { AvComponent } from "../runtime/component";
import { templateToHtml } from "./templateToHtml";
import { RenderContext } from "./types";

export function render<
   Instance extends { SelfType: any, PropType: any },
   Expose extends object
>(
   component: AvComponent<Instance, Expose>,
   context: RenderContext<Instance['PropType']>
) {

   const self = structuredClone(component.SelfDefaults)
   const server = component.Server(self, context.request, () => context.props)
   const template = component.Template(server.expose);
   const html = templateToHtml(template)

   return {
      html,
      self,
      expose: server.expose,
      actions: server.actions,
      hooks: server.hooks
   }
}