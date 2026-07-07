import type { PlayerSlot } from "./PlayerSlot";
import type { RoomSettings } from "./RoomSettings";
import type { Team } from "./Team";

export interface RoomState {
  roomId: string;
  settings: RoomSettings;
  slots: PlayerSlot[];
  teams: Team[];
}
