import type { TrajectoryPoint } from "../models/ShotResolvedEvent";
import type { WindState } from "../models/WindState";
import { gameplayTuning } from "../data/gameplayTuning";
import { degreesToRadians } from "../../shared/math";

export interface ProjectileInput {
  startX: number;
  startY: number;
  angleDegrees: number;
  power: number;
  speed: number;
  gravity: number;
  wind?: WindState;
  maxSteps: number;
  deltaSeconds: number;
}

export class ProjectileSimulator {
  simulate(input: ProjectileInput): TrajectoryPoint[] {
    const radians = degreesToRadians(input.angleDegrees);
    let x = input.startX;
    let y = input.startY;
    let vx = Math.cos(radians) * input.power * input.speed;
    let vy = -Math.sin(radians) * input.power * input.speed;
    const points: TrajectoryPoint[] = [{ x, y }];

    for (let i = 0; i < input.maxSteps; i += 1) {
      vx += (input.wind?.direction ?? 0) * (input.wind?.strength ?? 0) * gameplayTuning.windScale * input.deltaSeconds;
      vy += input.gravity * input.deltaSeconds;
      x += vx * input.deltaSeconds;
      y += vy * input.deltaSeconds;
      points.push({ x, y });
    }

    return points;
  }
}
