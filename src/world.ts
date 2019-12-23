/*globals _:false */
"use strict";

import { Vec } from "./vector";
import { chain } from "lodash";
import { Timer } from "./timer";
import { my_rand, dist } from "./utils";
import { Spring } from "./spring";
import { STRING_LEN, NUM_STEPS } from "./constants";
import { Model } from './model';
import { DMMF } from '@prisma/generator-helper';

const WIDTH = 100
const HEIGHT = 120

interface MyTouch {
  identifier: number;
  pageX: number;
  pageY: number;
  dragged_model: number;
  dragged_model_offset: Vec;
  timer: Timer;
  last_pos: Vec;
}

export class World {
  origin: number;
  models:  Model[];
  radius: number;
  springs: Spring[];
  canvas: HTMLCanvasElement;
  timer: Timer;
  hover_model: number;
  dragged_model: number;
  dragged_model_offset: Vec;
  ongoingTouches: MyTouch[];
  num_touch_start: number;
  datamodel: DMMF.Datamodel;
  ctx: CanvasRenderingContext2D | null;

  constructor(canvasid: string, datamodel: DMMF.Datamodel) {
    this.origin = 0;
    this.timer = new Timer();
    this.timer.mark_time()Zz;
    this.models = [] ;
    this.radius = 40;
    this.springs = []
    this.datamodel = datamodel
    this.canvas = document.getElementById(canvasid) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")

    this.hover_model = -1;
    this.dragged_model = -1;
    this.dragged_model_offset = new Vec();
    this.ongoingTouches = [];
    this.num_touch_start = 0;
    this.init_world();
    this.attach_handlers();
  }
  public init_rand = (model: Model) => {
    model.pos.x = my_rand(WIDTH, this.canvas.width - model.width);
    model.pos.y = my_rand(HEIGHT, this.canvas.height - model.height);
    model.velocity.x = my_rand(-1, 1);
    model.velocity.y = my_rand(1, 2);
  }
  public loadConnections(){
    const loadedRelations: string [] = []
    const connections:  number[][] = []

    this.datamodel.models.forEach((model: DMMF.Model, i: number) => {
      model.fields.forEach((field: DMMF.Field) => {
        if(field.kind === 'object' && field.relationName && !loadedRelations.includes(field.relationName)){
          loadedRelations.push(field.relationName)
          const to = this.datamodel.models.findIndex(m => m.name === field.type)
          if(typeof to === 'number') connections.push([i, to])
          
        }
      })
    })
    return connections;
  }
  public init_world = () => {
    const connections = this.loadConnections()
    connections.forEach(conn => this.springs.push(new Spring(conn[0], conn[1])))
    for (let i = 0; i < this.datamodel.models.length; i++) {
      const prismaModel = this.datamodel.models[i]
      let p = new Model(this.canvas.getContext("2d"), prismaModel);
      this.init_rand(p);
      this.models.push(p);
    }
  }

  public get_dragged_indexes = () => {
    return chain(this.ongoingTouches)
      .map("dragged_model")
      .push(this.dragged_model)
      .without(-1)
      .value();
  }

  public animate = () => {
    if (this.timer.time_diff === 0) return; //not enought time has passed, dont animate-crach fix
    if (this.models.length === 0) return;
    let new_models = calc_new_frame(
      this.models,
      this.springs,
      this.radius,
      this.timer,
      this.canvas.width,
      this.canvas.height
    );
    let dragged = this.get_dragged_indexes();
    dragged.forEach((drag, x) => {
      new_models[x] = this.models[x]; //when dragging, dissregard animate results for dragged model
    });
    this.models = new_models;
  }

  public find_model = (point: Vec) => {
    return this.models.findIndex(x => {
      const d = dist(point, x.center())
      return d < x.width || d < x.height
    });
  }

  public point_from_event = (event: MouseEvent) => {
    let rect = this.canvas.getBoundingClientRect();
    return new Vec(event.clientX - rect.left, event.clientY - rect.top);
  }

  // public mouseup = () => {
  //   this.dragged_model = -1;
  // }

  // public mousedown = (event: MouseEvent) => {
  //   let mousedown_point = this.point_from_event(event);
  //   this.dragged_model = this.find_model(mousedown_point);
  //   if (this.dragged_model == -1) this.models.push(new Model(this.canvas.getContext("2d"), {} ,mousedown_point));
  //   else {
  //     this.dragged_model_offset = this.models[this.dragged_model].pos.sub(
  //       mousedown_point
  //     );
  //   }
  // }

  // public mousemove = (event: MouseEvent) => {
  //   let mouse_point = this.point_from_event(event);
  //   if (this.dragged_model != -1) {
  //     let mouse_speed = new Vec(event.movementX, event.movementY);
  //     let newpoint = this.point_from_event(event);
  //     this.models[this.dragged_model].pos = newpoint.add(
  //       this.dragged_model_offset
  //     );
  //     this.models[this.dragged_model].velocity = mouse_speed.mult(20);
  //     this.draw();
  //     return;
  //   }
  //   this.hover_model = this.find_model(mouse_point);
  // }

  public draw = () => {
    this.timer.mark_time();
    this.animate();
    this.origin += 10;
    if (this.origin > 500) this.origin = 10;
    let ctx = this.ctx;
    if (ctx) {
      ctx.canvas.width = window.innerWidth;
      ctx.canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle =  "rgb(244, 248, 250)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.models.forEach((model, i) => {
        console.log(model);
        model.render(ctx, this.hover_model === i, this.dragged_model === i)
      })

      ctx.setLineDash([4, 4]);
      this.springs.forEach((spring, i) => {
        let a = this.models[spring.from_model_idx];
        let b = this.models[spring.from_model_idx];
        ctx.beginPath();
        ctx.moveTo(a.cx(), a.cy());
        ctx.lineTo(b.cx(), b.cy());
        ctx.stroke();
      })
    } else {
      console.error("Canvas Context Not Found");
    }
  }

  public attach_handlers = () => {
    // this.canvas.addEventListener("mouseup", this.mouseup, false);
    // this.canvas.addEventListener("mousemove", this.mousemove, false);
    // this.canvas.addEventListener("mousedown", this.mousedown, false);
    setInterval(this.draw, 30);
  }
}
function calc_new_frame(
  models: Model[],
  springs: Spring[],
  radius: number,
  timer: Timer,
  width: number,
  height: number
) {
  let num_models = models.length;
  let is_colide = false;

  function wall_power2(pos: number, size: number, wall_pos: number) {
    //todo: use speed to calc friction
    if (pos + size > wall_pos) {
      is_colide = true;
      return -(pos + size - wall_pos) * 1000;
    }
    if (pos - size < 0) {
      is_colide = true;
      return -(pos - size) * 1000;
    }
    return 0;
  }

  function wall_power(p: Model) {
    let ans = new Vec();
    is_colide = false;
    ans.x = wall_power2(p.center().x, p.width/2, width);
    ans.y = wall_power2(p.center().y, p.height/2, height);
    if (is_colide) ans.sub_to(p.velocity.mult(10));
    return ans;
  }

  function calc_collide_power(p1: Model, p2: Model, dist: Vec) {
    const collision_x_dist = p1.width/2 + p2.width/2
    const collision_y_dist = p1.height/2 + p2.height/2

    if (dist.x > collision_x_dist*2 && dist.y > collision_y_dist*2) return new Vec();
    
    let deltaV = p2.velocity.sub(p1.velocity);
    let force_x = 1000/ (dist.x || 0.1);
    let force_y = 1000/(dist.y  || 0.1);
    
    let npos1 = p1.center().div(dist);
    let npos2 = p2.center().div(dist);
    // force_x += 10 * deltaV.dot_mult(npos2.sub(npos1));
    // force_y += 10 * deltaV.dot_mult(npos2.sub(npos1));

    let ans = new Vec(force_x, force_y);
    return ans;
  }

  function calc_spring_power(p1: Model, p2: Model) {
    let dist = p1.center().calc_dist(p2.center());
    let deltaV = p2.velocity.sub(p1.velocity);
    let force =  0.01* (dist - STRING_LEN);
    let npos1 = p1.center().div(dist);
    let npos2 = p2.center().div(dist);
    force +=  0.01* deltaV.dot_mult(npos2.sub(npos1));
    let ans = npos2.sub(npos1).mult(force);
    return ans;
  }

  function encode_models(models: Model[], y: any[] | Float64Array) {
    for (let i = 0; i < num_models; i++) {
      let p = models[i];
      y[i * 4 + 1] = p.pos.x;
      y[i * 4 + 2] = p.pos.y;
      y[i * 4 + 3] = p.velocity.x;
      y[i * 4 + 4] = p.velocity.y;
    }
  }

  function decode_models(y: Float64Array | number[]) {
    let ans = [];
    for (let i = 0; i < num_models; i++) {
      let p = new Model(models[i].ctx, models[i].model);
      p.pos.x = y[i * 4 + 1];
      p.pos.y = y[i * 4 + 2];
      p.velocity.x = y[i * 4 + 3];
      p.velocity.y = y[i * 4 + 4];
      ans.push(p);
    }
    return ans;
  }

  function far_away_fast_calc2(p1: number, p2: number, dist: number) {
    return p2 - p1 > dist || p1 - p2 > dist;
  }

  function far_away_fast_calc(p1: Vec, p2: Vec) {
    if (far_away_fast_calc2(p1.x, p2.x, WIDTH/2)) return true;
    if (far_away_fast_calc2(p1.y, p2.y, HEIGHT/2)) return true;
    return false;
  }

  function the_derive(time: any, y: Float64Array, dy: Float64Array) {
    //int i;
    let models = decode_models(y);
    let dmodels = [];
    const DRAG = 0.5
    let i;
    for (i = 0; i < num_models; i++) {
      let p = models[i];
      let d = new Model(p.ctx, p.model);
      d.pos = p.velocity;
      d.velocity = wall_power(p);
      d.velocity.y += 0; //gravity
      dmodels.push(d);
    }
    for (i = 0; i < num_models; i++){
      let p1 = models[i];
     
      for (let j = i + 1; j < num_models; j++) {
        let p2 = models[j];
        // if (far_away_fast_calc(p1.center(), p2.center())) continue;
        let dist_vect = p1.center().calc_dist_vec(p2.center());
        // let dist = p1.pos.calc_dist(p2.pos);
        let collide_power = calc_collide_power(p1, p2, dist_vect);
        dmodels[i].velocity.add_to(collide_power);
        dmodels[j].velocity.sub_to(collide_power);
      }
    }
    for (i = 0; i < springs.length; i++) {
      let s = springs[i];
      let spring_power = calc_spring_power(models[s.from_model_idx], models[s.to_model_idx]);
      dmodels[s.from_model_idx].velocity.add_to(spring_power);
      dmodels[s.to_model_idx].velocity.sub_to(spring_power);
    }
    for (i = 0; i < num_models; i++){
      let p1 = models[i];
      const drag = p1.velocity.mult(DRAG)
      dmodels[i].velocity.sub_to(drag)
    }
    encode_models(dmodels, dy);
  }

  function new_vector(size: number) {
    return new Float64Array(size + 1);
  }

  function call_rk4(cur_time: number, time_diff: number) {
    let y = new_vector(num_models * 4);
    let dy = new_vector(num_models * 4);
    encode_models(models, y);
    the_derive(cur_time, y, dy); //the current implementation of derive does not uses the time, but can envision an implementation that might (gravity is off every second, perhaps?)
    rk4(y, dy, num_models * 4, cur_time, time_diff, y);
    models = decode_models(y);
  }

  function rk4(y: Float64Array | number[], dydx: Float64Array | number[], n: number, x: number, h: number, yout: any[] | Float64Array) {
    /*translated to java from numerical recipies (see nr.com). here is the original doc:
        Given values for the letiables y[1..n] and their derivatives dydx[1..n] known at x, use the
    fourth-order Runge-Kutta method to advance the solution over an interval h and return the
    incremented letiables as yout[1..n], which need not be a distinct array from y. The user
    supplies the routine derivs(x,y,dydx), which returns derivatives dydx at x.*/
    let i;
    let xh, hh, h6;
    let dym = new_vector(n);
    let dyt = new_vector(n);
    //16.1 Runge-Kutta Method 713
    let yt = new_vector(n);
    hh = h * 0.5;
    h6 = h / 6.0;
    xh = x + hh;
    for (i = 1; i <= n; i++) yt[i] = y[i] + hh * dydx[i]; //First step.
    the_derive(xh, yt, dyt); //Second step.
    for (i = 1; i <= n; i++) yt[i] = y[i] + hh * dyt[i];
    the_derive(xh, yt, dym); //Third step.
    for (i = 1; i <= n; i++) {
      yt[i] = y[i] + h * dym[i];
      dym[i] += dyt[i];
    }
    the_derive(x + h, yt, dyt); //Fourth step.
    for (
      i = 1;
      i <= n;
      i++ //Accumulate increments with proper
    )
      yout[i] = y[i] + h6 * (dydx[i] + dyt[i] + 2.0 * dym[i]); //weights.
  }
  for (let i = 0; i < NUM_STEPS; i++)
    call_rk4(timer.cur_time, timer.time_diff / NUM_STEPS); //too: acum the time?
  return models;
}
