import type { MapDefinition } from "../models/MapDefinition";

export const maps: MapDefinition[] = [
  {
    mapId: "training-field",
    name: "Training Field",
    theme: "farm",
    width: 1280,
    height: 720,
    groundY: 560,
    spawnPoints: [
      { x: 160, y: 536, teamId: "team-1" },
      { x: 300, y: 536, teamId: "team-1" },
      { x: 1120, y: 536, teamId: "team-2" },
      { x: 980, y: 536, teamId: "team-2" },
    ],
  },
  {
    mapId: "training-field-farm",
    name: "Training Field - Farm",
    theme: "farm",
    width: 1280,
    height: 720,
    groundY: 560,
    spawnPoints: [
      { x: 160, y: 536, teamId: "team-1" },
      { x: 300, y: 536, teamId: "team-1" },
      { x: 1120, y: 536, teamId: "team-2" },
      { x: 980, y: 536, teamId: "team-2" },
    ],
  },
  {
    mapId: "training-field-industrial",
    name: "Training Field - Industrial",
    theme: "industrial",
    width: 1280,
    height: 720,
    groundY: 560,
    spawnPoints: [
      { x: 160, y: 536, teamId: "team-1" },
      { x: 300, y: 536, teamId: "team-1" },
      { x: 1120, y: 536, teamId: "team-2" },
      { x: 980, y: 536, teamId: "team-2" },
    ],
  },
];
