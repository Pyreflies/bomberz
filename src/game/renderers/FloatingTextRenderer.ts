import Phaser from "phaser";

export class FloatingTextRenderer {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(x: number, y: number, text: string, color = "#fee2e2"): void {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: "Arial",
      fontSize: "24px",
      color,
      stroke: "#111827",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);

    this.scene.tweens.add({
      targets: label,
      y: y - 44,
      alpha: 0,
      duration: 780,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }
}
