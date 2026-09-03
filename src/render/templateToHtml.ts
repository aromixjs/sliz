export function templateToHtml(nodes: Array<any>) {
   return nodes.map(node => {
      const attributes = Object.entries(node.attributes).map(([key, value]) => {
         return `${key}="${value}"`
      }).join(" ")

      let children = '';
      if (node.childs) {
         children = templateToHtml(node.childs)
      }
      let open = `<${node.name}>`
      if (attributes) {
         open = `<${node.name} ${attributes}>`
      }

      return `${open}${children}</${node.name}>`
   }).join("")
}