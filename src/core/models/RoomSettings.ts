import type { GameMode } from "./GameMode";

export interface RoomSettings {
  gameMode: GameMode;
  maxPlayers: number;
  friendlyFireEnabled: boolean;
  mapId: string;
}
