import { maps } from "../data/maps";
import type { MatchState } from "../models/MatchState";
import type { ShotCommand } from "../models/ShotCommand";
import type { ShotResolvedEvent } from "../models/ShotResolvedEvent";
import { clamp } from "../../shared/math";
import { DamageCalculator } from "./DamageCalculator";
import type { MatchStateStore } from "./MatchStateStore";
import { ProjectileSimulator } from "./ProjectileSimulator";
import { TeamResolver } from "./TeamResolver";
import { TerrainCollisionService } from "./TerrainCollisionService";
import { TurnOrderService } from "./TurnOrderService";
import { WeaponRegistry } from "./WeaponRegistry";
import { WinConditionChecker } from "./WinConditionChecker";

export class LocalMatchClient {
  private readonly store: MatchStateStore;
  private readonly weaponRegistry = new WeaponRegistry();
  private readonly projectileSimulator = new ProjectileSimulator();
  private readonly terrainCollisionService = new TerrainCollisionService();
  private readonly damageCalculator = new DamageCalculator(new TeamResolver());
  private readonly turnOrderService = new TurnOrderService();
  private readonly winConditionChecker = new WinConditionChecker();

  constructor(store: MatchStateStore) {
    this.store = store;
  }

  submitShot(command: ShotCommand): ShotResolvedEvent {
    const state = this.store.getState();

    if (state.phase !== "Aiming") {
      throw new Error("Cannot shoot outside the aiming phase");
    }

    if (state.activeSlotId !== command.shooterSlotId) {
      throw new Error("Not this player's turn");
    }

    const shooter = state.players.find((player) => player.slotId === command.shooterSlotId);

    if (!shooter || !shooter.isAlive) {
      throw new Error("Shooter is not alive");
    }

    const weapon = this.weaponRegistry.getWeapon(command.weaponId);
    const map = maps.find((candidate) => candidate.mapId === state.mapId);

    if (!map) {
      throw new Error(`Unknown map: ${state.mapId}`);
    }

    const power = clamp(command.power, 1, weapon.maxPower);
    const trajectory = this.projectileSimulator.simulate({
      startX: shooter.x,
      startY: shooter.y - 12,
      angleDegrees: command.angleDegrees,
      power,
      speed: weapon.projectileSpeed,
      gravity: weapon.gravity,
      maxSteps: 420,
      deltaSeconds: 1 / 60,
    });
    const collision = this.terrainCollisionService.findCollision(
      trajectory,
      map,
      state.players,
      shooter.slotId,
    );
    const damageResults = this.damageCalculator.calculate(
      state,
      shooter,
      weapon,
      collision.x,
      collision.y,
    );
    const damagedState = this.applyDamageResults(state, damageResults);
    const winResult = this.winConditionChecker.check(damagedState);

    if (winResult.ended) {
      const endedState: MatchState = {
        ...damagedState,
        phase: "MatchEnded",
        winnerSlotId: winResult.winnerSlotId,
        winnerTeamId: winResult.winnerTeamId,
      };

      this.store.setState(endedState);

      return {
        shooterSlotId: command.shooterSlotId,
        weaponId: command.weaponId,
        trajectory: collision.trajectory,
        explosionX: collision.x,
        explosionY: collision.y,
        damageResults,
        matchEnded: true,
        winnerSlotId: winResult.winnerSlotId,
        winnerTeamId: winResult.winnerTeamId,
      };
    }

    const nextQueue = this.turnOrderService.advanceTurn(damagedState);
    const nextTurnSlotId = this.turnOrderService.getActiveSlotId(nextQueue);
    const nextState: MatchState = {
      ...damagedState,
      turnQueue: nextQueue,
      activeSlotId: nextTurnSlotId,
      phase: "Aiming",
    };

    this.store.setState(nextState);

    return {
      shooterSlotId: command.shooterSlotId,
      weaponId: command.weaponId,
      trajectory: collision.trajectory,
      explosionX: collision.x,
      explosionY: collision.y,
      damageResults,
      nextTurnSlotId,
      matchEnded: false,
    };
  }

  private applyDamageResults(state: MatchState, damageResults: ShotResolvedEvent["damageResults"]): MatchState {
    return {
      ...state,
      players: state.players.map((player) => {
        const damage = damageResults.find((result) => result.targetSlotId === player.slotId);

        if (!damage) {
          return player;
        }

        return {
          ...player,
          hp: damage.remainingHp,
          isAlive: !damage.killed,
        };
      }),
    };
  }
}
