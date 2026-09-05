export * from './net/handler';
export * from './net/router';
export * from './net/view.unit';
export * from './render/av.type';
export * from './render/render';

class Home {

   users: string[]
   constructor(users: string[]) {
      this.users = users
   }




   render() {

      return {
         users: this.users




      }





   }



}