import { trim } from "./utils";

export class Vec {
  x: number;
  y: number;
  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  };
  public trim(min_value: number, max_value: number) {
    return new Vec(trim(this.x, min_value, max_value), trim(this.y, min_value, max_value));
  };
  public div(a: number | Vec) {
    if(typeof a === 'number'){
      return new Vec(this.x / a, this.y / a);
    } else {
      return new Vec(this.x / a.x, this.y / a.y);
    }
  };
  public invert() {
    this.x = -1 * this.x
    this.y = -1 * this.y

  };
  public add(right: Vec) {
    return new Vec(this.x + right.x, this.y + right.y);
  };
  public add_to(right: Vec) {
    this.x += right.x;
    this.y += right.y;
  };
  public sub_to(right: Vec) {
    this.x -= right.x;
    this.y -= right.y;
  };
  public sub(right: Vec) {
    return new Vec(this.x - right.x, this.y - right.y);
  };
  public mult(value: number | Vec) {
    if(typeof value === 'number'){
      return new Vec(this.x * value, this.y * value);
    } else {
      return new Vec(this.x * value.x, this.y * value.y);
    }
  };
  public dot_mult(right: Vec) {
    return this.x * right.x + this.y * right.y;
  };
  public calc_dist(p2: Vec) {
    const p1 = this;
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
  };
  public calc_dist_vec(p2: Vec) {
    const p1 = this;
    const dist = new Vec(
      p2.x - p1.x,
      p2.y - p1.y
    )
    return dist;
  };
  public magnitude(){
    return Math.sqrt((this.x * this.x) + (this.y * this.y))
  }
}

