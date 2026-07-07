export interface SpawnPoint {
  x: number;
  y: number;
  teamId?: string;
}

export interface MapDefinition {
  mapId: string;
  name: string;
  width: number;
  height: number;
  groundY: number;
  spawnPoints: SpawnPoint[];
}
