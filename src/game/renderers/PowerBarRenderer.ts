import Phaser from "phaser";

export class PowerBarRenderer {
  private readonly back: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.back = scene.add.rectangle(x, y, 220, 18, 0x0f172a).setOrigin(0, 0.5).setDepth(45);
    this.fill = scene.add.rectangle(x + 2, y, 0, 12, 0xfacc15).setOrigin(0, 0.5).setDepth(46);
    this.label = scene.add.text(x, y - 34, "Power", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#f8fafc",
    }).setDepth(46);
  }

  render(power: number, maxPower: number, isCharging: boolean): void {
    const ratio = Phaser.Math.Clamp(power / maxPower, 0, 1);
    this.back.setStrokeStyle(2, isCharging ? 0xf97316 : 0x334155);
    this.fill.setSize(216 * ratio, 12);
    this.fill.setFillStyle(isCharging ? 0xf97316 : 0xfacc15);
    this.label.setText(`Power: ${Math.round(power)}`);
  }
}
