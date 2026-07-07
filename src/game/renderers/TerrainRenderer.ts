import Phaser from "phaser";
import type { MapDefinition } from "../../core/models/MapDefinition";

export class TerrainRenderer {
  private readonly scene: Phaser.Scene;
  private ground?: Phaser.GameObjects.Rectangle;
  private readonly decorations: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(map: MapDefinition): void {
    this.ground?.destroy();
    this.decorations.forEach((decoration) => decoration.destroy());
    this.decorations.length = 0;

    const tileTextureKey = map.theme === "industrial" ? "tiles-industrial" : "tiles-farm";

    if (this.scene.textures.exists(tileTextureKey)) {
      this.renderTileTerrain(map, tileTextureKey);
      return;
    }

    this.renderFallbackTerrain(map);
  }

  private renderTileTerrain(map: MapDefinition, textureKey: string): void {
    const skyColor = map.theme === "industrial" ? 0x1e293b : 0x7dd3fc;
    const groundTint = map.theme === "industrial" ? 0x475569 : 0x3f8f3f;
    const topFrame = map.theme === "industrial" ? 12 : 0;
    const fillFrame = map.theme === "industrial" ? 20 : 18;
    const accentFrame = map.theme === "industrial" ? 42 : 61;

    this.decorations.push(
      this.scene.add.rectangle(map.width / 2, map.height / 2, map.width, map.height, skyColor).setDepth(-20),
    );

    for (let x = 0; x <= map.width + 18; x += 18) {
      this.decorations.push(this.scene.add.image(x, map.groundY, textureKey, topFrame).setOrigin(0, 0).setDepth(-5));
    }

    for (let y = map.groundY + 18; y <= map.height + 18; y += 18) {
      for (let x = 0; x <= map.width + 18; x += 18) {
        this.decorations.push(this.scene.add.image(x, y, textureKey, fillFrame).setOrigin(0, 0).setDepth(-6));
      }
    }

    for (let x = 72; x < map.width; x += 180) {
      this.decorations.push(
        this.scene.add.image(x, map.groundY - 18, textureKey, accentFrame).setOrigin(0, 1).setTint(groundTint).setDepth(-4),
      );
    }
  }

  private renderFallbackTerrain(map: MapDefinition): void {
    this.ground = this.scene.add
      .rectangle(
        map.width / 2,
        map.groundY + (map.height - map.groundY) / 2,
        map.width,
        map.height - map.groundY,
        0x256d3b,
      )
      .setOrigin(0.5);

    this.decorations.push(this.scene.add.rectangle(map.width / 2, map.groundY, map.width, 6, 0x54d37f).setOrigin(0.5));
  }
}
