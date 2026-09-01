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

  const url = request.url();
  const headers = request.headers();
  const userAgent = request.header("User-Agent");
  const cookies = request.cookies();

  let users;
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
  <User user="{user}" />
  <button onclick="{deleteUser(user.id)}"></button>
</div>

<div>
  <input :name="value" />
  <input :email="value" />
</div>
<div :dialog="innerHtml"></div>
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

Converted Js:

```js
  import db from "#db";
  import User from "./User.av";
  import Dialog from "./Dialog.av";
  import { render,av_component } from "@aromix/view";

// Home.av.ts file
export default av_component(c => {
   let { request, onRender, self, actions, template } = c
   // ==== User Script Start ===
   const url = request.url();
   const headers = request.headers();
   const userAgent = request.header("User-Agent");
   const cookies = request.cookies();

   let users: any;
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

   actions.push({
      reference: deleteUser,
      readDeps: {
         parmeter: {
            id: {
               type: 'string'
            }
         },
      },
      writeDeps: {
         'self': {}
      },
      routeId: '12dfxyed34dh'
   })


   template = () => {
      const html: Array<object> = []


      for (user in users) {
         html.push({
            tag: 'div',
            childs: [

               {

                  type: 'componenet',
                  referance: users,
                  inputs: {
                     user: user
                  }
               },
               {
                  tag: 'button',
                  onclick: '12dfxyed34dh'
               },

            ]

         })


      }
      // same push with necessery if else for or other control flow
      return html
   }
})

```
