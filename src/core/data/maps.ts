import type { MapDefinition } from "../models/MapDefinition";

export const maps: MapDefinition[] = [
  {
    mapId: "training-field",
    name: "Training Field",
    width: 1280,
    height: 720,
    groundY: 560,
    spawnPoints: [
      { x: 160, y: 536, teamId: "team-1" },
      { x: 1120, y: 536, teamId: "team-2" },
    ],
  },
];
