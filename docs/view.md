```ts
interface HomeCtx {
  props: { name: string };
  self: { number: string };
  browser: {};
}

export default async function (c: HomeCtx) {
  //----- user code -----
    const { initial } = c.props;

    function logValue() {
      console.log(request);
      console.log(self.number);
    }

  //----- end user code ----

  const meta = {
    actions: {
      act_log_value_123: {
        ref: logValue
        self: {
          number: {
            target: "12345",
            extract: "value",
          },
        },
      },
    },
  };

  const view = () => {
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
    view,
    meta,
  }
}
```
