import { Vec } from "./vector";
import { DMMF } from '@prisma/generator-helper';
import { FIELD_HEIGHT } from './constants';

class ModelField{
  parent: Model;
  index: number;
  field: DMMF.Field;
  constructor(parent: Model, index: number, field: DMMF.Field) {
    this.parent = parent;
    this.index = index;
    this.field = field;
  }
  getFieldType(){
    const typename = this.field.type
    const isList = this.field.isList ? '[ ]' : ''
    const isRequired = this.field.isRequired ? '' : '?'
    return typename + isRequired + isList;
  }
  public draw(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "white";
    ctx.fillRect(this.parent.pos.x, this.parent.pos.y +   FIELD_HEIGHT * (this.index + 1), this.parent.width, FIELD_HEIGHT)
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    const textY = this.parent.pos.y + (FIELD_HEIGHT * (this.index + 1))
    ctx.beginPath();
    ctx.fillStyle = "gray";
    ctx.arc(this.parent.pos.x + 10, textY - 2.5, 3, 0, Math.PI * 2, true);
    ctx.fill()
    ctx.fillStyle = "black";
    ctx.fillText(this.field.name, this.parent.pos.x + 20, textY );
    ctx.textAlign = "right";
    ctx.fillText(this.getFieldType(), this.parent.pos.x + this.parent.width - 10, textY);

  }
}
function getMaxTextWidth(model: DMMF.Model, ctx: CanvasRenderingContext2D){
  let padding = 20;
  let max = padding + ctx.measureText(model.name).width + padding;
  model.fields.forEach(field => {
    const width = padding + ctx.measureText(field.name).width + padding + ctx.measureText(field.type).width + padding
    if(width > max){
      max = width
    }
  })
  return max
}
class ModelHeader{
  parent: Model;
  height: number;
  model: DMMF.Model;
  constructor(parent: Model, model: DMMF.Model) {
    this.parent = parent;
    this.height = 20;
    this.model = model;
  }
  public draw(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "white";
    // console.log(this.parent.pos.x, this.parent.pos.y, this.parent.width, this.parent.height);
    ctx.fillRect(this.parent.pos.x, this.parent.pos.y, this.parent.width, this.parent.height)
    ctx.fillStyle = "#15BD76";
    ctx.fillRect(this.parent.pos.x, this.parent.pos.y, this.parent.width, this.height)
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText(this.model.name, this.parent.pos.x + this.height/2, this.parent.pos.y + 13);
  }
}
export class Model {
  pos: Vec;
  velocity: Vec;
  model: DMMF.Model;


  height: number;
  width: number;
  ctx: CanvasRenderingContext2D;
  constructor(ctx: CanvasRenderingContext2D, model: DMMF.Model, pos?: Vec) {
    this.pos = pos || new Vec();
    this.velocity = new Vec();
    this.model = model;
    this.ctx = ctx
    this.height = 20 + model.fields.length * 20;
    this.width = getMaxTextWidth(model, ctx);  
  }
  public center() {
    return new Vec(this.pos.x + (this.width / 2),  this.pos.y + (this.height / 2))
  }
  public cx(){
    return this.pos.x + (this.width / 2)
  }
  public cy(){
    return this.pos.y + (this.height / 2)
  }
  public draw(ctx: CanvasRenderingContext2D, hovering: boolean, dragging: boolean){
    const header = new ModelHeader(this, this.model)
    header.draw(ctx)
    ctx.fillStyle = "white";
    ctx.rect(this.pos.x, this.pos.y + 20, this.width, this.height - 20)
    this.model.fields.forEach((field, i) => {
      const f = new ModelField(this, i +1, field)
      f.draw(ctx);
    })
  }
}