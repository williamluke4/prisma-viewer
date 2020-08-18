/*globals _:false */
"use strict";

import { DMMF } from "@prisma/generator-helper";
import { chain } from "lodash";
import { Connection } from "./connection";
import { autolayout } from "./darge";
import { Model } from "./model";
import { Timer } from "./timer";
import { my_rand } from "./utils";
import { Vec } from "./vector";

const WIDTH = 100;
const HEIGHT = 120;

interface MyTouch {
  identifier: number;
  pageX: number;
  pageY: number;
  dragged_model: number;
  dragged_model_offset: Vec;
  timer: Timer;
  last_pos: Vec;
}

export class Canvas {
  origin: number;
  models: Model[];
  radius: number;
  connections: Connection[];
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
  mouseStart: Vec | null;
  selection: Model[];
  scaleFactor: number;
  panX: number;
  panY: number;
  shiftDown: boolean;
  mouseDown: boolean;

  constructor(canvasid: string, datamodel: DMMF.Datamodel) {
    this.origin = 0;
    this.timer = new Timer();
    this.timer.mark_time();
    this.models = [];
    this.radius = 40;
    this.connections = [];
    this.datamodel = datamodel;
    this.canvas = document.getElementById(canvasid) as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext("2d");
    this.simulate = true;
    this.hover_model = -1;
    this.dragged_model = -1;
    this.dragged_model_offset = new Vec();
    this.ongoingTouches = [];
    this.mouseStart = null;
    this.selection = [];
    this.num_touch_start = 0;
    this.scaleFactor = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.shiftDown = false;
    this.mouseDown = false;
    this.init_world();
    this.attach_handlers();
  }
  public updateDatamodel(datamodel: DMMF.Datamodel) {
    this.models = [];
    this.connections = [];
    this.datamodel = datamodel;
    this.init_world();
  }
  public init_rand = (model: Model) => {
    model.pos.x = my_rand(WIDTH, this.canvas.width - model.width);
    model.pos.y = my_rand(HEIGHT, this.canvas.height - model.height);
    model.velocity.x = my_rand(-1, 1);
    model.velocity.y = my_rand(1, 2);
  };
  public loadSprings() {
    const loadedRelations: string[] = [];
    const connections: Connection[] = [];

    this.datamodel.models.forEach((model: DMMF.Model, i: number) => {
      model.fields.forEach((field: DMMF.Field, fieldIdx: number) => {
        if (
          (field.kind as any) === "object" &&
          field.relationName &&
          !loadedRelations.includes(field.relationName)
        ) {
          loadedRelations.push(field.relationName);
          const from_model_idx = i;
          const from_field_idx = fieldIdx;
          const to_model_idx = this.datamodel.models.findIndex(
            m => m.name === field.type
          );
          const to_model = this.datamodel.models[to_model_idx];
          const to_field_idx = to_model.fields.findIndex(
            f => field.relationName === f.relationName && f.name !== field.name
          );
          if (to_model_idx !== -1)
            connections.push(
              new Connection(
                from_model_idx,
                to_model_idx,
                from_field_idx,
                to_field_idx
              )
            );
        }
      });
    });
    return connections;
  }
  public init_world = () => {
    this.connections = this.loadSprings();
    for (let i = 0; i < this.datamodel.models.length; i++) {
      const prismaModel = this.datamodel.models[i];
      const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
      let p = new Model(ctx, prismaModel);
      this.init_rand(p);
      this.models.push(p);
    }
    autolayout(this.models, this.connections, false);
  };

  public get_dragged_indexes = () => {
    return chain(this.ongoingTouches)
      .map("dragged_model")
      .push(this.dragged_model)
      .without(-1)
      .value();
  };

  public find_model = (point: Vec) => {
    const x = point.x;
    const y = point.y;
    const idx = this.models.findIndex(m => {
      const center = m.center();
      const dx = Math.abs(x - center.x);
      const dy = Math.abs(y - center.y);
      return dx < m.width / 2 && dy < m.height / 2;
    });
    return idx;
  };

  public point_from_event = (event: MouseEvent, scaled: boolean = false) => {
    let rect = this.canvas.getBoundingClientRect();
    const x = scaled
      ? (1 / this.scaleFactor) * (event.clientX - rect.left - this.panX)
      : event.clientX - rect.left;
    const y = scaled
      ? (1 / this.scaleFactor) * (event.clientY - rect.top - this.panY)
      : event.clientY - rect.top;
    const point = new Vec(x, y);
    return point;
  };

  public mouseup = () => {
    this.dragged_model = -1;
    const domMatrix = this.ctx?.getTransform();
    this.mouseDown = false;
    this.mouseStart = null;
  };

  public mousedown = (event: MouseEvent) => {
    let mousedown_point = this.point_from_event(event, true);
    this.mouseDown = true;
    this.dragged_model = this.find_model(mousedown_point);
    if (this.dragged_model == -1) {
      this.mouseStart = mousedown_point;
    } else {
      this.dragged_model_offset = this.models[this.dragged_model].pos.sub(
        mousedown_point
      );
    }
  };
  public mousemove = (event: MouseEvent) => {
    if (this.mouseStart && this.dragged_model === -1) {
      let mouse_point = this.point_from_event(event, true);
      // This Only Renders when the mouse is being moved
      const panX = mouse_point.x - this.mouseStart.x;
      const panY = mouse_point.y - this.mouseStart.y;
      this.ctx?.translate(panX, panY);
      // this.draw();
      this.mouseStart = mouse_point;
      return;
    }
    if (this.dragged_model !== -1) {
      let mouse_speed = new Vec(event.movementX, event.movementY);

      let newpoint = this.point_from_event(event, true);
      this.models[this.dragged_model].pos = newpoint.add(
        this.dragged_model_offset
      );
      this.models[this.dragged_model].velocity = mouse_speed.mult(20);
      return;
    }
  };

  public draw = () => {
    this.timer.mark_time();
    this.origin += 10;
    if (this.origin > 500) this.origin = 10;
    let ctx = this.ctx;
    if (ctx) {
      // ctx.canvas.width = window.innerWidth;
      // ctx.canvas.height = window.innerHeight;

      // Store the current transformation matrix
      ctx.save();

      // Use the identity matrix while clearing the canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Restore the transform
      ctx.restore();
      const domMatrix = ctx.getTransform();
      this.scaleFactor = domMatrix.a;
      this.panX = domMatrix.e;
      this.panY = domMatrix.f;

      ctx.fillStyle = "rgb(244, 248, 250)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Render Spring Connections
      ctx.strokeStyle = "#808080";
      // ctx.setLineDash([4, 4]);
      this.connections.forEach((spring, i) => {
        spring.draw(ctx as CanvasRenderingContext2D, this.models);
      });
      // Render Models
      this.models.forEach((model, i) => {
        model.draw(
          ctx as CanvasRenderingContext2D,
          this.hover_model === i,
          this.dragged_model === i
        );
      });
    } else {
      console.error("Canvas Context Not Found");
    }
  };
  public handleKeyDown = (ev: KeyboardEvent) => {
    console.log(ev.key);
    switch (ev.key) {
      case "a":
        autolayout(this.models, this.connections, true);
        break;
      default:
        break;
    }
  };
  public handleKeyUp = (ev: KeyboardEvent) => {};
  public handleScroll = (ev: WheelEvent) => {
    const amount = ev.deltaY > 0 ? 0.95 : 1.05;
    this.ctx && this.ctx.scale(amount, amount);
  };
  public attach_handlers = () => {
    const container = document.getElementById("canvas-container");
    if (container) {
      container.addEventListener("mouseup", this.mouseup, false);
      container.addEventListener("mousemove", this.mousemove, false);
      container.addEventListener("mousedown", this.mousedown, false);
      container.addEventListener("wheel", this.handleScroll, false);
      container.addEventListener("keydown", this.handleKeyDown, false);
      container.addEventListener("keyup", this.handleKeyUp, false);
    }
    setInterval(this.draw, 30);
  };
}
