export const ComponentKey = Symbol('Aromix:Component:Key')
export interface AvComponent<Self, Server, Template> {
  [ComponentKey]: {
    self: Self,
    server: Server,
    template: Template
  }
}

export function component<
  Self extends object,
  Server,
  Template>(self: Self, server: Server, template: Template): AvComponent<Self, Server, Template> {
  const componentMeta = {
    [ComponentKey]: {
      self,
      server,
      template
    }
  }



  return componentMeta
}
