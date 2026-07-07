import type { MapDefinition } from "../models/MapDefinition";
import type { MatchPlayerState } from "../models/MatchState";
import type { TrajectoryPoint } from "../models/ShotResolvedEvent";
import { distance } from "../../shared/math";

export interface CollisionResult {
  x: number;
  y: number;
  trajectory: TrajectoryPoint[];
  type: "Ground" | "Player" | "OutOfBounds";
  targetSlotId?: string;
}

export class TerrainCollisionService {
  findCollision(
    points: TrajectoryPoint[],
    map: MapDefinition,
    players: MatchPlayerState[],
    shooterSlotId: string,
  ): CollisionResult {
    const usedPoints: TrajectoryPoint[] = [];

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (!point) {
        continue;
      }

      usedPoints.push(point);

      if (point.x < 0 || point.x > map.width || point.y > map.height) {
        return { x: point.x, y: point.y, trajectory: usedPoints, type: "OutOfBounds" };
      }

      if (point.y >= map.groundY) {
        return { x: point.x, y: map.groundY, trajectory: usedPoints, type: "Ground" };
      }

      if (index < 5) {
        continue;
      }

      for (const player of players.filter((current) => current.isAlive)) {
        if (player.slotId === shooterSlotId && index < 12) {
          continue;
        }

        if (distance(player.x, player.y, point.x, point.y) <= 24) {
          return {
            x: point.x,
            y: point.y,
            trajectory: usedPoints,
            type: "Player",
            targetSlotId: player.slotId,
          };
        }
      }
    }

    const last = usedPoints.at(-1) ?? { x: 0, y: 0 };
    return { x: last.x, y: last.y, trajectory: usedPoints, type: "OutOfBounds" };
  }
}
