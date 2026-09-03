import { AromixHttpRequest } from "./router/request";

let recurse = true
// Input Code::
/*
<script server lang="ts">
    const { initial } = props<{ initial:number}>();

    function logValue() {
      console.log(request);
      console.log(self.number)
    }
</script>
<input :number="value"/>
 */
export default class Home {
  declare SelfType: { number: number }
  declare PropType: { initial: number }
  static SelfDefaults = { number: 0 }



  static c(props: Home['PropType']) {
    return {
      type: "component" as const,
      reference: Home,
      props,
    };
  }


  static Server(
    self: Home['SelfType'],
    request: AromixHttpRequest,
    props: Home['PropType']
  ) {

    const { initial } = props;
    function logValue() {
      console.log(request);
      console.log(self.number)
    }

    return {
      expose: {
        initial,
        logValue
      },
      hooks: [],
      actions: [
        {
          reference: logValue,
          readDeps: ['number'],
          token: 'act_log_value_123'
        }
      ]
    };
  }


  static Template(
    exposed: ReturnType<(typeof Home)['Server']>['expose']) {
    const { initial, logValue } = exposed
    const $html: Array<object> = []

    $html.push({
      type: "tag",
      name: "input",
      attributes: {
        value: initial,
        type: 'number',
        onchange: logValue
      },
      refs: [
        {
          identifier: 'number',
          target: 'value',
          uuid: '12345'
        }
      ]
    })


    if (recurse) {
      recurse = false
      $html.push(Home.c({ initial: 0 }))
    }
    return $html;
  }
}





// const output = render(Home, {
//   props: {
//     initial: 0
//   },
//   request: {}
// })

console.dir(Home.Template({
  initial: 0, logValue: () => console.log('test')
}), { depth: null });
