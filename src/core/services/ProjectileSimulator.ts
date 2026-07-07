import type { TrajectoryPoint } from "../models/ShotResolvedEvent";
import { degreesToRadians } from "../../shared/math";

export interface ProjectileInput {
  startX: number;
  startY: number;
  angleDegrees: number;
  power: number;
  speed: number;
  gravity: number;
  maxSteps: number;
  deltaSeconds: number;
}

export class ProjectileSimulator {
  simulate(input: ProjectileInput): TrajectoryPoint[] {
    const radians = degreesToRadians(input.angleDegrees);
    let x = input.startX;
    let y = input.startY;
    const vx = Math.cos(radians) * input.power * input.speed;
    let vy = -Math.sin(radians) * input.power * input.speed;
    const points: TrajectoryPoint[] = [{ x, y }];

    for (let i = 0; i < input.maxSteps; i += 1) {
      vy += input.gravity * input.deltaSeconds;
      x += vx * input.deltaSeconds;
      y += vy * input.deltaSeconds;
      points.push({ x, y });
    }

    return points;
  }
}
