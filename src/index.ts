import { component } from "./runtime/component";

component({
  id: "123",
  self: {
    number: {
      type: "number",
      from: "12345"
    },
  },
  props: {
    initial: {
      type: 'number',
      required: false
    },
  },
  server(self, request, input) {
    const { initial = 0 } = input();
    function logValue() {
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
  },
  template({ initial, logValue }) {
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
  },
});
