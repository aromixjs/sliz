export interface ComponentContext {
   self: Record<string, any>
   actions: Array<{
      reference: Function,
      readDeps: Record<string, any>,
      writeDeps: Record<string, any>,
      routeId: string
   }>,
   request: Record<string, any>
   template: () => Array<object>,
   input: any
   onRender: Function
}

export function av_component(callBack: (ctx: ComponentContext) => void) {


}

declare const db: any
declare function render(...args: any): void
declare const Dialog: any


const Home = av_component(c => {
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