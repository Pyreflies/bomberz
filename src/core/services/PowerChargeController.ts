import { clamp } from "../../shared/math";

export class PowerChargeController {
  private minPower = 1;
  private maxPower = 100;
  private power = 1;
  private direction: 1 | -1 = 1;
  private charging = false;

  start(maxPower: number, minPower = 1): void {
    this.minPower = minPower;
    this.maxPower = Math.max(minPower, maxPower);
    this.power = minPower;
    this.direction = 1;
    this.charging = true;
  }

  update(deltaSeconds: number, chargeSpeed = 80): void {
    if (!this.charging) {
      return;
    }

    this.power += this.direction * chargeSpeed * Math.max(0, deltaSeconds);

    if (this.power >= this.maxPower) {
      this.power = this.maxPower;
      this.direction = -1;
    }

    if (this.power <= this.minPower) {
      this.power = this.minPower;
      this.direction = 1;
    }
  }

  stop(): number {
    this.charging = false;
    return this.getPower();
  }

  getPower(): number {
    return clamp(this.power, this.minPower, this.maxPower);
  }

  isCharging(): boolean {
    return this.charging;
  }
}
