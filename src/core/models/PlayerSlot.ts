export type SlotState = "Open" | "Occupied" | "Closed";

export interface PlayerSlot {
  slotId: string;
  slotIndex: number;
  state: SlotState;
  playerName: string;
  teamId: string | null;
  characterId: string;
  weaponIds: string[];
  isReady: boolean;
}
