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
        if((field.kind as any) === 'object' && field.relationName && !loadedRelations.includes(field.relationName)){
          loadedRelations.push(field.relationName)
          const from_model_idx = i
          const from_field_idx = fieldIdx
          const to_model_idx = this.datamodel.models.findIndex(m => m.name === field.type)
          const to_model = this.datamodel.models[to_model_idx]
          const to_field_idx = to_model.fields.findIndex(f => field.relationName === f.relationName && f.name !== field.name)
          if(to_model_idx !==  -1) connections.push(new Spring(from_model_idx, to_model_idx, from_field_idx, to_field_idx))
          
        }
      })
    })
    return connections;
  }
  public init_world = () => {
    this.springs = this.loadSprings()
    for (let i = 0; i < this.datamodel.models.length; i++) {
      const prismaModel = this.datamodel.models[i]
      const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D
      let p = new Model(ctx, prismaModel);
      this.init_rand(p);
      this.models.push(p);
    }
    this.auto()
  }

  public get_dragged_indexes = () => {
    return chain(this.ongoingTouches)
      .map("dragged_model")
      .push(this.dragged_model)
      .without(-1)
      .value();
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
    } else if(this.select_start && this.ctx) {
        // This Only Renders when the mouse is being moved
        this.ctx.strokeStyle =  "black";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.select_start.x, this.select_start.y, mouse_point.x - this.select_start.x, mouse_point.y - this.select_start.y)
        this.ctx.lineWidth = 1;

    }
    this.hover_model = this.find_model(mouse_point);
  }
  public auto(){
    const dims = autolayout(this.models, this.springs)
    console.log("dim", dims);
    if(dims.width && dims.height){
      console.log("Setting");
      this.canvas.height = dims.height + 300;
      this.canvas.width = window.innerWidth  > dims.width + 300 ? window.innerWidth : dims.width + 300 ;
    }
  }
  public draw = () => {
    this.timer.mark_time();
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
        spring.render(ctx as CanvasRenderingContext2D, this.models)
      })
      // Render Models
      this.models.forEach((model, i) => {
        model.render(ctx as CanvasRenderingContext2D, this.hover_model === i, this.dragged_model === i)
      })
      

      
    } else {
      console.error("Canvas Context Not Found");
    }
  }
  public toggleLayout = (ev: KeyboardEvent) => {
    if(ev.key === "a"){
      console.log("AutoLayout");
      this.auto()
    }
  }
  public attach_handlers = () => {
    this.canvas.addEventListener("mouseup", this.mouseup, false);
    this.canvas.addEventListener("mousemove", this.mousemove, false);
    this.canvas.addEventListener("mousedown", this.mousedown, false);
    window.addEventListener("keydown", this.toggleLayout, false)
    setInterval(this.draw, 30);
  }
}
