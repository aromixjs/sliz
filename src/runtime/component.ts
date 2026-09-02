export interface AvComponent<Self, Server, Template> {}

export function component<Self, Server, Template>(self: Self, server: Server, template: Template): AvComponent<Self, Server, Template> {
  const componentMeta = {}
  const internalKey = Symbol('Aromix:Component:Meta')
  Object.defineProperty(componentMeta, internalKey, {
    value: {
      self,
      server,
      template
    },
    enumerable: false,
    writable: false,
    configurable: false
  })

  return componentMeta
}
