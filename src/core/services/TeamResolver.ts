import { GameMode } from "../models/GameMode";
import type { Relationship } from "../models/DamageResult";
import type { MatchPlayerState } from "../models/MatchState";

export class TeamResolver {
  getRelationship(
    mode: GameMode,
    shooter: MatchPlayerState,
    target: MatchPlayerState,
  ): Relationship {
    if (shooter.slotId === target.slotId) {
      return "Self";
    }

    if (mode === GameMode.FreeForAll) {
      return "Enemy";
    }

    if (shooter.teamId && shooter.teamId === target.teamId) {
      return "Ally";
    }

    return "Enemy";
  }
}
