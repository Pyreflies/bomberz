import type { MatchState } from "../models/MatchState";

type Listener = (state: MatchState) => void;

export class MatchStateStore {
  private state: MatchState | null = null;
  private listeners: Listener[] = [];

  getState(): MatchState {
    if (!this.state) {
      throw new Error("Match state not initialized");
    }

    return this.state;
  }

  setState(state: MatchState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter((current) => current !== listener);
    };
  }
}
