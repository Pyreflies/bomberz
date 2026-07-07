import Phaser from "phaser";

export class ExplosionRenderer {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(x: number, y: number, radius: number, onComplete: () => void): void {
    const ring = this.scene.add.circle(x, y, 8, 0xf97316, 0.75).setStrokeStyle(3, 0xffedd5).setDepth(30);

    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => {
        ring.destroy();
        onComplete();
      },
    });
  }
}
