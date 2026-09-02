import { component } from "./runtime/component";

component({
  id: "123",
  self: {
    user: "string",
  },
  input: {
    data: "ster",
  },
  server(self, request, input) {
    return {
      expose: {
        data: "10",
      },
      hooks: [],
    };
  },
  template(exposed) {
    return [];
  },
});
