import Phaser from "phaser";
import { AimController } from "../../core/services/AimController";

export class AimInputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private readonly escapeKey: Phaser.Input.Keyboard.Key;
  private readonly aimController = new AimController();
  private angleDegrees = 45;

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

  updateKeyboardAim(): number {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.angleDegrees = this.aimController.increaseAngle(this.angleDegrees);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.angleDegrees = this.aimController.decreaseAngle(this.angleDegrees);
    }

    return this.angleDegrees;
  }

  getMoveDirection(): -1 | 0 | 1 {
    if (this.cursors.left.isDown && !this.cursors.right.isDown) {
      return -1;
    }

    if (this.cursors.right.isDown && !this.cursors.left.isDown) {
      return 1;
    }

    return 0;
  }

  consumeFire(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.fireKey);
  }

  consumeEscape(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escapeKey);
  }
}
