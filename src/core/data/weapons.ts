import type { WeaponDefinition } from "../models/WeaponDefinition";

export const weapons: WeaponDefinition[] = [
  {
    weaponId: "basic-cannon",
    name: "Basic Cannon",
    baseDamage: 35,
    explosionRadius: 90,
    projectileSpeed: 8,
    gravity: 420,
    maxPower: 100,
  },
];
