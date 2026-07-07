import Phaser from "phaser";
import type { MapDefinition } from "../../core/models/MapDefinition";

export class TerrainRenderer {
  private readonly scene: Phaser.Scene;
  private ground?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(map: MapDefinition): void {
    this.ground?.destroy();
    this.ground = this.scene.add
      .rectangle(map.width / 2, map.groundY + (map.height - map.groundY) / 2, map.width, map.height - map.groundY, 0x256d3b)
      .setOrigin(0.5);

    this.scene.add.rectangle(map.width / 2, map.groundY, map.width, 6, 0x54d37f).setOrigin(0.5);
  }
}
