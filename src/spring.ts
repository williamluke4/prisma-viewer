import { Vec } from "./vector";

export class Spring {
  from_model_idx: number;
  to_model_idx: number;
  from_field_idx?: number;
  to_field_idx?: number;
  constructor(
    from_model_idx: number,
    to_model_idx: number,
    from_field_idx?: number,
    to_field_idx?: number) {
      this.from_model_idx = from_model_idx
      this.to_model_idx = to_model_idx
      this.from_field_idx = from_field_idx
      this.to_field_idx = to_field_idx
  }
}