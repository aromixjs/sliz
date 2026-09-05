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

```ts
import { program } from "@aromix/core";
import { render } from "@aromix/view";

interface HomeCtx {
  props: { initial: number };
  self: { number: string };
  browser: {};
}

export async function Home(c: HomeCtx) {
  const { props, self } = c;
  //----- user code -----
  const { initial } = props;

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
  };
}

const output = await render(Home, {
  props: { initial: 0 },
  self: {} as any,
  browser: {},
});

console.dir(output, { depth: null });
```

```ts

tag List(list:List[]){

.for(list in lists){
  <p>{list.name}</p>
}

<p :text="innerText"></p>
<button onclick={updateText}></button>





}


action updateText(){

List.text = "updated"


}


class Home {



public mount(users:string[]){

}


 readonly view=av!{





 }




class Home {









}

}

```
