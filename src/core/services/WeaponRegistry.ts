import { weapons } from "../data/weapons";
import type { WeaponDefinition } from "../models/WeaponDefinition";

export class WeaponRegistry {
  getWeapon(id: string): WeaponDefinition {
    const weapon = weapons.find((item) => item.weaponId === id);

    if (!weapon) {
      throw new Error(`Unknown weapon: ${id}`);
    }

    return weapon;
  }
}
