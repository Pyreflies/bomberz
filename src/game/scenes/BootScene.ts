import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.spritesheet("effect-poof", "/assets/effects/Poof.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet("effect-firework", "/assets/effects/Firework.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet("tiles-industrial", "/assets/maps/industrial/Tilemap/tilemap_packed.png", {
      frameWidth: 18,
      frameHeight: 18,
    });
    this.load.spritesheet("tiles-farm", "/assets/maps/farm/Tilemap/tilemap_packed.png", {
      frameWidth: 18,
      frameHeight: 18,
    });
  }

  create(): void {
    this.createAnimation("explosion-poof", "effect-poof");
    this.createAnimation("explosion-firework", "effect-firework");
    this.scene.start("RoomScene");
  }

  private createAnimation(animationKey: string, textureKey: string): void {
    if (this.anims.exists(animationKey) || !this.textures.exists(textureKey)) {
      return;
    }

    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 29 }),
      frameRate: 30,
      hideOnComplete: true,
    });
  }
}
