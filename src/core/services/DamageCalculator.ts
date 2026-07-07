import type { DamageResult } from "../models/DamageResult";
import type { MatchPlayerState, MatchState } from "../models/MatchState";
import type { WeaponDefinition } from "../models/WeaponDefinition";
import { clamp, distance } from "../../shared/math";
import { TeamResolver } from "./TeamResolver";

export class DamageCalculator {
  private readonly teamResolver: TeamResolver;

  constructor(teamResolver: TeamResolver) {
    this.teamResolver = teamResolver;
  }

  calculate(
    state: MatchState,
    shooter: MatchPlayerState,
    weapon: WeaponDefinition,
    explosionX: number,
    explosionY: number,
  ): DamageResult[] {
    const results: DamageResult[] = [];

    for (const target of state.players.filter((player) => player.isAlive)) {
      const relationship = this.teamResolver.getRelationship(state.mode, shooter, target);

      if (relationship === "Ally" && !state.friendlyFireEnabled) {
        continue;
      }

      const targetDistance = distance(target.x, target.y, explosionX, explosionY);

      if (targetDistance > weapon.explosionRadius) {
        continue;
      }

      const rawDamage = weapon.baseDamage * (1 - targetDistance / weapon.explosionRadius);
      const damage = Math.ceil(clamp(rawDamage, 0, weapon.baseDamage));
      const remainingHp = Math.max(0, target.hp - damage);

      results.push({
        targetSlotId: target.slotId,
        damage,
        remainingHp,
        killed: remainingHp <= 0,
        relationship,
      });
    }

    return results;
  }
}
