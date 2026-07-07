export type Relationship = "Self" | "Ally" | "Enemy";

export interface DamageResult {
  targetSlotId: string;
  damage: number;
  remainingHp: number;
  killed: boolean;
  relationship: Relationship;
}
