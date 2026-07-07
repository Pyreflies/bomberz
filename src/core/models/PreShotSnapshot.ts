export interface PreShotSnapshot {
  slotId: string;
  x: number;
  facingDirection: 1 | -1;
  aimElevationDegrees: number;
  movedDistanceThisTurn: number;
}
