import { SlizParser, SlizTokenizer } from "@/src";

const tokens = new SlizTokenizer(`
<server></server>
   <div class="bg:red">
   <span .if={userId}>
   profile pic
   <img src="/pic"/>
   </span>
   users {user.name}
   </div>
`).tokenize();

console.dir(tokens, { depth: null });

const data = {
  async *run() {},
};
