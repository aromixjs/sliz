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
namespace Home {
  export interface SelfType {
    number: number;
  }
  export interface PropType {
    initial: number;
  }
  export const SelfDefaults: SelfType = { number: 0 };

  export const ClientMeta = {
    actions: {
      act_log_value: {
        s: { number: "12345:value" },
        p: { userId: "user.id" },
      },
    },
  };

  export function c(props: PropType) {
    return {
      type: "component" as const,
      reference: Home,
      props,
    };
  }

  export function Server(self: SelfType, request: AromixHttpRequest, props: PropType) {
    const { initial } = props;
    function logValue() {
      console.log(request);
      console.log(self.number);
    }

    return {
      expose: {
        initial,
        logValue,
      },
      hooks: [],
      actions: {
        logValue: "act_log_value",
      },
    };
  }

  export function Template(exposed: ReturnType<typeof Server>["expose"]) {
    const { initial, logValue } = exposed;
    const $html: Array<object> = [];

    $html.push({
      type: "tag",
      name: "input",
      attributes: {
        value: initial,
        type: "number",
        onchange: logValue,
      },
      refId: "12345",
    });

    return $html;
  }
}

const output = render(Home, {
  props: {
    initial: 0,
  },
  request: {},
});
console.dir(output, { depth: null });

console.dir(
  Home.Template({
    initial: 0,
    logValue: () => console.log("test"),
  }),
  { depth: null },
);




declare function dc(...args: any): any


dc((c) => {









},{

props:{
  
}




})