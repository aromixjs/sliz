import { render } from "./render/render";
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
interface HomeCtx {
  props: { initial: number };
  self: { number: string };
  browser: {};
}

export default async function Home(c: HomeCtx) {
  //----- user code -----
  const { initial } = c.props;

  function logValue() {
    console.log(self.number);
  }

  //----- end user code ----

  const meta = {
    actions: {
      act_log_value_123: {
        ref: logValue,
        self: {
          number: {
            target: "12345",
            extract: "value",
          },
        },
      },
    },
  };

  const html = () => {
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
  };


  return {
    html,
    meta,
  }
}

const output = await render(Home, {
  props: {
    initial: 0,
  },
  self: {} as any,
  browser: {}
});



console.dir(output, { depth: null })
