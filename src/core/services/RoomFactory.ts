import { GameMode, type GameMode as GameModeType } from "../models/GameMode";
import type { PlayerSlot } from "../models/PlayerSlot";
import type { RoomState } from "../models/RoomState";
import type { Team } from "../models/Team";
import { clamp } from "../../shared/math";

export interface RoomStartValidation {
  canStart: boolean;
  message?: string;
}

export class RoomFactory {
  createRoom(
    mode: GameModeType,
    playerCount = 4,
    friendlyFireEnabled = false,
    mapId = "training-field-farm",
  ): RoomState {
    if (mode === GameMode.Duel) {
      return this.createRoomState(GameMode.Duel, 2, true, this.createTeams(["slot-1"], ["slot-2"]), mapId);
    }

    if (mode === GameMode.TeamBattle) {
      return this.createRoomState(
        GameMode.TeamBattle,
        4,
        friendlyFireEnabled,
        this.createTeams(["slot-1", "slot-2"], ["slot-3", "slot-4"]),
        mapId,
      );
    }

    return this.createRoomState(GameMode.FreeForAll, clamp(playerCount, 2, 4), true, [], mapId);
  }

  toggleReady(room: RoomState, slotId: string): RoomState {
    return {
      ...room,
      slots: room.slots.map((slot) => {
        if (slot.slotId !== slotId || slot.state !== "Occupied") {
          return slot;
        }

        return { ...slot, isReady: !slot.isReady };
      }),
    };
  }

  validateCanStart(room: RoomState): RoomStartValidation {
    const occupiedSlots = room.slots.filter((slot) => slot.state === "Occupied");

    if (occupiedSlots.some((slot) => !slot.isReady)) {
      return {
        canStart: false,
        message: "All players must be ready before starting.",
      };
    }

    return { canStart: true };
  }

  private createRoomState(
    gameMode: GameModeType,
    playerCount: number,
    friendlyFireEnabled: boolean,
    teams: Team[],
    mapId: string,
  ): RoomState {
    return {
      roomId: "local-room",
      settings: {
        gameMode,
        maxPlayers: playerCount,
        friendlyFireEnabled,
        mapId,
      },
      slots: Array.from({ length: 4 }, (_, index) => this.createSlot(gameMode, index, playerCount)),
      teams,
    };
  }

  private createSlot(gameMode: GameModeType, index: number, playerCount: number): PlayerSlot {
    const slotId = `slot-${index + 1}`;
    const isOccupied = index < playerCount;

    return {
      slotId,
      slotIndex: index,
      state: isOccupied ? "Occupied" : "Closed",
      playerName: isOccupied ? `Player ${index + 1}` : "",
      teamId: isOccupied ? this.getTeamIdForSlot(gameMode, slotId) : null,
      characterId: "default",
      weaponIds: ["basic-cannon"],
      isReady: false,
    };
  }

  private createTeams(teamOneSlots: string[], teamTwoSlots: string[]): Team[] {
    return [
      { teamId: "team-1", name: "Team 1", color: 0x38bdf8, slotIds: teamOneSlots },
      { teamId: "team-2", name: "Team 2", color: 0xfb7185, slotIds: teamTwoSlots },
    ];
  }

  private getTeamIdForSlot(gameMode: GameModeType, slotId: string): string | null {
    if (gameMode === GameMode.FreeForAll) {
      return null;
    }

    if (gameMode === GameMode.Duel) {
      return slotId === "slot-1" ? "team-1" : "team-2";
    }

    return slotId === "slot-1" || slotId === "slot-2" ? "team-1" : "team-2";
  }
}
