import { maps } from "../data/maps";
import { GameMode, type GameMode as GameModeType } from "../models/GameMode";
import type { MatchPlayerState, MatchState } from "../models/MatchState";
import type { RoomState } from "../models/RoomState";
import { createId } from "../../shared/ids";
import { RoomFactory } from "./RoomFactory";
import { TurnOrderService } from "./TurnOrderService";

export class MatchFactory {
  private readonly turnOrderService: TurnOrderService;

  constructor(turnOrderService = new TurnOrderService()) {
    this.turnOrderService = turnOrderService;
  }

  createLocalRoom(mode: GameModeType, playerCount: number, friendlyFireEnabled: boolean): RoomState {
    return new RoomFactory().createRoom(mode, playerCount, friendlyFireEnabled);
  }

  createDuelRoom(): RoomState {
    return this.createLocalRoom(GameMode.Duel, 2, true);
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
