# Sliz

the server is the main place where the application lives, and the browser should not require a second application architecture just to make the interface interactive.

The important part is that the server function should be directly usable from a view:

```ts
sliz!{
    <button onclick={db.addUser()}>
        Add user
    </button>
}
```

There should not have to be a separate REST endpoint, a client action, a client store, or a second copy of the business logic just to make that interaction work.

The difficult part is not calling the server function. The difficult part is what happens after it runs.

If the server changes something, Sliz needs a way to update exactly the right part of the browser without keeping a full server-side UI state, without rebuilding the whole page, and without forcing the developer to write a large amount of synchronization code.

# The core problem

A server action can do arbitrary server work:

```ts
async function addUser() {
    await db.users.create(...);
    await queue.publish(...);
    await cache.set(...);
    await webhook.send(...);
}
```

The action is not tied to a database. It can call any server-side primitive that the application owns.

Sliz needs to answer two separate questions to make that server action usable.

First:

```text
What client values does this interaction/action need and where to get that?
```

Second:

```text
What part of the client UI needs to change after that action ?
```

The first problem exists because browser-owned values are not automatically available on the server.

The second problem exists because the server must be able to precisely update the browser without storing a previous UI tree and diffing it against a new one.

These two problems are related, but they should not automatically be solved by one large state-management system.

Things that i tried:

# First approach: LiveView-style server state

The first obvious solution is to keep a live server-side representation for every connected UI.

The model is very clean from the developer side:

```text
browser
    ↕ websocket
server-side live context
    ├── state
    ├── event handlers
    └── rendered UI
```

The developer can read state, change state, and let the framework update the browser.

That gives the experience that is attractive about LiveView.

The problem is that the server now has a long-lived per-client state model.

A Node process is shared by many unrelated users, so the framework has to isolate that state per connection or per session.

That creates a persistent memory cost per connected client and creates lifecycle, reconnect, garbage collection, horizontal scaling, and broadcast problems.

The larger the state retained per connection, the worse this becomes.

This is still a valid architecture, but it conflicts with the goal of keeping the server lightweight and not turning the Node process into a giant collection of per-user UI applications.

---

# Second approach: server-side signals and reactive state

Another possibility is to make the server reactive.

A template reads a signal:

```ts
const count = signal(0);
```

and an action changes it:

```ts
count.set(1);
```

The framework knows which rendered parts depend on the signal.

This works well for client-side applications because the application instance and its state are naturally scoped to one browser.

It is a poor default for a Node server because the process itself is long lived and serves many users.

A global signal would become shared state:

```text
Node process
    └── signal
         ├── user A
         ├── user B
         └── user C
```

Putting signals into a connection/session context fixes the isolation problem, but then the framework has recreated a server-side state system with another layer of machinery.

The underlying problem remains the same: server-side reactivity assumes a persistent owner for the state.

Sliz should not make signals the fundamental primitive.

---

# Third approach: resource and invalidation graphs

Another approach is to make every server resource observable.

A UI fragment reads:

```text
User(123)
```

and later some action changes:

```text
User(123)
```

The runtime finds all fragments that depend on that resource and rerenders them.

This can be implemented with dynamic dependency tracking, self-adjusting computation, incremental computation, or a resource/version graph.

The model is powerful, but the hard problem moves into the runtime.

The runtime has to know:

```text
what changed
what depends on it
what needs to rerun
what data needs to be recomputed
```

For arbitrary server-side code, knowing what an opaque operation changed is fundamentally difficult.

If an action calls a third-party API, queue, webhook, cache, or arbitrary function, the runtime cannot infer all semantic effects unless those primitives participate in a shared effect system.

Since Aromix controls many core primitives, an integrated resource system is possible, but it is a much larger runtime model than the original Sliz goal requires.

It risks turning Sliz into another reactive framework.

---

# Fourth approach: explicit action wiring

The next approach was to make the server action explicitly describe both the data it needs from the UI and the UI it can update.

For example:

```ts
const deleteUser = action({
  email: Homepage.select("email"),

  async run(c) {
    const validatedEmail = validateEmail(c.email);

    await mailer.sendMail({
      to: validatedEmail,
      body: EmailTemplate,
    });

    Homepage.select("div1").innerText("Email Sent Successfully");
  },
});
```

The UI update side can also be expressed directly:

```ts
MyComponent.select("status").text("Saved");

MyComponent.select("banner").html(msg);

MyComponent.select("link").attr("href", newUrl);

MyComponent.select("badge").removeAttr("hidden");

MyComponent.select("row").class("active", true);

MyComponent.select("row").class("active", false);

MyComponent.select("spinner").show();

MyComponent.select("spinner").hide();

MyComponent.select("email").value("");

MyComponent.select("submit").disabled(true);
```

And collections can use the same mechanism:

```ts
MyComponent.select("items").insert({
  id: 9,
  name: "Widget",
  qty: 1,
});

MyComponent.select("items").remove(itemId);

MyComponent.select("items").update(itemId, {
  qty: 3,
});

MyComponent.select("items").move(itemId, 0);
```

This solves the underlying synchronization problem directly.

The server does not have to discover what changed. The action explicitly identifies what it needs and what it wants to change. Because the exact target and operation are already known, there is no need for a server-side DOM snapshot, VDOM, or general UI diffing.

It also provides precise typing if `select()` is compiler-aware and knows the valid references and their supported operations.

The problem is that all of this precision has to be written manually.

Every action becomes responsible for wiring together:

```text
UI input
    ↓
action input

action
    ↓
UI target
    ↓
UI operation
```

That creates a large amount of boilerplate. A complex action may need data from several unrelated components and may update several unrelated parts of the UI, making the wiring spread across the action definition and the component tree.

The `select()` calls also become verbose and too close to a remote DOM API:

```ts
MyComponent.select("items").update(...)
MyComponent.select("status").text(...)
MyComponent.select("email").value(...)
```

The same problem appears on the input side. Explicit action dependencies effectively turn the action into a manually defined RPC contract.

This goes against the main Sliz goal:

> write as little code as possible while still being precise, understandable, flexible, maintainable, and scalable.

So although this approach is technically sound and gives very precise behavior, it was rejected because **the precision is being purchased with too much explicit wiring**. The problem is not that the mechanism cannot work; the problem is that too much of the mechanism becomes application code.

# Fifth approach: bind the UI values to the action

Another version is:

```html
<input .bind="{deleteUserAction.user}" />
```

and:

```html
<select .bind="{deleteUserAction.address}"></select>
```

This solves transport automatically.

The browser knows what values to send when the action is invoked.

The problem is discoverability and scale.

A large action might have bindings scattered across unrelated components:

```text
Action A
    ← Component X
    ← Component Y
    ← Component Z
    ← Component W
```

Now finding the data contract of an action requires searching the whole UI tree.

It also creates ambiguity when multiple elements bind to the same key.

It is precise but creates a hidden many-to-many relationship.

It is therefore not a good long-term foundation for large applications.

---

# Sixth approach: form/data scopes

A more structured version of binding is a logical data scope:

```html
<section .data="{checkout}">...</section>
```

and descendant inputs contribute to that data.

This is much more structured than scattered bindings and follows the HTML form model.

The problem is that the DOM hierarchy is not necessarily the application's data hierarchy.

Complex applications routinely have logically related data in components that are structurally unrelated.

For example:

```text
Dashboard
    Header
        AccountSelector

    Sidebar
        Filters

    Main
        Table
            Selection

    Toolbar
        Export
```

One operation may need all four.

A form-like hierarchy does not naturally represent that relationship.

It can be extended with explicit associations, but then the framework starts accumulating another layer of grouping rules which is more or less the same as Fifth approach.

---

# Seventh approach: server-side component instances

Another option is to make every rendered component a server-side object.

The object contains its children and exposes typed references to its UI.

Then:

```ts
page.status.text("Saved");
```

works naturally.

This gives very good developer ergonomics because the code feels like manipulating normal objects.

It also solves the problem of component factories returning multiple independent instances.

The problem is that the server is again maintaining a live UI object graph.

That starts moving Sliz back toward Vaadin/LiveView-style stateful server components.

It is clean, but it gives up too much of the lightweight server model.

---

# Eighth approach: remote UI objects

Another possibility is to keep the logical UI object on the server and the real DOM on the browser.

The server holds object identity:

```text
page.status → client object 17
```

but does not hold the DOM state.

Operations on the remote object produce messages.

This is cleaner than a raw DOM API and has precedents in remote UI systems.

The problem is that it still introduces a remote object model and a set of object lifecycle rules.

If browser state is also mirrored into remote objects, the system starts producing two representations of the same UI state.

That is exactly what should be avoided.

The useful idea is only the remote identity, not replicated UI state.

---

# Ninth approach: client/server tier splitting

Another idea is to let the compiler inspect an action and automatically discover which expressions are client values and which are server expressions.

The compiler then splits the action into a client part and a server part.

This is a real research area: tierless programming and program slicing have explored the idea of writing a single program and compiling it across execution locations.

The problem for Sliz is complexity.

The compiler now needs to understand arbitrary TypeScript dataflow and determine what must exist on each side.

That is much larger than the Sliz compiler should be.

It also introduces client/server separation into the programming model, which is contrary to the architectural goal of Sliz.

It should not be the primary mechanism.

---

# Tenth approach: client-side state/model/store

A typical SPA solves the cross-component data problem with a store:

```text
store
├── filters
├── selection
├── current user
├── editor
└── dashboard
```

Components read and mutate that state.

This is effective for complex client applications.

The problem is that it creates a second application architecture.

Sliz's goal is specifically to avoid requiring a separate client application with its own state management, actions, effects, and synchronization rules.

Recreating a store inside Sliz would defeat part of the original reason for Sliz.

---

# Eleventh approach: snapshots and hydration

Another way to make a stateless server feel stateful is to send a serialized representation of the UI/application state and reconstruct it on every request.

This is the general family used by systems such as Livewire-style hydration.

The server does not have to retain the state permanently because the state comes back from the client.

The problem is the size and complexity of the snapshot.

It creates:

```text
serialization
hydration
validation
versioning
snapshot compatibility
network overhead
```

and it creates a client-side representation of server state that has to be trusted and reconciled.

This is the opposite of the minimal protocol Sliz should aim for.

---

# 12th approach: on-demand browser reads

Another idea is to let server code request a browser value only when it actually needs it.

Conceptually:

```ts
const value = ctx.client.someInput.value;
```

The runtime can suspend the action, ask the browser for the value, and resume the action.

This is useful because it does not require persistent server-side client state.

It also avoids action-level dependency declarations.

The problem is latency.

If the value was not included in the triggering event, the server needs another WebSocket round trip.

This can be batched and optimized, but it remains a network operation.

It is useful as an escape hatch, but it should not become the normal interaction model.

---

# 13th approach: event streams as the whole application interface

Another idea is to make events the primary abstraction.

Instead of actions directly updating UI, an operation produces domain/application events:

```text
UserCreated
OrderCreated
OrderPaid
FilterChanged
```

The UI is a projection of those events.

This is fundamentally different from explicit UI commands because the action does not know which UI consumes the event.

The benefit is decoupling.

The problem is that eventually the projection still needs some mechanism for knowing which UI depends on which event/data.

If that turns into another manually declared dependency graph, the original problem returns.

If it becomes an incremental projection engine, it becomes much more complicated.

This is promising as a research direction, but it should not be adopted just to avoid the explicit command API.

---

# 14th approach: materialized UI projections

A stronger version of the event-stream idea treats UI fragments like materialized database views.

A view reads data:

```text
CartView
    reads cart.items
    reads cart.total
```

The system maintains the projection.

When cart data changes:

```text
CartChanged
    ↓
CartView
    ↓
affected fragment
```

The action does not know about the UI.

The view owns its own dependency information.

This reverses the direction of the relationship.

Instead of:

```text
action → UI
```

it becomes:

```text
UI projection ← server data/events
```

This is much cleaner conceptually for global synchronization and unrelated actions.

The main problem is implementation complexity if applied to arbitrary TypeScript.

It effectively becomes a selective incremental computation system.

That may be worth exploring underneath Sliz, but not as a new developer-facing programming model.

---

# 15th approach: event provenance

Another research direction is to track not only dependencies but the provenance of values.

A rendered value could carry lineage:

```text
UI value
    ← UserUpdated(123)
    ← Query result
    ← projection
```

When an event happens, the system can follow provenance to determine affected output.

This is related to database provenance and dataflow lineage.

It potentially solves a broader problem than simple resource invalidation because the runtime can reason about where a value originated.

The downside is that provenance tracking can become expensive and complicated.

It is an interesting research mechanism, not a good public API.

---

# What all of these approaches have in common

Almost every architecture eventually chooses where one of these relationships lives:

```text
client value
      ↓
server action

server change
      ↓
UI output
```

Possible places are:

```text
1. server state
2. client state
3. snapshots
4. explicit action declarations
5. UI bindings
6. DOM/form grouping
7. compiler analysis
8. dependency graphs
9. event/projection graphs
10. remote object references
```

There is no implementation where the relationship contains zero information.

The real design goal is therefore not to make the relationship disappear.

The goal is to put it in the place that requires the least code, is easiest to understand, and remains predictable at scale.
