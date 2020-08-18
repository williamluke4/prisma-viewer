import { Vec } from "./vector";
import { Model } from './model';
import { getFieldY } from './utils';
import { FIELD_HEIGHT, STRING_LEN } from './constants';

export function drawSpline(ctx: CanvasRenderingContext2D ,start: Vec, end: Vec){
  const dist =  start.calc_dist(end)
  ctx.beginPath()
  ctx.moveTo(start.x || 0, start.y || 0)
  ctx.bezierCurveTo(
    start.x + dist * 0.4 || 0, // cp1 x
    start.y || 0, // cp1 y
    end.x - dist * 0.4 || 0, // cp2 x
    end.y || 0, // cp2 y
    end.x || 0, // end x
    end.y || 0
  ), //
  ctx.stroke()
}

export class Connection {
  from_model_idx: number;
  to_model_idx: number;
  from_field_idx: number;
  to_field_idx: number;
  length: number;
  constructor(
    from_model_idx: number,
    to_model_idx: number,
    from_field_idx: number,
    to_field_idx: number) {
      this.from_model_idx = from_model_idx
      this.to_model_idx = to_model_idx
      this.from_field_idx = from_field_idx
      this.to_field_idx = to_field_idx
      this.length = length || STRING_LEN 
  }
  public draw(ctx: CanvasRenderingContext2D, models: Model[]){
    let a = models[this.from_model_idx];
    let b = models[this.to_model_idx];
    const start = a.pos.copy()
    const end = b.pos.copy()
    end.y = end.y + (FIELD_HEIGHT * (2 + this.to_field_idx))
    start.y = start.y + (FIELD_HEIGHT * (2 + this.from_field_idx))
    start.x = start.x + a.width

    drawSpline(ctx, start, end)
  }
}