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

---

```ts
MyComponent.select("items").insert({ id: 9, name: "Widget", qty: 1 });
MyComponent.select("items").insert({ id: 10, name: "Gadget", qty: 1 }, "start");
MyComponent.select("items").remove(itemId);
MyComponent.select("items").update(itemId, { qty: 3 });
MyComponent.select("items").move(itemId, 0);
MyComponent.select("items").reorder([id3, id1, id2]);
```

---

```tsx

const deleteUser = action({
    email: Homepage.select('email'),

    async run(c) {
        const validatedEmail = validateEmail(c.email)
        await mailer.sendMail({
            to: validatedEmail,
            body: EmailTemplate
        })

        Homepage.select('div1').innerText("Email Sent Successfully")
    }

})

const HomePage = sliz!{
    <div class="card" class={isActive}>
    <h3>{product.name}</h3>
    <p>{displayPrice}</p>
    <input ref="email">
    <div ref="div1" .if={Homepage.select('div1').innerText}></div>
    <button .if={condition} onclick={addToCart}>Add</button>
    <button onclick={deleteUser}></button>
  </div>
}

```
