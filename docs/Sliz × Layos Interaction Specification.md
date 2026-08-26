# Sliz × Layos Interaction Specification

### Sliz

Sliz is the compile-time template compiler.

It:

- compiles HTML-like syntax into typed TypeScript objects;
- generates typed `ref` targets;
- resolves server action bindings;
- generates the Layos metadata required by the compiled view.

Sliz has no browser runtime.

### Layos

Layos is the runtime.

It:

- handles browser interactions;
- dispatches RPC actions;
- collects declared action inputs;
- resolves compiled targets;
- applies server-produced effects to the DOM;
- executes `lay` tokens.



## 2. Sliz References

References use:

```html
ref:<name> ="<kind>"
```

Example:

```html
<input ref:userEmail="value">
<p ref:status="innerText">
<div ref:content="innerHTML">
<dialog ref:dialog="dialog">
```

Sliz generates typed references:

```ts
Home.userEmail
Home.status
Home.content
Home.dialog
```

The `kind` determines the reference's type and runtime behavior.

A reference is an addressable target, not a DOM object.


## 3. Actions

Server actions declare only the browser values required before RPC.

```ts
const save = action({
    input: [
        Home.userEmail
    ],

    async run(c) {
        const user = await db.user.findByEmail(c.userEmail);

        if (!user) {
            Home.status = "User not found";
            Home.dialog = "open";
            return;
        }

        await db.user.update({ id: user.id });

        Home.status = "Saved";
        Home.content = renderUser(user);
        Home.dialog = "close";
    }
});
```

`input` is only for RPC inputs.

Outputs are not declared.

An action may target any compiled reference, including references belonging to unrelated components.

## 4. Input Resolution

Before RPC, Layos resolves every item in `input`.

```ts
input: [
    Home.userEmail
]
```

produces a request containing only that value.

Unlisted browser state is not transferred.

---

## 5. Server Outputs

Server actions may produce effects by assigning to typed references:

```ts
Home.status = "Saved";
Home.content = html;
Home.dialog = "open";
```

The operation is determined by the reference kind.

Layos is responsible for converting these effects into browser operations.

The action does not directly manipulate the DOM.


## 6. Missing Targets

If a server output targets an element that is not mounted in the current page/session, Layos ignores that effect.

This does not fail the action.

## 7. Layos `lay` Attribute

`lay` remains the only declarative language for client-side behavior.

```html
<button lay="click:ripple">
```

```html
<button lay="click:ripple dialog:[click:toggle]">
```

Sliz server actions do not modify or generate `lay` values as their application-level output mechanism.

---

## 8. Interaction Flow

```text
Sliz template
    ↓
compiled typed representation
    ↓
Layos
    ↓
browser event
    ↓
RPC with declared inputs
    ↓
server action
    ↓
server-produced effects
    ↓
Layos
    ↓
DOM
```

## 9. Core Invariants

1. Sliz is compile-time only.
2. Layos is the sole browser runtime.
3. `ref` creates typed addressable targets.
4. `input` explicitly defines RPC inputs.
5. Outputs require no declaration.
6. Actions may target unrelated components.
7. Missing output targets are ignored.
8. `lay` remains the client-side behavior language.