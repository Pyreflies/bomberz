import Phaser from "phaser";
import type { MatchState } from "../../core/models/MatchState";

export class TurnIndicatorRenderer {
  private readonly scene: Phaser.Scene;
  private arrow?: Phaser.GameObjects.Triangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(state: MatchState): void {
    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);

    if (!activePlayer || state.phase === "MatchEnded") {
      this.arrow?.setVisible(false);
      return;
    }

    if (!this.arrow) {
      this.arrow = this.scene.add.triangle(0, 0, 0, 0, 18, 0, 9, 18, 0xfacc15).setDepth(55);
    }

    this.arrow.setVisible(true);
    this.arrow.setPosition(activePlayer.x, activePlayer.y - 92);
  }

  showTurnText(playerName: string): void {
    const text = this.scene.add.text(640, 170, `${playerName}'s Turn`, {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#fde68a",
      stroke: "#111827",
      strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(80);

    this.scene.tweens.add({
      targets: text,
      y: 135,
      alpha: 0,
      duration: 1050,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}
