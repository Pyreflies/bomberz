export interface MoveCommand {
  matchId: string;
  slotId: string;
  direction: -1 | 1;
  deltaSeconds: number;
}
