import { describe, expect, it } from "vitest";
import { gameplayTuning } from "../../src/core/data/gameplayTuning";
import { GameMode } from "../../src/core/models/GameMode";
import type { MatchState } from "../../src/core/models/MatchState";
import { AimController } from "../../src/core/services/AimController";
import { MatchFactory } from "../../src/core/services/MatchFactory";
import { MatchStateStore } from "../../src/core/services/MatchStateStore";
import {
  MAX_MOVE_DISTANCE_PER_TURN,
  MOVE_SPEED_PIXELS_PER_SECOND,
  MovementService,
  PLAYER_RADIUS,
} from "../../src/core/services/MovementService";
import { PowerChargeController } from "../../src/core/services/PowerChargeController";
import { LocalMatchClient } from "../../src/core/services/LocalMatchClient";
import { ProjectileSimulator } from "../../src/core/services/ProjectileSimulator";

const matchFactory = new MatchFactory();

function createDuelMatch() {
  const room = matchFactory.createLocalRoom(GameMode.Duel, 2, true);
  return matchFactory.createMatchFromRoom(room);
}

describe("MovementService", () => {
  it("uses updated movement tuning", () => {
    expect(MOVE_SPEED_PIXELS_PER_SECOND).toBe(90);
    expect(MAX_MOVE_DISTANCE_PER_TURN).toBe(80);
  });

  it("allows the active player to move during Aiming phase", () => {
    const state = createDuelMatch();
    const moved = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: 1,
      deltaSeconds: 0.25,
    });

    expect(moved.players[0]?.x).toBeGreaterThan(state.players[0]?.x ?? 0);
    expect(moved.players[0]?.movedDistanceThisTurn).toBeGreaterThan(0);
  });

  it("does not move an inactive player", () => {
    const state = createDuelMatch();
    const inactive = state.players[1];

    if (!inactive) {
      throw new Error("Expected inactive player");
    }

    const moved = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: inactive.slotId,
      direction: -1,
      deltaSeconds: 1,
    });

    expect(moved.players[1]?.x).toBe(inactive.x);
  });

  it("does not exceed max movement distance per turn", () => {
    const state = createDuelMatch();
    const moved = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: 1,
      deltaSeconds: 10,
    });

    expect(moved.players[0]?.movedDistanceThisTurn).toBe(MAX_MOVE_DISTANCE_PER_TURN);
  });

  it("does not move outside Aiming phase", () => {
    const state: MatchState = { ...createDuelMatch(), phase: "ChargingPower" };
    const moved = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: 1,
      deltaSeconds: 1,
    });

    expect(moved.players[0]?.x).toBe(state.players[0]?.x);
  });

  it("does not move outside map bounds", () => {
    const state = {
      ...createDuelMatch(),
      players: createDuelMatch().players.map((player) =>
        player.slotId === "slot-1" ? { ...player, x: PLAYER_RADIUS + 2 } : player,
      ),
    };
    const moved = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: -1,
      deltaSeconds: 1,
    });

    expect(moved.players[0]?.x).toBe(PLAYER_RADIUS);
  });
});

describe("AimController", () => {
  it("adjusts angle using tuning and clamps between 0 and 180", () => {
    const aim = new AimController();

    expect(aim.increaseAngle(45)).toBe(45 + gameplayTuning.angleStepDegrees);
    expect(aim.decreaseAngle(45)).toBe(45 - gameplayTuning.angleStepDegrees);
    expect(aim.increaseAngle(180)).toBe(180);
    expect(aim.decreaseAngle(0)).toBe(0);
    expect(aim.clampAngle(999)).toBe(180);
    expect(aim.clampAngle(-999)).toBe(0);
  });
});

describe("LocalMatchClient movement and charged shots", () => {
  it("resets movement allowance when a player's next turn starts", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    client.moveActivePlayer({
      matchId: store.getState().matchId,
      slotId: "slot-1",
      direction: 1,
      deltaSeconds: 10,
    });
    expect(store.getState().players[0]?.movedDistanceThisTurn).toBe(MAX_MOVE_DISTANCE_PER_TURN);

    client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: 20,
    });
    client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-2",
      weaponId: "basic-cannon",
      angleDegrees: 135,
      power: 20,
    });

    expect(store.getState().activeSlotId).toBe("slot-1");
    expect(store.getState().players[0]?.movedDistanceThisTurn).toBe(0);
  });

  it("resolves ShotCommand with charged power", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);
    client.startChargingPower("slot-1", 45);

    const event = client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: 55,
    });

    expect(event.trajectory.length).toBeGreaterThan(1);
    expect(event.shooterSlotId).toBe("slot-1");
  });

  it("applies powerScale to LocalMatchClient projectiles while keeping displayed power 1-100", () => {
    const match = createDuelMatch();
    const shooter = match.players[0];

    if (!shooter) {
      throw new Error("Expected shooter");
    }

    const displayedPower = 100;
    const store = new MatchStateStore();
    store.setState(match);
    const clientEvent = new LocalMatchClient(store).submitShot({
      matchId: match.matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: displayedPower,
    });
    const unscaledTrajectory = new ProjectileSimulator().simulate({
      startX: shooter.x,
      startY: shooter.y - 12,
      angleDegrees: 45,
      power: displayedPower,
      speed: 8,
      gravity: 420,
      maxSteps: 15,
      deltaSeconds: 1 / 60,
    });
    const scaledTrajectory = new ProjectileSimulator().simulate({
      startX: shooter.x,
      startY: shooter.y - 12,
      angleDegrees: 45,
      power: displayedPower * gameplayTuning.powerScale,
      speed: 8,
      gravity: 420,
      maxSteps: 15,
      deltaSeconds: 1 / 60,
    });

    expect(displayedPower).toBe(100);
    expect(gameplayTuning.powerScale).toBeGreaterThan(1);
    expect(scaledTrajectory.at(-1)?.x ?? 0).toBeGreaterThan(unscaledTrajectory.at(-1)?.x ?? 0);
    expect(clientEvent.trajectory[15]?.x ?? 0).toBeCloseTo(scaledTrajectory[15]?.x ?? 0);
  });
});

describe("PowerChargeController", () => {
  it("oscillates power while charging without touching match damage state", () => {
    const charger = new PowerChargeController();
    charger.start(10);
    charger.update(1, 80);

    expect(charger.isCharging()).toBe(true);
    expect(charger.getPower()).toBe(10);

    charger.update(0.1, 80);
    expect(charger.getPower()).toBeLessThan(10);

    const stoppedPower = charger.stop();
    expect(charger.isCharging()).toBe(false);
    expect(stoppedPower).toBeGreaterThanOrEqual(1);
    expect(stoppedPower).toBeLessThanOrEqual(10);
  });
});
