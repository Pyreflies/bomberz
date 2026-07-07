import { maps } from "../data/maps";
import { GameMode, type GameMode as GameModeType } from "../models/GameMode";
import type { MatchPlayerState, MatchState } from "../models/MatchState";
import type { RoomState } from "../models/RoomState";
import type { Team } from "../models/Team";
import { createId } from "../../shared/ids";
import { TurnOrderService } from "./TurnOrderService";

export class MatchFactory {
  private readonly turnOrderService: TurnOrderService;

  constructor(turnOrderService = new TurnOrderService()) {
    this.turnOrderService = turnOrderService;
  }

  createLocalRoom(mode: GameModeType, playerCount: number, friendlyFireEnabled: boolean): RoomState {
    if (mode === GameMode.Duel) {
      return this.createRoom(GameMode.Duel, 2, true, this.createTeams(["slot-1"], ["slot-2"]));
    }

    if (mode === GameMode.TeamBattle) {
      return this.createRoom(
        GameMode.TeamBattle,
        4,
        friendlyFireEnabled,
        this.createTeams(["slot-1", "slot-2"], ["slot-3", "slot-4"]),
      );
    }

    return this.createRoom(GameMode.FreeForAll, Math.min(4, Math.max(2, playerCount)), true, []);
  }

  createDuelRoom(): RoomState {
    return this.createLocalRoom(GameMode.Duel, 2, true);
  }

  private createRoom(
    gameMode: GameModeType,
    playerCount: number,
    friendlyFireEnabled: boolean,
    teams: Team[],
  ): RoomState {
    return {
      roomId: "local-room",
      settings: {
        gameMode,
        maxPlayers: playerCount,
        friendlyFireEnabled,
        mapId: "training-field",
      },
      slots: Array.from({ length: playerCount }, (_, index) => {
        const slotId = `slot-${index + 1}`;
        return {
          slotId,
          slotIndex: index,
          state: "Occupied" as const,
          playerName: `Player ${index + 1}`,
          teamId: this.getTeamIdForSlot(gameMode, slotId),
          characterId: "default",
          weaponIds: ["basic-cannon"],
          isReady: true,
        };
      }),
      teams,
    };
  }

  private createTeams(teamOneSlots: string[], teamTwoSlots: string[]): Team[] {
    return [
      { teamId: "team-1", name: "Blue Team", color: 0x38bdf8, slotIds: teamOneSlots },
      { teamId: "team-2", name: "Red Team", color: 0xfb7185, slotIds: teamTwoSlots },
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

  private getSpawnIndex(gameMode: GameModeType, slotIndex: number): number {
    if (gameMode === GameMode.Duel) {
      return [0, 2][slotIndex] ?? slotIndex;
    }

    if (gameMode === GameMode.FreeForAll) {
      return [0, 2, 1, 3][slotIndex] ?? slotIndex;
    }

    return slotIndex;
  }

  createMatchFromRoom(room: RoomState): MatchState {
    const map = maps.find((candidate) => candidate.mapId === room.settings.mapId);

    if (!map) {
      throw new Error(`Unknown map: ${room.settings.mapId}`);
    }

    const players: MatchPlayerState[] = room.slots
      .filter((slot) => slot.state === "Occupied")
      .map((slot) => {
        const spawn = map.spawnPoints[this.getSpawnIndex(room.settings.gameMode, slot.slotIndex)];

        if (!spawn) {
          throw new Error(`Missing spawn point for slot ${slot.slotIndex}`);
        }

        const facesLeft = slot.teamId === "team-2" || (room.settings.gameMode === GameMode.FreeForAll && slot.slotIndex % 2 === 1);

        return {
          slotId: slot.slotId,
          playerName: slot.playerName,
          teamId: slot.teamId,
          x: spawn.x,
          y: spawn.y,
          hp: 100,
          maxHp: 100,
          isAlive: true,
          angleDegrees: facesLeft ? 135 : 45,
          weaponId: slot.weaponIds[0] ?? "basic-cannon",
        };
      });

    const draftState: MatchState = {
      matchId: createId("match"),
      mode: room.settings.gameMode,
      friendlyFireEnabled: room.settings.friendlyFireEnabled,
      mapId: room.settings.mapId,
      players,
      teams: room.teams,
      turnQueue: { orderedSlotIds: [], currentIndex: 0 },
      activeSlotId: "",
      phase: "Aiming",
    };

    const turnQueue = this.turnOrderService.createInitialTurnQueue(draftState);

    return {
      ...draftState,
      turnQueue,
      activeSlotId: this.turnOrderService.getActiveSlotId(turnQueue),
    };
  }
}
