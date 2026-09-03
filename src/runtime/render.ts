import { AvComponent, ComponentKey } from "./component";

export function render<Self, Server, Template>(component: AvComponent<Self, Server, Template>) {

   component[ComponentKey].server()

}