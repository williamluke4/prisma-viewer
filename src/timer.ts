import { system_time } from "./utils";

export class Timer {
  cur_time: number;
  time_diff: number;
  epoch_time: number;
  constructor(){
    this.cur_time = 0;
    this.time_diff = 0;
    this.mark_time();
    this.epoch_time = system_time();
  }

  public mark_time() {
      const time = system_time() - this.epoch_time;
      this.time_diff = Math.min(time - this.cur_time, 0.05);
      this.cur_time = time;
  };
}