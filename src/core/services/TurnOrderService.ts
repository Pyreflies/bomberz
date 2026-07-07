import { GameMode } from "../models/GameMode";
import type { MatchState } from "../models/MatchState";
import type { TurnQueue } from "../models/TurnQueue";

export class TurnOrderService {
  createInitialTurnQueue(state: Pick<MatchState, "mode" | "players">): TurnQueue {
    if (state.mode === GameMode.TeamBattle) {
      return {
        orderedSlotIds: ["slot-1", "slot-3", "slot-2", "slot-4"].filter((slotId) =>
          state.players.some((player) => player.slotId === slotId && player.isAlive),
        ),
        currentIndex: 0,
      };
    }

    return {
      orderedSlotIds: state.players.filter((player) => player.isAlive).map((player) => player.slotId),
      currentIndex: 0,
    };
  }

  getActiveSlotId(queue: TurnQueue): string {
    const activeSlotId = queue.orderedSlotIds[queue.currentIndex];

    if (!activeSlotId) {
      throw new Error("Turn queue has no active player");
    }

    return activeSlotId;
  }

  advanceTurn(state: MatchState): TurnQueue {
    const aliveIds = new Set(
      state.players.filter((player) => player.isAlive).map((player) => player.slotId),
    );
    const orderedSlotIds = state.turnQueue.orderedSlotIds.filter((slotId) => aliveIds.has(slotId));

    if (orderedSlotIds.length === 0) {
      return { orderedSlotIds: [], currentIndex: 0 };
    }

    const currentSlotId = state.turnQueue.orderedSlotIds[state.turnQueue.currentIndex];
    const currentIndexInAliveQueue = orderedSlotIds.indexOf(currentSlotId);
    const baseIndex = currentIndexInAliveQueue >= 0 ? currentIndexInAliveQueue : state.turnQueue.currentIndex - 1;
    const currentIndex = (baseIndex + 1 + orderedSlotIds.length) % orderedSlotIds.length;

    return { orderedSlotIds, currentIndex };
  }
}
