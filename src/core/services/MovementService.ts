import { maps } from "../data/maps";
import { gameplayTuning } from "../data/gameplayTuning";
import type { MatchState } from "../models/MatchState";
import type { MoveCommand } from "../models/MoveCommand";
import { clamp } from "../../shared/math";

export const PLAYER_RADIUS = 24;
export const MOVE_SPEED_PIXELS_PER_SECOND = gameplayTuning.moveSpeedPixelsPerSecond;
export const MAX_MOVE_DISTANCE_PER_TURN = gameplayTuning.maxMoveDistancePerTurn;

export class MovementService {
  moveActivePlayer(state: MatchState, command: MoveCommand): MatchState {
    if (state.phase !== "Aiming") {
      return state;
    }

    if (state.matchId !== command.matchId || state.activeSlotId !== command.slotId) {
      return state;
    }

    const map = maps.find((candidate) => candidate.mapId === state.mapId);

    if (!map) {
      throw new Error(`Unknown map: ${state.mapId}`);
    }

    return {
      ...state,
      players: state.players.map((player) => {
        if (player.slotId !== command.slotId || !player.isAlive) {
          return player;
        }

        const remainingMoveDistance = Math.max(0, MAX_MOVE_DISTANCE_PER_TURN - player.movedDistanceThisTurn);
        const requestedDistance = Math.max(0, command.deltaSeconds) * MOVE_SPEED_PIXELS_PER_SECOND;
        const appliedDistance = Math.min(remainingMoveDistance, requestedDistance);
        const nextX = clamp(
          player.x + command.direction * appliedDistance,
          PLAYER_RADIUS,
          map.width - PLAYER_RADIUS,
        );
        const actualDistance = Math.abs(nextX - player.x);

        return {
          ...player,
          x: nextX,
          y: map.groundY - PLAYER_RADIUS,
          movedDistanceThisTurn: player.movedDistanceThisTurn + actualDistance,
        };
      }),
    };
  }
}
