export namespace AV {

  export interface Ctx {
    props: object;
    self: object;
    browser: object;
  }

  export interface Meta {
    html: () => Array<object>,
    meta: object
  }


  export interface Fn<Ctx extends AV.Ctx> {
    (c: Ctx): Promise<AV.Meta>
  }
}


