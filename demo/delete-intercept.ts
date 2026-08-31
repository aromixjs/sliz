interface List {
   userList: { [key: string]: string }
}


function createDeepProxy(target: any, path: string[] = []) {
   return new Proxy(target, {
      get(obj, prop, receiver) {
         console.log(`[GET] Accessed property: '${String(prop)}' (Path: ${[...path, String(prop)].join('.')})`);
         const value = Reflect.get(obj, prop, receiver);

         // If the accessed property is an object, wrap it in a proxy too!
         if (value !== null && typeof value === 'object') {
            return createDeepProxy(value, [...path, String(prop)]);
         }

         return value;
      },

      deleteProperty(obj, prop) {
         console.log(`[DELETE] Deleted property: '${String(prop)}' (Path: ${[...path, String(prop)].join('.')})`);
         return Reflect.deleteProperty(obj, prop);
      },

      set(obj, prop, newValue, receiver) {
         console.log(`[SET] Changed property: '${String(prop)}' to '${newValue}' (Path: ${[...path, String(prop)].join('.')})`);
         return Reflect.set(obj, prop, newValue, receiver);
      },
      has(target, prop) {
         console.log(`[HAS] Checked if property exists: '${String(prop)}'`);
         return Reflect.has(target, prop);
      },

      ownKeys(target) {
         console.log(`[OWN_KEYS] Requested object keys`);
         return Reflect.ownKeys(target);
      },

      defineProperty(target, prop, descriptor) {
         console.log(`[DEFINE] Defined property: '${String(prop)}'`);
         return Reflect.defineProperty(target, prop, descriptor);
      },


      getOwnPropertyDescriptor(target, prop) {
         console.log(`[DESCRIPTOR] Requested descriptor for: '${String(prop)}'`);
         return Reflect.getOwnPropertyDescriptor(target, prop);
      }
   })
}

const self = createDeepProxy({
   userList: {
      'key1': 'data',
      'text':{
         uDate: '123'
      }
   }
})

// const key = 'key1'
// delete self.userList[key]


self.userList['text'].uDate='2454'

console.log(self);
