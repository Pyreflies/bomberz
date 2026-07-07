import { describe, expect, it } from "vitest";
import { GameMode } from "../../src/core/models/GameMode";
import type { MatchState } from "../../src/core/models/MatchState";
import { weapons } from "../../src/core/data/weapons";
import { DamageCalculator } from "../../src/core/services/DamageCalculator";
import { MatchFactory } from "../../src/core/services/MatchFactory";
import { TeamResolver } from "../../src/core/services/TeamResolver";
import { TurnOrderService } from "../../src/core/services/TurnOrderService";
import { WinConditionChecker } from "../../src/core/services/WinConditionChecker";

const factory = new MatchFactory();
const turnOrder = new TurnOrderService();
const winChecker = new WinConditionChecker();
const weapon = weapons[0];

if (!weapon) {
  throw new Error("Expected basic test weapon");
}

function createState(mode: GameMode, playerCount: number, friendlyFireEnabled = false): MatchState {
  const room = factory.createLocalRoom(mode, playerCount, friendlyFireEnabled);
  return factory.createMatchFromRoom(room);
}

function setAlive(state: MatchState, aliveSlotIds: string[]): MatchState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      hp: aliveSlotIds.includes(player.slotId) ? 100 : 0,
      isAlive: aliveSlotIds.includes(player.slotId),
    })),
  };
}

describe("win conditions", () => {
  it("detects Duel winner", () => {
    const state = setAlive(createState(GameMode.Duel, 2), ["slot-1"]);

    expect(winChecker.check(state)).toEqual({
      ended: true,
      winnerSlotId: "slot-1",
      winnerTeamId: "team-1",
    });
  });

  it("detects TeamBattle winner", () => {
    const state = setAlive(createState(GameMode.TeamBattle, 4), ["slot-1", "slot-2"]);

    expect(winChecker.check(state)).toEqual({
      ended: true,
      winnerTeamId: "team-1",
    });
  });

  it("detects FreeForAll winner", () => {
    const state = setAlive(createState(GameMode.FreeForAll, 4), ["slot-3"]);

    expect(winChecker.check(state)).toEqual({
      ended: true,
      winnerSlotId: "slot-3",
    });
  });

  it("handles draw safely when all players are dead", () => {
    const state = setAlive(createState(GameMode.TeamBattle, 4), []);

    expect(winChecker.check(state)).toEqual({ ended: true });
  });
});

describe("damage and relationships", () => {
  it("ignores allied TeamBattle damage when friendly fire is disabled", () => {
    const state = createState(GameMode.TeamBattle, 4, false);
    const shooter = state.players[0];

    if (!shooter) {
      throw new Error("Expected shooter");
    }

    const nearbyAllyState: MatchState = {
      ...state,
      players: state.players.map((player) =>
        player.slotId === "slot-2" ? { ...player, x: shooter.x + 10, y: shooter.y } : player,
      ),
    };
    const results = new DamageCalculator(new TeamResolver()).calculate(
      nearbyAllyState,
      shooter,
      weapon,
      shooter.x,
      shooter.y,
    );

    expect(results.some((result) => result.targetSlotId === "slot-1" && result.relationship === "Self")).toBe(true);
    expect(results.some((result) => result.targetSlotId === "slot-2")).toBe(false);
  });

  it("applies allied TeamBattle damage when friendly fire is enabled", () => {
    const state = createState(GameMode.TeamBattle, 4, true);
    const shooter = state.players[0];

    if (!shooter) {
      throw new Error("Expected shooter");
    }

    const nearbyAllyState: MatchState = {
      ...state,
      players: state.players.map((player) =>
        player.slotId === "slot-2" ? { ...player, x: shooter.x + 10, y: shooter.y } : player,
      ),
    };
    const results = new DamageCalculator(new TeamResolver()).calculate(
      nearbyAllyState,
      shooter,
      weapon,
      shooter.x,
      shooter.y,
    );

    expect(results.some((result) => result.targetSlotId === "slot-2" && result.relationship === "Ally")).toBe(true);
  });

  it("treats every non-self FreeForAll player as enemy", () => {
    const state = createState(GameMode.FreeForAll, 4);
    const shooter = state.players[0];
    const target = state.players[1];

    if (!shooter || !target) {
      throw new Error("Expected players");
    }

    expect(new TeamResolver().getRelationship(GameMode.FreeForAll, shooter, target)).toBe("Enemy");
  });
});

describe("turn order", () => {
  it("creates Duel order", () => {
    const state = createState(GameMode.Duel, 2);

    expect(state.turnQueue.orderedSlotIds).toEqual(["slot-1", "slot-2"]);
  });

  it("creates TeamBattle alternating team order", () => {
    const state = createState(GameMode.TeamBattle, 4);

    expect(state.turnQueue.orderedSlotIds).toEqual(["slot-1", "slot-3", "slot-2", "slot-4"]);
  });

  it("creates FreeForAll order", () => {
    const state = createState(GameMode.FreeForAll, 4);

    expect(state.turnQueue.orderedSlotIds).toEqual(["slot-1", "slot-2", "slot-3", "slot-4"]);
  });

  it("skips dead players when advancing turns", () => {
    const state = createState(GameMode.TeamBattle, 4);
    const withDeadPlayer: MatchState = {
      ...state,
      turnQueue: { orderedSlotIds: ["slot-1", "slot-3", "slot-2", "slot-4"], currentIndex: 0 },
      players: state.players.map((player) =>
        player.slotId === "slot-3" ? { ...player, hp: 0, isAlive: false } : player,
      ),
    };

    const queue = turnOrder.advanceTurn(withDeadPlayer);

    expect(queue.orderedSlotIds).toEqual(["slot-1", "slot-2", "slot-4"]);
    expect(turnOrder.getActiveSlotId(queue)).toBe("slot-2");
  });
});
