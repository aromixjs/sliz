# Aromix View

File Extension: `.av`

Its A file Format That Bridges Between Html's Client Side Capability With Server Side Logic with precise code & minimal boilerplate.

```html
<!--Home.av file-->
<script server lang="ts">
  import db from "#db";
  import User from "./User.av";
  import { render } from "@aromix/view";

  const url = request.url();
  const headers = request.headers();
  const userAgent = request.header("User-Agent");
  const cookies = request.cookies();

  let users;
  onRender(async () => {
    const session = request.cookie("session");
    users = await db.select().from("users").where({ session });
  });

  onMount(() => {});

  async function deleteUser(id: string) {
    await db.delete().from("users").where({ id });
    delete self.listItems[id];
  }

  async function createUser() {}
</script>
<div .for="{user in users}" .key="{user.id}" :listItems="innerHtml">
  <User user="{user}" />
  <button onclick="{deleteUser(user.id)}"></button>
</div>
```

```html
<!--User.av-->
<script server lang="ts">
  import UserModel from "#models";
  const { user } = input<{ user: typeof UserModel.$inferSelect }>();
</script>
<div lay="card:user">
  <p>{user.id}</p>
  <p>{user.name}</p>
  <p>{user.email}</p>
</div>
```
