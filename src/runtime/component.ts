import { ComponentMeta } from "./types";

export async function component<
  Self extends object,
  Expose extends Record<string, any>,
  Input extends Maybe<object>,
>(meta: ComponentMeta<Self, Expose, Input>) {
  console.log(meta.id);
  console.log(meta.input);
  console.log(meta.self);
  const { self, input } = meta
  const exposed = await meta.server(self, {}, () => input)
  console.log(exposed);
  console.log(meta.template(exposed.expose));



}
