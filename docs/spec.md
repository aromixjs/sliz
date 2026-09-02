# Aromix View

File Extension: `.av`

Its A file Format That Bridges Between Html's Client Side Capability With Server Side Logic with precise code & minimal boilerplate.

```html
<!--Home.av file-->
<script server lang="ts">
  import db from "#db";
  import User from "./User.av";
  import Dialog from "./Dialog.av";
  import { render } from "@aromix/view";

  let users: any[];
  onRender(async () => {
    const session = request.cookie("session");
    if (!session) {
      return request.redirect("/login");
    }
    users = await db.select().from("users").where({ session });
  });

  async function deleteUser(id: string) {
    await db.delete().from("users").where({ id });
    delete self.listItems[id];
  }

  async function createUser() {
    const userData = {
      email: self.email,
      name: self.name,
    };
    await db.insert("users").value(userData);
    self.dialog = render(Dialog, userData);
    self.name = "";
    self.email = "";
  }
</script>
<div .for="{user in users}" .key="{user.id}" :listItems="innerHtml">
  <User user="{user}" onDelete="{deleteUser}" />
</div>

<div>
  <input :name="value" />
  <input :email="value" />
</div>
<div :dialog="innerHtml"></div>
```
Converted Js:

```js
// Home.av.ts file
import db from "#db";
import User from "./User.av";
import Dialog from "./Dialog.av";
import { render, component } from "@aromix/view";

export default component((context) => {
  let { request, onRender, self } = context;
  // ==== User Script Start ===
  let users: any[];
  onRender(async () => {
    const session = request.cookie("session");
    if (!session) {
      return request.redirect("/login");
    }
    users = await db.select().from("users").where({ session });
  });

  async function deleteUser(id: string) {
    await db.delete().from("users").where({ id });
    delete self.listItems[id];
  }

  async function createUser() {
    const userData = {
      email: self.email,
      name: self.name,
    };
    await db.insert("users").value(userData);
    self.dialog = render(Dialog, userData);
    self.name = "";
    self.email = "";
  }

  // ==== User Script End ===
  return {
    template() {
      const html: Array<object> = [];
      for (user in users) {
        html.push({
          type: "tag",
          name: "div",
          key: user.id,
          childs: [
            {
              type: "component",
              reference: Users,
              inputs: {
                user: user,
                onDelete: deleteUser,
              },
            },
          ],
        });
      }

      html.push({
        type: "tag",
        name: "div",
        childs: [
          {
            type: "tag",
            name: "input",
          },
          {
            type: "tag",
            name: "input",
          },
        ],
      });

      html.push({
        type: "tag",
        name: "div",
        childs: [],
      });

      return html;
    },
    actions: [
      {
        reference: deleteUser,
        parameter: {
          id: {
            type: "string",
          },
        },
        readDeps: [],
        writeDeps: ["self.listItem"],
        routeId: "12dyed34dh",
      },

      {
        reference: createUser,
        parameter: {},
        readDeps: ["self.email", "self.name"],
        writeDeps: ["self.dialog", "self.name", "self.email"],
        routeId: "8ksj32jd9a",
      },
    ],
  };
});

```



Child Component:

```html
<!--User.av-->
<script server lang="ts">
  import UserModel from "#models";
  const { user, onDelete } = input<{
    user: typeof UserModel.$inferSelect;
    onDelete: Function;
  }>();
</script>
<div lay="card:user">
  <p>{user.id}</p>
  <p>{user.name}</p>
  <p>{user.email}</p>
  <button onclick="{onDelete(user.id)}"></button>
</div>
``` 