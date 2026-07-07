import type { MatchState } from "../models/MatchState";
import type { PreShotSnapshot } from "../models/PreShotSnapshot";
import { AimController } from "./AimController";

const MAX_UNDO_STEPS = 20;
const MIN_SNAPSHOT_INTERVAL_MS = 200;

export class UndoService {
  private readonly snapshots: PreShotSnapshot[] = [];
  private lastSnapshotAt = 0;
  private readonly aimController = new AimController();

  recordSnapshot(state: MatchState, slotId: string): void {
    if (state.phase !== "Aiming" || state.activeSlotId !== slotId) {
      return;
    }

    const now = Date.now();

    if (this.snapshots.length > 0 && now - this.lastSnapshotAt < MIN_SNAPSHOT_INTERVAL_MS) {
      return;
    }

    const player = state.players.find((candidate) => candidate.slotId === slotId);

    if (!player) {
      return;
    }

    this.snapshots.push({
      slotId,
      x: player.x,
      facingDirection: player.facingDirection,
      aimElevationDegrees: player.aimElevationDegrees,
      movedDistanceThisTurn: player.movedDistanceThisTurn,
    });
    this.lastSnapshotAt = now;

    if (this.snapshots.length > MAX_UNDO_STEPS) {
      this.snapshots.shift();
    }
  }

  undoLast(state: MatchState, slotId: string): MatchState {
    if (state.phase !== "Aiming" || state.activeSlotId !== slotId) {
      return state;
    }

    const snapshot = this.snapshots.pop();

    if (!snapshot || snapshot.slotId !== slotId) {
      return state;
    }

    return {
      ...state,
      players: state.players.map((player) => {
        if (player.slotId !== slotId) {
          return player;
        }

        const angleDegrees = this.aimController.getActualAngleDegrees(
          snapshot.facingDirection,
          snapshot.aimElevationDegrees,
        );

        return {
          ...player,
          x: snapshot.x,
          facingDirection: snapshot.facingDirection,
          aimElevationDegrees: snapshot.aimElevationDegrees,
          angleDegrees,
          movedDistanceThisTurn: snapshot.movedDistanceThisTurn,
        };
      }),
    };
  }

  reset(): void {
    this.snapshots.length = 0;
    this.lastSnapshotAt = 0;
  }

  getUndoCount(): number {
    return this.snapshots.length;
  }
}
