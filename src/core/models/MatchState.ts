import type { GameMode } from "./GameMode";
import type { Team } from "./Team";
import type { TurnQueue } from "./TurnQueue";

export type MatchPhase = "Aiming" | "ChargingPower" | "ProjectileInFlight" | "Resolving" | "MatchEnded";

export interface MatchPlayerState {
  slotId: string;
  playerName: string;
  teamId: string | null;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  angleDegrees: number;
  weaponId: string;
  movedDistanceThisTurn: number;
}

export interface MatchState {
  matchId: string;
  mode: GameMode;
  friendlyFireEnabled: boolean;
  mapId: string;
  players: MatchPlayerState[];
  teams: Team[];
  turnQueue: TurnQueue;
  activeSlotId: string;
  phase: MatchPhase;
  winnerSlotId?: string;
  winnerTeamId?: string;
}
