import type { WindState } from "../models/WindState";

export class WindService {
  generateWindForTurn(turnNumber: number): WindState {
    const pattern: WindState[] = [
      { direction: 0, strength: 0 },
      { direction: 1, strength: 12 },
      { direction: -1, strength: 8 },
      { direction: 1, strength: 18 },
      { direction: -1, strength: 14 },
    ];

    return pattern[turnNumber % pattern.length] ?? { direction: 0, strength: 0 };
  }

  formatWind(wind: WindState): string {
    if (wind.direction === 0 || wind.strength === 0) {
      return "Calm";
    }

    return `${wind.direction > 0 ? "->" : "<-"} ${wind.strength}`;
  }
}
