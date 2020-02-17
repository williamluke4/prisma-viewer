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
import { autolayout } from './darge';

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
  simulate: boolean;
  select_start: Vec | null;
  selection: Model[];

  constructor(canvasid: string, datamodel: DMMF.Datamodel) {
    this.origin = 0;
    this.timer = new Timer();
    this.timer.mark_time();
    this.models = [] ;
    this.radius = 40;
    this.springs = []
    this.datamodel = datamodel
    this.canvas = document.getElementById(canvasid) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")
    this.simulate = true;
    this.hover_model = -1;
    this.dragged_model = -1;
    this.dragged_model_offset = new Vec();
    this.ongoingTouches = [];
    this.select_start = null;
    this.selection = []
    this.num_touch_start = 0;
    this.init_world();
    this.attach_handlers();
    this.ctx.canvas.width = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;
  }
  public init_rand = (model: Model) => {
    model.pos.x = my_rand(WIDTH, this.canvas.width - model.width);
    model.pos.y = my_rand(HEIGHT, this.canvas.height - model.height);
    model.velocity.x = my_rand(-1, 1);
    model.velocity.y = my_rand(1, 2);
  }
  public loadSprings(){
    const loadedRelations: string [] = []
    const connections:  Spring[] = []

    this.datamodel.models.forEach((model: DMMF.Model, i: number) => {
      model.fields.forEach((field: DMMF.Field, fieldIdx: number) => {
        if(field.kind === 'object' && field.relationName && !loadedRelations.includes(field.relationName)){
          loadedRelations.push(field.relationName)
          const from_model_idx = i
          const from_field_idx = fieldIdx
          const to_model_idx = this.datamodel.models.findIndex(m => m.name === field.type)
          const to_model = this.datamodel.models[to_model_idx]
          const to_field_idx = to_model.fields.findIndex(f => field.relationName === f.relationName)
          if(to_model_idx !==  -1) connections.push(new Spring(from_model_idx, to_model_idx, from_field_idx, to_field_idx))
          
        }
      })
    })
    return connections;
  }
  public init_world = () => {
    this.springs = this.loadSprings()
    console.log(this.springs);
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
      return d < x.width/2 || d < x.height/2
    });
  }

  public point_from_event = (event: MouseEvent) => {
    let rect = this.canvas.getBoundingClientRect();
    return new Vec(event.clientX - rect.left, event.clientY - rect.top);
  }

  public mouseup = () => {
    this.dragged_model = -1;
    this.select_start = null
  }

  public mousedown = (event: MouseEvent) => {
    let mousedown_point = this.point_from_event(event);
    this.dragged_model = this.find_model(mousedown_point);
    if (this.dragged_model == -1) {
      this.select_start = mousedown_point
    }
    else {
      this.dragged_model_offset = this.models[this.dragged_model].pos.sub(
        mousedown_point
      );
    }
  }

  public mousemove = (event: MouseEvent) => {
    let mouse_point = this.point_from_event(event);
    if (this.dragged_model != -1) {
      let mouse_speed = new Vec(event.movementX, event.movementY);
      let newpoint = this.point_from_event(event);
      this.models[this.dragged_model].pos = newpoint.add(
        this.dragged_model_offset
      );
      this.models[this.dragged_model].velocity = mouse_speed.mult(20);
      this.draw();
      return;
    } else if(this.select_start) {
        this.ctx.strokeStyle =  "black";
        this.ctx.lineWidth = 10;

        this.ctx.strokeRect(this.select_start.x, this.select_start.y, mouse_point.x - this.select_start.x, mouse_point.y - this.select_start.y)
        this.ctx.lineWidth = 1;

    }
    this.hover_model = this.find_model(mouse_point);
  }
  public autolayout(){
    const {width, height} = autolayout(this.models, this.springs)
    
    this.canvas.height = height + 300;
    this.canvas.width = window.innerWidth  > width + 300 ? window.innerWidth : width + 300 ;
  }
  public draw = () => {
    this.timer.mark_time();
    this.simulate && this.animate();
    this.origin += 10;
    if (this.origin > 500) this.origin = 10;
    let ctx = this.ctx;
    if (ctx) {
      // ctx.canvas.width = window.innerWidth;
      // ctx.canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle =  "rgb(244, 248, 250)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Render Spring Connections
      ctx.strokeStyle =  "#808080";
      // ctx.setLineDash([4, 4]);
      this.springs.forEach((spring, i) => {
        spring.render(ctx, this.models)
      })
      // Render Models
      this.models.forEach((model, i) => {
        model.render(ctx, this.hover_model === i, this.dragged_model === i)
      })

      
    } else {
      console.error("Canvas Context Not Found");
    }
  }
  public toggleSimulation = (ev: KeyboardEvent) => {
    if(ev.key === 's') {
      this.simulate = !this.simulate
    } else if(ev.key === "a"){
      console.log("AutoLayout");
      this.autolayout()
    }
  }
  public attach_handlers = () => {
    this.canvas.addEventListener("mouseup", this.mouseup, false);
    this.canvas.addEventListener("mousemove", this.mousemove, false);
    this.canvas.addEventListener("mousedown", this.mousedown, false);
    window.addEventListener("keydown", this.toggleSimulation, false)
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
    ans.x = wall_power2(p.pos.x, p.width, width);
    ans.y = wall_power2(p.pos.y, p.height, height);
    if (is_colide) ans.sub_to(p.velocity.mult(10));
    return ans;
  }

  function calc_collide_power(p1: Model, p2: Model, dist: Vec) {
    const collision_x_dist = p1.width/2 + p2.width/2
    const collision_y_dist = p1.height/2 + p2.height/2
    const acc_x_dist = dist.x - collision_x_dist
    const acc_y_dist = dist.y - collision_y_dist

    if (acc_x_dist > 20 || acc_y_dist > 20) return new Vec();
    let deltaV = p2.velocity.sub(p1.velocity);
    let force_x = 1000/ (acc_x_dist || 0.001);
    let force_y = 1000/(acc_y_dist  || 0.001);
    
    let npos1 = p1.center().div(dist);
    let npos2 = p2.center().div(dist);
    // force_x += 10 * deltaV.dot_mult(npos2.sub(npos1));
    // force_y += 10 * deltaV.dot_mult(npos2.sub(npos1));

    let ans = new Vec(force_x, force_y);
    return ans;
  }

  function calc_spring_power(spring: Spring) {
    const factor = springs.reduce((acc,s, idx) => {
      const from = s.from_model_idx === spring.from_model_idx || s.to_model_idx === spring.from_model_idx
      const to =  s.from_model_idx === spring.to_model_idx || s.to_model_idx === spring.to_model_idx
      if(from || to) acc +=1
      return acc
    }, 0)
    const spring_len = STRING_LEN + 25 * factor
    // console.log(`Factor ${factor}`);
    const from_model = models[spring.from_model_idx];
    const to_model = models[spring.to_model_idx];
    let dist = from_model.center().calc_dist(to_model.center());
    let deltaV = to_model.velocity.sub(from_model.velocity);
    let force =  0.1* (dist - spring_len);
    let npos1 = from_model.center().div(dist);
    let npos2 = to_model.center().div(dist);
    force +=  0.1* deltaV.dot_mult(npos2.sub(npos1));
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
    if (far_away_fast_calc2(p1.x, p2.x, 500)) return true;
    if (far_away_fast_calc2(p1.y, p2.y, 500)) return true;
    return false;
  }

  function the_derive(time: any, y: Float64Array, dy: Float64Array) {
    //int i;
    let models = decode_models(y);
    let dmodels = [];
    const DRAG = 0.9
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
        if (far_away_fast_calc(p1.center(), p2.center())) continue;
        let dist_vect = p1.center().calc_dist_vec(p2.center());
        // let dist = p1.pos.calc_dist(p2.pos);
        let collide_power = calc_collide_power(p1, p2, dist_vect);
        dmodels[i].velocity.add_to(collide_power);
        dmodels[j].velocity.sub_to(collide_power);
      }
    }
    for (i = 0; i < springs.length; i++) {
      let s = springs[i];
      let spring_power = calc_spring_power(s);
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
