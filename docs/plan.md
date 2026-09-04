# Aromix

Aromix is a server-side framework where the central idea is that an application is a process first, not a web server first.

Most frameworks assume you're building an HTTP app and bolt everything else onto that assumption.

Aromix flips that. You start a process, and HTTP is just one of the things that can plug into that process, alongside a database connection, a background worker, or anything else your app needs. Nothing is privileged as "the" entry point.

Everything that plugs into that process is treated the same way: a self-contained thing that knows how to start and how to stop. That's the one and only primitive in Aromix. It doesn't matter whether it's a web server, a database, or something entirely custom to Aromix; it all looks the same, and everything is built on top of that.

This is deliberate instead of Aromix having a growing list of special-cased subsystems (a "server module," a "database module," and so on), it has one shape that everything conforms to, and the framework's job is just to start these things in the right order and shut them down cleanly.

---

Here's how that looks in code.

You define a unit first, that self-contained primitive the framework can load:

```ts
import { unit } from "@aromix/core";

export const httpUnit = unit({
  name: "http",
  async start() {
    /* start logic in here */
  },
  async stop() {
    /* stop logic in here */
  },
});
```

Once a unit is defined, it just needs to be registered with the program that starts everything:

```ts
import { httpUnit } from "./http";

const host = program();
host.register(httpUnit);

/* start all the units in serial */
await host.start();
```

This is the core orchestrating mechanism everything else in Aromix, is built on top of it.

## The View Unit

Serving and rendering views is not a special case bolted onto Aromix. it's just another unit under the hood, one that happens to own routing and rendering instead of, say, a database connection.

But you don't need to build that unit by hand the way you did with `httpUnit`. Instead, there is a `view()` function that takes care of all the routing/rendering wiring internally, and hands you back a regular unit at the end:

```ts
import { view } from "@aromix/view";

export const taskViewUnit = view({
  routes: [{ path: "/tasks", render: () => import("./views/task-list.sliz") }],
});
```

Under the hood, `view()` is doing something like this,

setting up a router, wiring it to your routes, and returning that as a unit so it fits into the same registration mechanism as everything else

```ts
function view(config) {
  const server = createHttpServer();
  /* Wire up all the config */

  return unit({
    name: "view",
    async start() {},
    async stop() {},
  });
}
```

You never have to write that wiring yourself, you just call `view({...})` and register what it gives back, exactly the same way you registered httpUnit earlier: `host.register(taskViewUnit)`.

This is where Sliz and Layos enter the picture, because `.sliz` is what those view files are written in, and Layos is how they become interactive.

## Sliz

Sliz is the templating layer it's how you actually write a view. The core decision behind it is that a view should never be split across a server file and a client file.

In most frameworks, the same feature ends up living in two places: server code that fetches data and handles the request, and client code that reacts to it and updates the page.

Sliz collapses that into one file, written once, that looks like HTML.

```tsx
function removeTask(taskId) {
  db.tasks.delete(taskId);
}

const HomePage = sliz!{
  <button onclick="{removeTask}"></button>
}

```

sliz! is a macro that converts that inner HTML-like syntax into a plain JS object at compile time.

Which will contain properties and methods for two things: hold enough structure to produce HTML from it, and carry whatever else is required to make the handler/RPC wiring work correctly.

There's a runtime server-side function that uses that object to produce HTML on request, and sends the generated HTML to the client everything else stays server side, and the browser never even knows `removeTask` exists.

`onclick={removeTask}` points the button directly at that function. When someone clicks it, it's the server function that runs.

This is possible because a `sliz!` macro doesn't compile into "a page plus separate client code" it compiles into something the server runs to produce HTML, along with whatever internal bookkeeping is needed to connect the interactive parts of that html back to the real server functions behind them. Conceptually, that might look something like:

```ts
const Homepage = {
    tag: "div",
    attributes: {
        lay: "click:task_remove_a1b2c3"
        id: buttonId
    }
    children: []
};
```

Notice `onclick={removeTask}` became `lay="click:task_remove_a1b2c3"` in the output.

That's the seam where Sliz hands off to Layos. Sliz never ships any client behavior of its own, so whatever needs to happen in the browser gets expressed as a Layos token instead.

There is also another syntax that is also equally good

```html
<server> // all server js code function removeTask(taskId) { db.tasks.delete(taskId); } </server>
<button onclick="{removeTask}"></button>
```

the final output will be the same whihc ever becomes cleaner to implment the html templateing is still the same .

## Layos

Layos is the counterpart to Sliz. it's what governs anything that has to genuinely live in the browser, such as:

- how something looks
- how something responds to interaction

Rather than treating those as two separate systems (CSS for one, JavaScript event handlers for the other), Layos treats them as the same kind of thing, expressed the same way, directly on the element.

You set Layos up by giving it the tokens it should recognize and a root element to operate under:

```ts
import { layos } from "@aromix/layos";
import { bg, dialog, toggle } from "./tokens";

const app = layos({
  tokens: [bg, dialog, toggle],
  target: "#app",
});
```

A token is a small, named unit of behavior. Here's a real token `bg`, which sets a background color:

```ts
import { token } from "@aromix/layos";

export const bg = token({
  key: "bg",
  values: ["primary", "secondary", "danger", "success", "dark", "muted"],
  run({ element, value }) {
    const colors = {
      primary: "#3b82f6",
      secondary: "#6b7280",
      danger: "#ef4444",
      success: "#22c55e",
      dark: "#1e293b",
      muted: "#374151",
    };
    if (value && colors[value]) {
      element.style.backgroundColor = colors[value];
    }
  },
});
```

When Its Used on an element, it reads like a style: `<button lay="bg:danger"></button>`.That `key:value` shape is the whole grammar.

a token can also take nested tokens as `key:[...]` instead of a value.

One thing to note is that it's not a CSS-only framework. It's driven by JavaScript, so it can do things that CSS alone cannot:

```html
<button lay="click:ripple dialog:[click:toggle]"></button>
```

This is also the mechanism what carries Sliz's interactivity into the browser.

Going back to the compiled Sliz output above `lay="click:task_remove_a1b2c3"`.

that's a token exactly like `bg:danger`, just generated by the compiler instead of handwritten, and pointing at a server route instead of a fixed value.

The click flow looks like this:

The user clicks the button, Layos resolves the click token, that calls back into the server, and the real removeTask function runs on the server, exactly as written in the `.sliz` file.

That's the full loop.

Aromix starts and owns the process, a view unit renders a Sliz file into HTML, and Layos is what makes anything on that HTML actually respond to the person using it, whether that response is purely visual or reaches all the way back to server logic.
