import { describe, expect, it } from "vitest";
import { GameMode } from "../../src/core/models/GameMode";
import type { RoomState } from "../../src/core/models/RoomState";
import { RoomFactory } from "../../src/core/services/RoomFactory";

const roomFactory = new RoomFactory();

function readyAll(room: RoomState): RoomState {
  return room.slots.reduce((currentRoom, slot) => {
    if (slot.state !== "Occupied" || slot.isReady) {
      return currentRoom;
    }

    return roomFactory.toggleReady(currentRoom, slot.slotId);
  }, room);
}

describe("RoomFactory", () => {
  it("creates Duel room correctly", () => {
    const room = roomFactory.createRoom(GameMode.Duel);

    expect(room.settings.gameMode).toBe(GameMode.Duel);
    expect(room.settings.maxPlayers).toBe(2);
    expect(room.slots.filter((slot) => slot.state === "Occupied")).toHaveLength(2);
    expect(room.slots.filter((slot) => slot.state === "Closed")).toHaveLength(2);
    expect(room.slots[0]?.teamId).toBe("team-1");
    expect(room.slots[1]?.teamId).toBe("team-2");
    expect(room.slots.some((slot) => slot.isReady)).toBe(false);
  });

  it("creates TeamBattle room correctly", () => {
    const room = roomFactory.createRoom(GameMode.TeamBattle, 4, true);

    expect(room.settings.gameMode).toBe(GameMode.TeamBattle);
    expect(room.settings.maxPlayers).toBe(4);
    expect(room.settings.friendlyFireEnabled).toBe(true);
    expect(room.slots.map((slot) => slot.teamId)).toEqual(["team-1", "team-1", "team-2", "team-2"]);
  });

  it("creates FreeForAll room with 2 players", () => {
    const room = roomFactory.createRoom(GameMode.FreeForAll, 2);

    expect(room.settings.maxPlayers).toBe(2);
    expect(room.slots.filter((slot) => slot.state === "Occupied")).toHaveLength(2);
    expect(room.slots.filter((slot) => slot.state === "Closed")).toHaveLength(2);
    expect(room.slots.filter((slot) => slot.teamId !== null)).toHaveLength(0);
  });

  it("creates FreeForAll room with 4 players", () => {
    const room = roomFactory.createRoom(GameMode.FreeForAll, 4);

    expect(room.settings.maxPlayers).toBe(4);
    expect(room.slots.filter((slot) => slot.state === "Occupied")).toHaveLength(4);
    expect(room.slots.filter((slot) => slot.state === "Closed")).toHaveLength(0);
  });

  it("does not ready closed slots", () => {
    const room = roomFactory.createRoom(GameMode.Duel);
    const updated = roomFactory.toggleReady(room, "slot-3");

    expect(updated.slots[2]?.state).toBe("Closed");
    expect(updated.slots[2]?.isReady).toBe(false);
  });

  it("fails start validation if not all occupied slots are ready", () => {
    const room = roomFactory.createRoom(GameMode.Duel);

    expect(roomFactory.validateCanStart(room)).toEqual({
      canStart: false,
      message: "All players must be ready before starting.",
    });
  });

  it("passes start validation if all occupied slots are ready", () => {
    const room = readyAll(roomFactory.createRoom(GameMode.TeamBattle));

    expect(roomFactory.validateCanStart(room)).toEqual({ canStart: true });
  });

  it("changing mode resets ready states", () => {
    const readyRoom = readyAll(roomFactory.createRoom(GameMode.Duel));
    const rebuiltRoom = roomFactory.createRoom(GameMode.TeamBattle, readyRoom.settings.maxPlayers);

    expect(readyRoom.slots.some((slot) => slot.isReady)).toBe(true);
    expect(rebuiltRoom.slots.some((slot) => slot.isReady)).toBe(false);
  });

  it("changing FreeForAll player count resets ready states", () => {
    const readyRoom = readyAll(roomFactory.createRoom(GameMode.FreeForAll, 2));
    const rebuiltRoom = roomFactory.createRoom(GameMode.FreeForAll, 4);

    expect(readyRoom.slots.some((slot) => slot.isReady)).toBe(true);
    expect(rebuiltRoom.settings.maxPlayers).toBe(4);
    expect(rebuiltRoom.slots.some((slot) => slot.isReady)).toBe(false);
  });
});
