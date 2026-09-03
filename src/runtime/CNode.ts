import { AvComponent } from "./component";



export interface CNode<
   Instance extends { SelfType: any, PropType: any } = any,
   ServerExpose extends object = any
> {
   type: 'component',
   reference: AvComponent<Instance, ServerExpose>,
   props: Instance['PropType']
}


export function c<
   Instance extends { SelfType: any, PropType: any } = any,
   ServerExpose extends object = any
>(
   reference: AvComponent<Instance, ServerExpose>,
   props: Instance['PropType']
): CNode<Instance, ServerExpose> {

   return {
      type: 'component',
      reference,
      props
   }

}