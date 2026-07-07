export const GameMode = {
  Duel: "Duel",
  TeamBattle: "TeamBattle",
  FreeForAll: "FreeForAll",
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];
