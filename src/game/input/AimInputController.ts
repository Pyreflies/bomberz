import Phaser from "phaser";
import { clamp } from "../../shared/math";

export class AimInputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private readonly escapeKey: Phaser.Input.Keyboard.Key;
  private angleDegrees = 45;
  private power = 60;

  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) {
      throw new Error("Keyboard input is not available");
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.fireKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escapeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  setAngle(angleDegrees: number): void {
    this.angleDegrees = angleDegrees;
  }

  getAngle(): number {
    return this.angleDegrees;
  }

  getPower(): number {
    return this.power;
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.angleDegrees = clamp(this.angleDegrees + 2, 0, 180);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.angleDegrees = clamp(this.angleDegrees - 2, 0, 180);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.power = clamp(this.power + 2, 1, 100);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.power = clamp(this.power - 2, 1, 100);
    }
  }

  consumeFire(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.fireKey);
  }

  consumeEscape(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escapeKey);
  }
}
