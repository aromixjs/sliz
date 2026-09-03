import { AromixHttpRequest } from "./router/request";
import { component } from "./runtime/component";

const $HomeSelfMeta = {
  number: {
    type: "number",
    from: "12345"
  },
}

interface $HomeSelf {
  number: number
}


function $HomeServerBlock(self: $HomeSelf, request: AromixHttpRequest, props: () => { initial: number }) {
  const { initial = 0 } = props();
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
}


function $HomeTemplateBlock(exposed: ReturnType<typeof $HomeServerBlock>['expose']) {
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

const Home = component($HomeSelfMeta, $HomeServerBlock, $HomeTemplateBlock)

Home