import { maps } from "../data/maps";
import { gameplayTuning } from "../data/gameplayTuning";
import type { MatchState } from "../models/MatchState";
import type { MoveCommand } from "../models/MoveCommand";
import type { ShotCommand } from "../models/ShotCommand";
import type { ShotResolvedEvent } from "../models/ShotResolvedEvent";
import { clamp } from "../../shared/math";
import { DamageCalculator } from "./DamageCalculator";
import type { MatchStateStore } from "./MatchStateStore";
import { MovementService } from "./MovementService";
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
  private readonly movementService = new MovementService();
  private readonly turnOrderService = new TurnOrderService();
  private readonly winConditionChecker = new WinConditionChecker();

  constructor(store: MatchStateStore) {
    this.store = store;
  }

  updateActivePlayerAngle(angleDegrees: number): MatchState {
    const state = this.store.getState();

    if (state.phase !== "Aiming") {
      return state;
    }

    const nextState: MatchState = {
      ...state,
      players: state.players.map((player) =>
        player.slotId === state.activeSlotId ? { ...player, angleDegrees: clamp(angleDegrees, 0, 180) } : player,
      ),
    };

    this.store.setState(nextState);
    return nextState;
  }

  startChargingPower(slotId: string, lockedAngleDegrees: number): MatchState {
    const state = this.store.getState();

    if (state.phase !== "Aiming" || state.activeSlotId !== slotId) {
      return state;
    }

    const nextState: MatchState = {
      ...state,
      phase: "ChargingPower",
      players: state.players.map((player) =>
        player.slotId === slotId ? { ...player, angleDegrees: clamp(lockedAngleDegrees, 0, 180) } : player,
      ),
    };

    this.store.setState(nextState);
    return nextState;
  }

  moveActivePlayer(command: MoveCommand): MatchState {
    const nextState = this.movementService.moveActivePlayer(this.store.getState(), command);
    this.store.setState(nextState);
    return nextState;
  }

  submitShot(command: ShotCommand): ShotResolvedEvent {
    const state = this.store.getState();

    if (state.phase !== "Aiming" && state.phase !== "ChargingPower") {
      throw new Error("Cannot shoot outside the aiming or charging phase");
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

    const displayedPower = clamp(command.power, 1, weapon.maxPower);
    const actualPower = displayedPower * gameplayTuning.powerScale;
    const trajectory = this.projectileSimulator.simulate({
      startX: shooter.x,
      startY: shooter.y - 12,
      angleDegrees: command.angleDegrees,
      power: actualPower,
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
    const inFlightState: MatchState = { ...state, phase: "ProjectileInFlight" };
    const damagedState = this.applyDamageResults(inFlightState, damageResults);
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
      players: damagedState.players.map((player) =>
        player.slotId === nextTurnSlotId ? { ...player, movedDistanceThisTurn: 0 } : player,
      ),
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
