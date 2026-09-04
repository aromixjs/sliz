# What User Writes vs What Compiler Generates

## Example 1: Counter

### User writes:

```html
<!-- pages/counter.html -->
<script server>
  // Server: no data needed for counter
</script>

<script client>
  let count = {{ initial || 0 }}
  let label = {{ 'Count' }}
</script>

<div class="counter">
  <span>{{ label }}: {{ count }}</span>
  <button on:click="count--">−</button>
  <button on:click="count++">+</button>
</div>
```

### Compiler generates:

```typescript
// Server bundle
export const counter = view({
  props: v.object({
    initial: v.number().default(0),
    label: v.string().default("Count"),
  }),

  async prepare(c) {
    return {};
  },

  render(data) {
    let count = $state(data.initial);
    let label = $state(data.label);

    return document
      .component()
      .class("counter")
      .child(document.element("span").text(`${label()}: ${count()}`))
      .child(
        document
          .element("button")
          .text("−")
          .on("click", () => count.set(count() - 1)),
      )
      .child(
        document
          .element("button")
          .text("+")
          .on("click", () => count.set(count() + 1)),
      );
  },
});
```

---

## Example 2: Todo List

### User writes:

```html
<!-- pages/todos.html -->
<script server>
  const todos = await ctx.db.findMany('todos', {
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' }
  })
</script>

<script client>
  let newTodo = "";
  let filter = "all";

  function addTodo() {
    if (!newTodo.trim()) return;
    $emit("add", { text: newTodo });
    newTodo = "";
  }

  function deleteTodo(id) {
    $emit("delete", { id });
  }

  function toggleTodo(id) {
    $emit("toggle", { id });
  }
</script>

<div class="todo-list">
  <div class="input-group">
    <input
      type="text"
      placeholder="Add todo..."
      bind:value="newTodo"
      on:keydown.enter="addTodo()"
    />
    <button on:click="addTodo()">Add</button>
  </div>

  <div class="filters">
    <button class:active="filter === 'all'" on:click="filter = 'all'">All</button>
    <button class:active="filter === 'active'" on:click="filter = 'active'">Active</button>
    <button class:active="filter === 'completed'" on:click="filter = 'completed'">Completed</button>
  </div>

  <ul>
    {{#each todos as todo}}
    <li class:done="todo.done">
      <input type="checkbox" checked="{{ todo.done }}" on:change="toggleTodo(todo.id)" />
      <span>{{ todo.text }}</span>
      <button on:click="deleteTodo(todo.id)">×</button>
    </li>
    {{/each}}
  </ul>
</div>
```

### Compiler generates:

```typescript
export const todos = view({
  props: {},

  async prepare(c) {
    const todos = await c.db.findMany("todos", {
      where: { userId: c.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { todos };
  },

  render(data) {
    let newTodo = $state("");
    let filter = $state("all");

    function addTodo() {
      if (!newTodo()) return;
      $emit("add", { text: newTodo() });
      newTodo.set("");
    }

    function deleteTodo(id) {
      $emit("delete", { id });
    }

    function toggleTodo(id) {
      $emit("toggle", { id });
    }

    return document
      .component()
      .class("todo-list")
      .child(
        document
          .element("div")
          .class("input-group")
          .child(
            document
              .element("input")
              .attr("type", "text")
              .attr("placeholder", "Add todo...")
              .bind("value", newTodo)
              .on("keydown", (e) => {
                if (e.key === "Enter") addTodo();
              }),
          )
          .child(document.element("button").text("Add").on("click", addTodo)),
      )
      .child(
        document
          .element("div")
          .class("filters")
          .child(
            document
              .element("button")
              .class("active", filter() === "all")
              .text("All")
              .on("click", () => filter.set("all")),
          )
          .child(
            document
              .element("button")
              .class("active", filter() === "active")
              .text("Active")
              .on("click", () => filter.set("active")),
          )
          .child(
            document
              .element("button")
              .class("active", filter() === "completed")
              .text("Completed")
              .on("click", () => filter.set("completed")),
          ),
      )
      .child(
        document.element("ul").each(data.todos, (todo) =>
          document
            .element("li")
            .class("done", todo.done)
            .child(
              document
                .element("input")
                .attr("type", "checkbox")
                .checked(todo.done)
                .on("change", () => toggleTodo(todo.id)),
            )
            .child(document.element("span").text(todo.text))
            .child(
              document
                .element("button")
                .text("×")
                .on("click", () => deleteTodo(todo.id)),
            ),
        ),
      );
  },
});
```

---

## Example 3: User Profile

### User writes:

```html
<!-- pages/profile.html -->
<script server>
  const user = await ctx.db.findOne('users', { id: ctx.params.id })
  const stats = await ctx.db.query(`
      SELECT
          COUNT(DISTINCT t.id) as todoCount,
          COUNT(DISTINCT CASE WHEN t.done = true THEN t.id END) as completedCount
      FROM todos t
      WHERE t.userId = ?
  `, [user.id])
</script>

<script client>
  let showEditModal = false
  let editName = {{ user.name }}
  let editEmail = {{ user.email }}

  function openEdit() {
      editName = {{ user.name }}
      editEmail = {{ user.email }}
      showEditModal = true
  }

  function saveEdit() {
      $emit('update', { name: editName, email: editEmail })
      showEditModal = false
  }

  function deleteAccount() {
      if (confirm('Are you sure?')) {
          $emit('delete', { userId: {{ user.id }} })
      }
  }
</script>

<div class="user-profile">
  <div class="avatar-section">
    <img src="{{ user.avatar || '/default-avatar.png' }}" alt="{{ user.name }}" />
    <div class="user-info">
      <h2>{{ user.name }}</h2>
      <p class="email">{{ user.email }}</p>
      <span class:verified="user.isVerified">
        {{ user.isVerified ? '✓ Verified' : 'Unverified' }}
      </span>
    </div>
  </div>

  <div class="stats-section">
    <div class="stat">
      <span class="stat-value">{{ stats.todoCount }}</span>
      <span class="stat-label">Total Todos</span>
    </div>
    <div class="stat">
      <span class="stat-value">{{ stats.completedCount }}</span>
      <span class="stat-label">Completed</span>
    </div>
    <div class="stat">
      <span class="stat-value">{{ stats.todoCount - stats.completedCount }}</span>
      <span class="stat-label">Pending</span>
    </div>
  </div>

  <div class="actions">
    <button on:click="openEdit()">Edit Profile</button>
    <button class="danger" on:click="deleteAccount()">Delete Account</button>
  </div>
</div>

{{#if showEditModal}}
<div class="modal-overlay" on:click.self="showEditModal = false">
  <div class="modal">
    <h3>Edit Profile</h3>
    <form on:submit.prevent="saveEdit()">
      <div class="form-group">
        <label>Name</label>
        <input type="text" bind:value="editName" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" bind:value="editEmail" />
      </div>
      <div class="form-actions">
        <button type="button" on:click="showEditModal = false">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  </div>
</div>
{{/if}}
```

### Compiler generates:

```typescript
export const profile = view({
  props: {
    userId: v.string(),
  },

  async prepare(c) {
    const user = await c.db.findOne("users", { id: c.params.id });
    const stats = await c.db.query(
      `
            SELECT 
                COUNT(DISTINCT t.id) as todoCount,
                COUNT(DISTINCT CASE WHEN t.done = true THEN t.id END) as completedCount
            FROM todos t
            WHERE t.userId = ?
        `,
      [user.id],
    );

    return { user, stats };
  },

  render(data) {
    let showEditModal = $state(false);
    let editName = $state(data.user.name);
    let editEmail = $state(data.user.email);

    function openEdit() {
      editName.set(data.user.name);
      editEmail.set(data.user.email);
      showEditModal.set(true);
    }

    function saveEdit() {
      $emit("update", { name: editName(), email: editEmail() });
      showEditModal.set(false);
    }

    function deleteAccount() {
      if (confirm("Are you sure?")) {
        $emit("delete", { userId: data.user.id });
      }
    }

    return document
      .component()
      .class("user-profile")
      .child(
        document
          .element("div")
          .class("avatar-section")
          .child(
            document
              .element("img")
              .attr("src", data.user.avatar || "/default-avatar.png")
              .attr("alt", data.user.name),
          )
          .child(
            document
              .element("div")
              .class("user-info")
              .child(document.element("h2").text(data.user.name))
              .child(document.element("p").class("email").text(data.user.email))
              .child(
                document
                  .element("span")
                  .class("verified", data.user.isVerified)
                  .text(data.user.isVerified ? "✓ Verified" : "Unverified"),
              ),
          ),
      )
      .child(
        document
          .element("div")
          .class("stats-section")
          .child(
            document
              .element("div")
              .class("stat")
              .child(document.element("span").class("stat-value").text(data.stats.todoCount))
              .child(document.element("span").class("stat-label").text("Total Todos")),
          )
          .child(
            document
              .element("div")
              .class("stat")
              .child(document.element("span").class("stat-value").text(data.stats.completedCount))
              .child(document.element("span").class("stat-label").text("Completed")),
          )
          .child(
            document
              .element("div")
              .class("stat")
              .child(
                document
                  .element("span")
                  .class("stat-value")
                  .text(data.stats.todoCount - data.stats.completedCount),
              )
              .child(document.element("span").class("stat-label").text("Pending")),
          ),
      )
      .child(
        document
          .element("div")
          .class("actions")
          .child(document.element("button").text("Edit Profile").on("click", openEdit))
          .child(
            document
              .element("button")
              .class("danger")
              .text("Delete Account")
              .on("click", deleteAccount),
          ),
      )
      .if(showEditModal(), (modal) =>
        modal.child(
          document
            .element("div")
            .class("modal-overlay")
            .on("click", (e) => {
              if (e.target === e.currentTarget) {
                showEditModal.set(false);
              }
            })
            .child(
              document
                .element("div")
                .class("modal")
                .child(document.element("h3").text("Edit Profile"))
                .child(
                  document
                    .element("form")
                    .on("submit", (e) => {
                      e.preventDefault();
                      saveEdit();
                    })
                    .child(
                      document
                        .element("div")
                        .class("form-group")
                        .child(document.element("label").text("Name"))
                        .child(
                          document.element("input").attr("type", "text").bind("value", editName),
                        ),
                    )
                    .child(
                      document
                        .element("div")
                        .class("form-group")
                        .child(document.element("label").text("Email"))
                        .child(
                          document.element("input").attr("type", "email").bind("value", editEmail),
                        ),
                    )
                    .child(
                      document
                        .element("div")
                        .class("form-actions")
                        .child(
                          document
                            .element("button")
                            .attr("type", "button")
                            .text("Cancel")
                            .on("click", () => showEditModal.set(false)),
                        )
                        .child(document.element("button").attr("type", "submit").text("Save")),
                    ),
                ),
            ),
        ),
      );
  },
});
```

---

## Example 4: Product Card

### User writes:

```html
<!-- components/product-card.html -->
<script server>
  const product = await ctx.db.findOne('products', {
      where: { id: productId },
      include: { variants: true, reviews: true }
  })

  const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0
</script>

<script client>
  let selectedVariant = {{ product.variants[0] || null }}
  let quantity = 1
  let activeImage = 0

  function selectVariant(variant) {
      selectedVariant = variant
      quantity = 1
  }

  function increaseQuantity() {
      if (quantity < selectedVariant?.stock) quantity++
  }

  function decreaseQuantity() {
      if (quantity > 1) quantity--
  }

  function addToCart() {
      $emit('addToCart', {
          productId: {{ product.id }},
          variantId: selectedVariant?.id,
          quantity
      })
  }
</script>

<div class="product-card">
  <div class="image-gallery">
    <div class="main-image">
      <img src="{{ product.images[activeImage] }}" alt="{{ product.name }}" />
    </div>
    {{#if product.images.length > 1}}
    <div class="thumbnails">
      {{#each product.images as img, index}}
      <img src="{{ img }}" class:active="activeImage === index" on:click="activeImage = index" />
      {{/each}}
    </div>
    {{/if}}
  </div>

  <div class="product-info">
    <h2 class="product-name">{{ product.name }}</h2>

    <div class="rating">
      <span class="stars">{{ '★'.repeat(Math.round(averageRating)) }}</span>
      <span class="count">({{ product.reviews.length }})</span>
    </div>

    <div class="price">
      <span class="current">${{ selectedVariant?.price || product.basePrice }}</span>
      {{#if selectedVariant?.compareAtPrice}}
      <span class="compare">${{ selectedVariant.compareAtPrice }}</span>
      {{/if}}
    </div>

    {{#if product.variants.length > 0}}
    <div class="variants">
      <label>Size:</label>
      <div class="variant-options">
        {{#each product.variants as variant}}
        <button
          class="variant-btn"
          class:selected="selectedVariant?.id === variant.id"
          disabled="{{ variant.stock === 0 }}"
          on:click="selectVariant(variant)"
        >
          {{ variant.name }}
        </button>
        {{/each}}
      </div>
    </div>
    {{/if}}

    <div class="quantity">
      <label>Quantity:</label>
      <div class="quantity-controls">
        <button on:click="decreaseQuantity()" disabled="{{ quantity <= 1 }}">−</button>
        <span>{{ quantity }}</span>
        <button
          on:click="increaseQuantity()"
          disabled="{{ quantity >= (selectedVariant?.stock || 0) }}"
        >
          +
        </button>
      </div>
    </div>

    <div class="actions">
      <button
        class="add-to-cart"
        disabled="{{ !selectedVariant || selectedVariant.stock === 0 }}"
        on:click="addToCart()"
      >
        {{ selectedVariant?.stock > 0 ? 'Add to Cart' : 'Out of Stock' }}
      </button>
    </div>

    <div class="description">
      <h3>Description</h3>
      <p>{{ product.description }}</p>
    </div>
  </div>
</div>
```

### Compiler generates:

```typescript
export const productCard = view({
  props: {
    productId: v.string(),
  },

  async prepare(c) {
    const product = await c.db.findOne("products", {
      where: { id: c.params.productId },
      include: { variants: true, reviews: true },
    });

    const averageRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

    return { product, averageRating };
  },

  render(data) {
    let selectedVariant = $state(data.product.variants[0] || null);
    let quantity = $state(1);
    let activeImage = $state(0);

    function selectVariant(variant) {
      selectedVariant.set(variant);
      quantity.set(1);
    }

    function increaseQuantity() {
      if (quantity() < (selectedVariant()?.stock || 0)) {
        quantity.set(quantity() + 1);
      }
    }

    function decreaseQuantity() {
      if (quantity() > 1) {
        quantity.set(quantity() - 1);
      }
    }

    function addToCart() {
      $emit("addToCart", {
        productId: data.product.id,
        variantId: selectedVariant()?.id,
        quantity: quantity(),
      });
    }

    return document
      .component()
      .class("product-card")
      .child(
        document
          .element("div")
          .class("image-gallery")
          .child(
            document
              .element("div")
              .class("main-image")
              .child(
                document
                  .element("img")
                  .attr("src", data.product.images[activeImage()])
                  .attr("alt", data.product.name),
              ),
          )
          .if(data.product.images.length > 1, (gallery) =>
            gallery.child(
              document
                .element("div")
                .class("thumbnails")
                .each(data.product.images, (img, index) =>
                  document
                    .element("img")
                    .attr("src", img)
                    .class("active", activeImage() === index)
                    .on("click", () => activeImage.set(index)),
                ),
            ),
          ),
      )
      .child(
        document
          .element("div")
          .class("product-info")
          .child(document.element("h2").class("product-name").text(data.product.name))
          .child(
            document
              .element("div")
              .class("rating")
              .child(
                document
                  .element("span")
                  .class("stars")
                  .text("★".repeat(Math.round(data.averageRating))),
              )
              .child(
                document.element("span").class("count").text(`(${data.product.reviews.length})`),
              ),
          )
          .child(
            document
              .element("div")
              .class("price")
              .child(
                document
                  .element("span")
                  .class("current")
                  .text(`$${selectedVariant()?.price || data.product.basePrice}`),
              )
              .if(selectedVariant()?.compareAtPrice, (p) =>
                p.child(
                  document
                    .element("span")
                    .class("compare")
                    .text(`$${selectedVariant().compareAtPrice}`),
                ),
              ),
          )
          .if(data.product.variants.length > 0, (v) =>
            v.child(
              document
                .element("div")
                .class("variants")
                .child(document.element("label").text("Size:"))
                .child(
                  document
                    .element("div")
                    .class("variant-options")
                    .each(data.product.variants, (variant) =>
                      document
                        .element("button")
                        .class("variant-btn")
                        .class("selected", selectedVariant()?.id === variant.id)
                        .attr("disabled", variant.stock === 0)
                        .text(variant.name)
                        .on("click", () => selectVariant(variant)),
                    ),
                ),
            ),
          )
          .child(
            document
              .element("div")
              .class("quantity")
              .child(document.element("label").text("Quantity:"))
              .child(
                document
                  .element("div")
                  .class("quantity-controls")
                  .child(
                    document
                      .element("button")
                      .text("−")
                      .attr("disabled", quantity() <= 1)
                      .on("click", decreaseQuantity),
                  )
                  .child(document.element("span").text(quantity()))
                  .child(
                    document
                      .element("button")
                      .text("+")
                      .attr("disabled", quantity() >= (selectedVariant()?.stock || 0))
                      .on("click", increaseQuantity),
                  ),
              ),
          )
          .child(
            document
              .element("div")
              .class("actions")
              .child(
                document
                  .element("button")
                  .class("add-to-cart")
                  .attr("disabled", !selectedVariant() || selectedVariant().stock === 0)
                  .text(selectedVariant()?.stock > 0 ? "Add to Cart" : "Out of Stock")
                  .on("click", addToCart),
              ),
          )
          .child(
            document
              .element("div")
              .class("description")
              .child(document.element("h3").text("Description"))
              .child(document.element("p").text(data.product.description)),
          ),
      );
  },
});
```

---

## Syntax Reference

### What user writes:

```html
<!-- Server script -->
<script server>
  const data = await ctx.db.query(...)
</script>

<!-- Client script -->
<script client>
  let variable = value
  function handler() { ... }
</script>

<!-- Template -->
<div class:name="condition">
  {{ variable }} {{#each items as item}}
  <li>{{ item.name }}</li>
  {{/each}} {{#if condition}}
  <div>...</div>
  {{/if}}

  <input bind:value="variable" />
  <button on:click="handler()">Click</button>
</div>
```

### What compiler generates:

```typescript
// Document builder API
document
  .component()
  .class("name", condition)
  .child(
    document
      .element("div")
      .text(variable)
      .each(items, (item) => document.element("li").text(item.name))
      .if(condition, (el) => el.child(document.element("div").text("...")))
      .bind("value", variable)
      .on("click", handler),
  );
```
