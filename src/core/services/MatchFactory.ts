import { maps } from "../data/maps";
import { GameMode } from "../models/GameMode";
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

  createDuelRoom(): RoomState {
    const teams: Team[] = [
      { teamId: "team-1", name: "Blue", color: 0x38bdf8, slotIds: ["slot-1"] },
      { teamId: "team-2", name: "Red", color: 0xfb7185, slotIds: ["slot-2"] },
    ];

    return {
      roomId: "local-room",
      settings: {
        gameMode: GameMode.Duel,
        maxPlayers: 2,
        friendlyFireEnabled: true,
        mapId: "training-field",
      },
      slots: [
        {
          slotId: "slot-1",
          slotIndex: 0,
          state: "Occupied",
          playerName: "Player 1",
          teamId: "team-1",
          characterId: "default",
          weaponIds: ["basic-cannon"],
          isReady: true,
        },
        {
          slotId: "slot-2",
          slotIndex: 1,
          state: "Occupied",
          playerName: "Player 2",
          teamId: "team-2",
          characterId: "default",
          weaponIds: ["basic-cannon"],
          isReady: true,
        },
      ],
      teams,
    };
  }

  createMatchFromRoom(room: RoomState): MatchState {
    const map = maps.find((candidate) => candidate.mapId === room.settings.mapId);

    if (!map) {
      throw new Error(`Unknown map: ${room.settings.mapId}`);
    }

    const players: MatchPlayerState[] = room.slots
      .filter((slot) => slot.state === "Occupied")
      .map((slot) => {
        const spawn = map.spawnPoints[slot.slotIndex];

        if (!spawn) {
          throw new Error(`Missing spawn point for slot ${slot.slotIndex}`);
        }

        const facesLeft = slot.slotIndex % 2 === 1;

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
