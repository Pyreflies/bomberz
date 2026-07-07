import Phaser from "phaser";
import { AimController } from "../../core/services/AimController";

export class AimInputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private readonly escapeKey: Phaser.Input.Keyboard.Key;
  private readonly undoKey: Phaser.Input.Keyboard.Key;
  private readonly backspaceKey: Phaser.Input.Keyboard.Key;
  private readonly aimController = new AimController();
  private angleDegrees = 45;

  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) {
      throw new Error("Keyboard input is not available");
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.fireKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escapeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.undoKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.backspaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
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

  getAimDirection(): -1 | 0 | 1 {
    if (this.cursors.up.isDown && !this.cursors.down.isDown) {
      return 1;
    }

    if (this.cursors.down.isDown && !this.cursors.up.isDown) {
      return -1;
    }

    return 0;
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

  consumeUndo(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.undoKey) || Phaser.Input.Keyboard.JustDown(this.backspaceKey);
  }
}
