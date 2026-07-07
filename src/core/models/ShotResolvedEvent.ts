import type { DamageResult } from "./DamageResult";

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface ShotResolvedEvent {
  shooterSlotId: string;
  weaponId: string;
  trajectory: TrajectoryPoint[];
  explosionX: number;
  explosionY: number;
  damageResults: DamageResult[];
  nextTurnSlotId?: string;
  matchEnded: boolean;
  winnerSlotId?: string;
  winnerTeamId?: string;
}
