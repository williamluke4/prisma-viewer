import { Vec } from "./vector";
import { FIELD_HEIGHT } from './constants';

export function trim(x: number, min_value: number, max_value: number) {
  return Math.min(Math.max(x, min_value), max_value);
}
interface Postion {
  x: number;
  y: number;
}
export function dist<T extends Postion>(a: T, b: T) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
export function system_time() {
  return new Date().getTime() / 1000;
}

export function my_rand(min: number, max: number) {
  let r = Math.random();
  //r=r%1000;
  return r * (max - min) + min;
}
export function getFieldY(modelPos: Vec, field_idx: number){
  return modelPos.y + (FIELD_HEIGHT * (field_idx + 1))
}