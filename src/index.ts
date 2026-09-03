import { render } from "./render/render";
import { AromixHttpRequest } from "./router/request";


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
export class Home {
  declare SelfType: { number: number }
  declare PropType: { initial: number }

  static SelfMeta = {
    number: {
      type: "number",
      from: "12345"
    },
  }

  static SelfDefaults = {
    number: 0
  }



  static Server(
    self: Home['SelfType'],
    request: AromixHttpRequest,
    props: () => Home['PropType']
  ) {

    const { initial } = props();
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
      actions: []
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
    return $html;
  }
}





const output = render(Home, {
  props: {
    initial: 0
  },
  request: {}
})

console.dir(output, { depth: null });
