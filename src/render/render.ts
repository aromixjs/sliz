import { AvComponent } from "../runtime/component";
import { templateToHtml } from "./templateToHtml";
import { RenderContext } from "./types";

export function render<
  Prop extends object = any,
  Self extends object = any,
  Expose extends object = any,
>(component: AvComponent<Prop, Self, Expose>, context: RenderContext<Prop>) {
  const self = structuredClone(component.SelfDefaults);
  const server = component.Server(self, context.request, context.props);
  const template = component.Template(server.expose);
  const html = templateToHtml(template);

  return {
    html,
    self,
    expose: server.expose,
    actions: server.actions,
    hooks: server.hooks,
  };
}
