import { GameMode } from "../models/GameMode";

export class GameModeRules {
  static requiresTeams(mode: GameMode): boolean {
    return mode === GameMode.Duel || mode === GameMode.TeamBattle;
  }

  static allowsFriendlyFireToggle(mode: GameMode): boolean {
    return mode === GameMode.TeamBattle;
  }

  static minPlayers(): number {
    return 2;
  }

  static maxPlayers(mode: GameMode): number {
    return mode === GameMode.Duel ? 2 : 4;
  }
}
