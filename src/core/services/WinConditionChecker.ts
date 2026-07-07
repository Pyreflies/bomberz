import { GameMode } from "../models/GameMode";
import type { MatchState } from "../models/MatchState";

export interface WinResult {
  ended: boolean;
  winnerSlotId?: string;
  winnerTeamId?: string;
}

export class WinConditionChecker {
  check(state: MatchState): WinResult {
    const alivePlayers = state.players.filter((player) => player.isAlive);

    if (alivePlayers.length === 0) {
      return { ended: true };
    }

    if (state.mode === GameMode.FreeForAll) {
      if (alivePlayers.length === 1) {
        return { ended: true, winnerSlotId: alivePlayers[0]?.slotId };
      }

      return { ended: false };
    }

    if (state.mode === GameMode.Duel) {
      if (alivePlayers.length === 1) {
        return {
          ended: true,
          winnerSlotId: alivePlayers[0]?.slotId,
          winnerTeamId: alivePlayers[0]?.teamId ?? undefined,
        };
      }

      return { ended: false };
    }

    const livingTeams = new Set(alivePlayers.map((player) => player.teamId).filter((teamId) => teamId !== null));

    if (livingTeams.size === 1) {
      return { ended: true, winnerTeamId: [...livingTeams][0] };
    }

    return { ended: false };
  }
}
