import { Vec } from "./vector";

export class Ball {
  pos: Vec;
  velocity: Vec;
  constructor(pos?: Vec) {
    this.pos = pos || new Vec();
    this.velocity = new Vec();  
  }
}