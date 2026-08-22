# Sliz

Sliz is trying to keep the same core idea as the rest of Aromix: the server is the main place where the application lives, and the browser should not require a second application architecture just to make the interface interactive.

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

That is the actual problem this document is about.

---

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

After it finishes, Sliz needs to answer two separate questions.

First:

```text
What client values does this interaction need?
```

Second:

```text
What part of the client UI needs to change?
```

The first problem exists because browser-owned values are not automatically available on the server.

The second problem exists because the server must be able to precisely update the browser without storing a previous UI tree and diffing it against a new one.

These two problems are related, but they should not automatically be solved by one large state-management system.

---

# What the ideal solution needs to provide

The developer experience should feel close to normal server programming.

The developer should be able to write a normal TypeScript function and call normal application code:

```ts
async function deleteUser() {
    const user = await db.users.get(...);

    await mailer.sendMail(...);

    ...
}
```

The browser should be able to call that function directly from the template.

The server should be able to update a precise part of the browser without returning an entire page.

The update should not require a virtual DOM or a previous server-side HTML snapshot.

The system should work when the relevant UI is split across many components.

The data an action needs should not have to be manually wired together in many unrelated templates.

The API should be small enough that developers do not have to learn another state-management framework.

The mechanism should work with ordinary TypeScript rather than requiring a new DSL for application logic.

The server should not keep unrelated users' UI state in global process state.

The solution should also be predictable: when something is changed, it should be obvious what will happen and where the data comes from.

---

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

# Fourth approach: explicit DOM-command API

The next approach is to stop trying to discover changes.

The server action simply says what to update.

For example:

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

Collection operations can also be explicit:

```ts
MyComponent.select("items").insert({
    id: 9,
    name: "Widget",
    qty: 1
});

MyComponent.select("items").remove(itemId);

MyComponent.select("items").update(itemId, {
    qty: 3
});

MyComponent.select("items").move(itemId, 0);
```

This has a major advantage.

There is no diffing.

The developer has already specified the exact mutation.

The browser receives a compact command and applies it directly.

There is no server DOM snapshot and no VDOM.

This is actually a strong architecture for the server-to-client direction.

The problems are mainly API ergonomics and client-input discovery.

The command API can become verbose and too close to the DOM.

The server also needs typed references to elements/components, not just strings:

```ts
MyComponent.select("status")
```

is only type safe if the compiler knows that `"status"` exists and what kind of target it is.

A string selector can solve runtime addressing, but it does not give the type safety desired for Sliz.

---

# Fifth approach: explicit action dependencies

The next idea was to make actions explicitly describe what they need.

For example:

```ts
const deleteUser = action({
    email: Homepage.select("email"),

    async run(c) {
        const validatedEmail = validateEmail(c.email);

        await mailer.sendMail({
            to: validatedEmail,
            body: EmailTemplate
        });

        Homepage.select("div1").innerText(
            "Email Sent Successfully"
        );
    }
});
```

This is precise.

The runtime knows exactly what to send to the server.

The runtime also knows what the action is allowed to update.

There is no dependency inference problem.

The problem is that the dependency declaration becomes another API layer.

For a large application, the same action can need data from many places:

```text
Header
Sidebar
Table
Filter panel
Dialog
another component
```

The action then becomes a wiring point between unrelated parts of the UI.

That makes the action contract precise but the application structure harder to understand.

There is also the problem of actions taking arguments.

The more the action becomes a structured RPC declaration, the more Sliz starts to resemble a manually authored API system.

That conflicts with the goal of being able to write a small amount of normal TypeScript.

---

# Sixth approach: bind the UI values to the action

Another version is:

```html
<input .bind={checkout.address}>
```

and:

```html
<select .bind={checkout.shipping}>
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

# Seventh approach: form/data scopes

A more structured version of binding is a logical data scope:

```html
<section .data={checkout}>
    ...
</section>
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

It can be extended with explicit associations, but then the framework starts accumulating another layer of grouping rules.

---

# Eighth approach: server-side component instances

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

# Ninth approach: remote UI objects

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

# Tenth approach: client/server tier splitting

Another idea is to let the compiler inspect an action and automatically discover which expressions are client values and which are server expressions.

The compiler then splits the action into a client part and a server part.

This is a real research area: tierless programming and program slicing have explored the idea of writing a single program and compiling it across execution locations.

The problem for Sliz is complexity.

The compiler now needs to understand arbitrary TypeScript dataflow and determine what must exist on each side.

That is much larger than the Sliz compiler should be.

It also introduces client/server separation into the programming model, which is contrary to the architectural goal of Sliz.

It should not be the primary mechanism.

---

# Eleventh approach: client-side state/model/store

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

# Twelfth approach: snapshots and hydration

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

# Thirteenth approach: on-demand browser reads

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

# Fourteenth approach: event streams as the whole application interface

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

# Fifteenth approach: materialized UI projections

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

# Sixteenth approach: event provenance

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

---

# What the ideal Sliz solution should look like

The ideal mechanism should have these properties.

It should keep the programmer in normal TypeScript.

An action should look like a normal function, not a second RPC DSL.

The developer should not have to manually list dependencies for every action.

The developer should not have to scatter bindings across unrelated components.

A component should be able to expose useful data without knowing which future action will consume it.

The action should be able to precisely obtain the data it needs without maintaining a server-side snapshot.

The UI update should be precise without requiring a DOM diff.

UI references should be typed and compiler-checked instead of arbitrary strings.

Multiple instances of the same component should remain independent.

An action should be allowed to produce multiple UI changes in one execution.

A server event, webhook, queue event, or background operation should be able to participate in the same mechanism.

There should be one primary way to solve the problem rather than a collection of `bind`, `model`, `scope`, `resource`, `signal`, `deps`, `invalidate`, and DOM APIs.

The runtime should not need to know the application's business logic.

The mechanism should not require a second client-side application architecture.

The mechanism should not require a full server-side UI snapshot.

The mechanism should minimize persistent per-user server memory.

The protocol should be able to work over WebSocket efficiently.

---

# The current conclusion

The command-based UI update mechanism is still a good primitive.

The problem is the way it was being exposed.

This:

```ts
MyComponent.select("status").text("Saved");

MyComponent.select("items").update(itemId, {
    qty: 3
});
```

is precise, but it is too verbose to be the normal application programming model.

The same applies to explicit action dependency declarations.

The next design should therefore try to keep these as **runtime primitives**, not user-facing concepts.

The public API should be much closer to ordinary TypeScript.

The current research direction that seems most promising is to find a way for the compiler/runtime to associate typed UI references with ordinary execution contexts while keeping the actual transport primitives underneath.

The core architectural distinction should remain:

```text
Server
    owns application truth

Browser
    owns actual DOM/UI state

Protocol
    carries events and precise updates

Sliz
    makes that protocol feel like normal server-side TypeScript
```

The solution should not try to make the server pretend it owns the browser UI, and it should not try to make the browser become another copy of the server application.

The best solution is likely to be a very small abstraction that sits exactly at the boundary between **server execution** and **browser interaction**, rather than adding another state system on either side.

---

# The design test

Any future Sliz mechanism should be judged against one example like this:

```ts
function Dashboard() {
    return sliz! {
        <Header />
        <Sidebar />
        <Table />
        <Toolbar />
    }
}
```

A toolbar action may need:

```text
Header.account
Sidebar.filters
Table.selection
```

and after executing server code it may need to change:

```text
Toolbar.status
Table.rows
Header.notification
```

The solution should allow that with:

```text
very little code
```

while making it obvious:

```text
where the input comes from
what the action changes
```

without requiring:

```text
a server UI snapshot
a client state store
an action dependency schema
scattered bindings
full TypeScript AST analysis
or a large new DSL
```

That is the actual bar Sliz needs to meet.

The existing approaches all solve parts of the problem, but each one pays for it by adding either server state, client state, explicit wiring, compiler complexity, or transport overhead. The next iteration should therefore not be another variation of one of those approaches. It should change the location where the relationship is represented.
