
import { AV } from "./av.type";

export async function render<Ctx extends AV.Ctx>(avfn: AV.Fn<Ctx>, ctx: Ctx) {
  const res = await avfn(ctx)
  const html = render.toHtml(res.html())
  return {
    res,
    html
  };
}




render.toHtml = (nodes: Array<any>) => {
  return nodes
    .map((node) => {
      const attributes = Object.entries(node.attributes)
        .map(([key, value]) => {
          return `${key}="${value}"`;
        })
        .join(" ");

      let children = "";
      if (node.childs) {
        children = render.toHtml(node.childs);
      }
      let open = `<${node.name}>`;
      if (attributes) {
        open = `<${node.name} ${attributes}>`;
      }

      return `${open}${children}</${node.name}>`;
    })
    .join("");
}
