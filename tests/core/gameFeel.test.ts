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
import { WindService } from "../../src/core/services/WindService";

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

  it("sets active player facing direction when moving left or right", () => {
    const state = createDuelMatch();
    const movedLeft = new MovementService().moveActivePlayer(state, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: -1,
      deltaSeconds: 0.25,
    });
    const movedRight = new MovementService().moveActivePlayer(movedLeft, {
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction: 1,
      deltaSeconds: 0.25,
    });

    expect(movedLeft.players[0]?.facingDirection).toBe(-1);
    expect(movedLeft.players[0]?.angleDegrees).toBe(135);
    expect(movedRight.players[0]?.facingDirection).toBe(1);
    expect(movedRight.players[0]?.angleDegrees).toBe(45);
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
    expect(moved.players[1]?.facingDirection).toBe(inactive.facingDirection);
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
    expect(moved.players[0]?.facingDirection).toBe(state.players[0]?.facingDirection);
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
    expect(moved.players[0]?.facingDirection).toBe(-1);
  });
});

describe("AimController", () => {
  it("adjusts aim elevation using tuning and clamps between 0 and 90", () => {
    const aim = new AimController();

    expect(aim.increaseAngle(45)).toBe(45 + gameplayTuning.angleStepDegrees);
    expect(aim.decreaseAngle(45)).toBe(45 - gameplayTuning.angleStepDegrees);
    expect(aim.increaseAngle(90)).toBe(90);
    expect(aim.decreaseAngle(0)).toBe(0);
    expect(aim.clampElevation(999)).toBe(90);
    expect(aim.clampElevation(-999)).toBe(0);
  });

  it("derives actual angles from facing direction and elevation", () => {
    const aim = new AimController();

    expect(aim.getActualAngleDegrees(1, 45)).toBe(45);
    expect(aim.getActualAngleDegrees(-1, 45)).toBe(135);
    expect(aim.getActualAngleDegrees(-1, 46)).toBe(134);
  });

  it("keeps up/down as elevation changes independent of facing direction", () => {
    const aim = new AimController();
    const higher = aim.increaseAngleByDelta(45, 1);
    const lower = aim.decreaseAngleByDelta(45, 1);

    expect(higher).toBeGreaterThan(45);
    expect(lower).toBeLessThan(45);
    expect(aim.getActualAngleDegrees(-1, higher)).toBeLessThan(135);
    expect(aim.getActualAngleDegrees(-1, lower)).toBeGreaterThan(135);
  });
});

describe("MatchFactory facing defaults", () => {
  it("defaults left-side spawns to face right and right-side spawns to face left", () => {
    const duel = createDuelMatch();
    const teamBattle = matchFactory.createMatchFromRoom(matchFactory.createLocalRoom(GameMode.TeamBattle, 4, false));
    const freeForAll = matchFactory.createMatchFromRoom(matchFactory.createLocalRoom(GameMode.FreeForAll, 4, false));

    for (const match of [duel, teamBattle, freeForAll]) {
      const mapCenterX = 1280 / 2;

      for (const player of match.players) {
        expect(player.aimElevationDegrees).toBe(45);
        expect(player.facingDirection).toBe(player.x < mapCenterX ? 1 : -1);
      }
    }
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
    expect(store.getState().wind).toEqual(new WindService().generateWindForTurn(store.getState().turnNumber));
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

  it("fires in the current facing direction after movement updates actual angle", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    client.moveActivePlayer({
      matchId: store.getState().matchId,
      slotId: "slot-1",
      direction: -1,
      deltaSeconds: 0,
    });
    const shooter = store.getState().players[0];

    if (!shooter) {
      throw new Error("Expected shooter");
    }

    const event = client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: shooter.slotId,
      weaponId: shooter.weaponId,
      angleDegrees: shooter.angleDegrees,
      power: 50,
    });

    expect(shooter.facingDirection).toBe(-1);
    expect(shooter.angleDegrees).toBe(135);
    expect(event.trajectory[1]?.x ?? shooter.x).toBeLessThan(shooter.x);
  });

  it("does not leave a continuing shot in ProjectileInFlight phase", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    const event = client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: 20,
    });

    expect(event.matchEnded).toBe(false);
    expect(event.nextTurnSlotId).toBe("slot-2");
    expect(store.getState().phase).toBe("Aiming");
  });

  it("does not leave an ending shot in ProjectileInFlight phase", () => {
    const match = createDuelMatch();
    const lethalSetup: MatchState = {
      ...match,
      players: match.players.map((player) =>
        player.slotId === "slot-2"
          ? { ...player, x: 220, y: match.players[0]?.y ?? player.y, hp: 1 }
          : player,
      ),
    };
    const store = new MatchStateStore();
    store.setState(lethalSetup);
    const client = new LocalMatchClient(store);

    const event = client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 0,
      power: 20,
    });

    expect(event.matchEnded).toBe(true);
    expect(store.getState().phase).toBe("MatchEnded");
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

describe("LocalMatchClient aim, undo, and wind", () => {
  it("changes aim only during Aiming phase", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    client.updateActivePlayerAimElevation(60);
    expect(store.getState().players[0]?.aimElevationDegrees).toBe(60);
    expect(store.getState().players[0]?.angleDegrees).toBe(60);

    client.startChargingPower("slot-1", 60);
    client.updateActivePlayerAimElevation(20);
    expect(store.getState().players[0]?.aimElevationDegrees).toBe(60);
  });

  it("right-side player pressing up increases elevation while lowering actual angle", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: 20,
    });
    client.updateActivePlayerAimElevation(46);

    expect(store.getState().players[1]?.facingDirection).toBe(-1);
    expect(store.getState().players[1]?.aimElevationDegrees).toBe(46);
    expect(store.getState().players[1]?.angleDegrees).toBe(134);
  });

  it("undo restores x, facing direction, aim elevation, and moved distance without restoring HP", () => {
    const store = new MatchStateStore();
    const damaged = {
      ...createDuelMatch(),
      players: createDuelMatch().players.map((player) =>
        player.slotId === "slot-1" ? { ...player, hp: 50 } : player,
      ),
    };
    store.setState(damaged);
    const client = new LocalMatchClient(store);

    client.moveActivePlayer({
      matchId: store.getState().matchId,
      slotId: "slot-1",
      direction: -1,
      deltaSeconds: 0.5,
    });
    expect(store.getState().players[0]?.facingDirection).toBe(-1);
    client.undoLastPreShotAction(store.getState().matchId, "slot-1");

    expect(store.getState().players[0]?.x).toBe(damaged.players[0]?.x);
    expect(store.getState().players[0]?.facingDirection).toBe(1);
    expect(store.getState().players[0]?.angleDegrees).toBe(45);
    expect(store.getState().players[0]?.aimElevationDegrees).toBe(45);
    expect(store.getState().players[0]?.movedDistanceThisTurn).toBe(0);
    expect(store.getState().players[0]?.hp).toBe(50);
  });

  it("clears undo when charging starts and does not undo after firing", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);

    client.moveActivePlayer({
      matchId: store.getState().matchId,
      slotId: "slot-1",
      direction: 1,
      deltaSeconds: 0.5,
    });
    expect(client.getUndoCount()).toBe(1);

    client.startChargingPower("slot-1", 45);
    expect(client.getUndoCount()).toBe(0);
    const xAfterCharging = store.getState().players[0]?.x;
    client.undoLastPreShotAction(store.getState().matchId, "slot-1");
    expect(store.getState().players[0]?.x).toBe(xAfterCharging);
  });

  it("keeps wind constant during a shot and changes it on turn change", () => {
    const store = new MatchStateStore();
    store.setState(createDuelMatch());
    const client = new LocalMatchClient(store);
    const initialWind = store.getState().wind;

    const event = client.submitShot({
      matchId: store.getState().matchId,
      shooterSlotId: "slot-1",
      weaponId: "basic-cannon",
      angleDegrees: 45,
      power: 20,
    });

    expect(event.trajectory.length).toBeGreaterThan(1);
    expect(initialWind).toEqual(new WindService().generateWindForTurn(0));
    expect(store.getState().wind).toEqual(new WindService().generateWindForTurn(1));
  });
});

describe("ProjectileSimulator wind", () => {
  it("is deterministic for identical input and wind", () => {
    const simulator = new ProjectileSimulator();
    const input = {
      startX: 100,
      startY: 100,
      angleDegrees: 45,
      power: 60,
      speed: 8,
      gravity: 420,
      wind: { direction: 1 as const, strength: 12 },
      maxSteps: 30,
      deltaSeconds: 1 / 60,
    };

    expect(simulator.simulate(input)).toEqual(simulator.simulate(input));
  });

  it("changes x movement based on wind direction", () => {
    const simulator = new ProjectileSimulator();
    const baseInput = {
      startX: 100,
      startY: 100,
      angleDegrees: 45,
      power: 60,
      speed: 8,
      gravity: 420,
      maxSteps: 30,
      deltaSeconds: 1 / 60,
    };
    const left = simulator.simulate({ ...baseInput, wind: { direction: -1 as const, strength: 20 } });
    const right = simulator.simulate({ ...baseInput, wind: { direction: 1 as const, strength: 20 } });

    expect(right.at(-1)?.x ?? 0).toBeGreaterThan(left.at(-1)?.x ?? 0);
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
