# Aromix View

File Extension: `.av`

Aromix View is a file format that bridges HTML's client-side capabilities with type-safe server-side logic using a compile-time namespace architecture, maintaining zero client-side component footprint and minimal runtime overhead.

## 1. Component

Source File (`home.av`)

```html
<script server lang="ts">
  const { initial } = props<{ initial: number }>();

  function logValue() {
    console.log(request);
    console.log(self.number);
  }
</script>
<input :number="value" />
```

Compiled Typescript Output(`Home.av.ts`):

```ts
import { AromixHttpRequest } from "@aromix/view";

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
        p:{}
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

  export function Server(
    self: SelfType,
    request: AromixHttpRequest,
    props: PropType,
  ) {
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

export default Home;
```
