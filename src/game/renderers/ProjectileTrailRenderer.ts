import Phaser from "phaser";

export class ProjectileTrailRenderer {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addPoint(x: number, y: number): void {
    const dot = this.scene.add.circle(x, y, 4, 0xfde68a, 0.7).setDepth(18);

    this.scene.tweens.add({
      targets: dot,
      alpha: 0,
      scale: 0.25,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}
