import Phaser from "phaser";
import type { MatchPlayerState, MatchState } from "../../core/models/MatchState";

export class CameraController {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
  }

  configureWorld(width: number, height: number): void {
    this.camera.setBounds(0, 0, width, height);
    this.camera.setZoom(1.08);
  }

  focusActivePlayer(state: MatchState, duration = 450): void {
    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);

    if (activePlayer) {
      this.focusPlayer(activePlayer, duration);
    }
  }

  focusPlayer(player: MatchPlayerState, duration = 450): void {
    this.camera.pan(player.x, player.y - 80, duration, "Sine.easeInOut");
  }

  followProjectile(x: number, y: number): void {
    this.camera.centerOn(x, y);
  }

  focusExplosion(x: number, y: number, duration = 220): void {
    this.camera.pan(x, y, duration, "Sine.easeOut");
  }

  focusMatchEnd(state: MatchState, explosionX: number, explosionY: number): void {
    const winner = state.players.find(
      (player) => player.slotId === state.winnerSlotId || player.teamId === state.winnerTeamId,
    );

    if (winner) {
      this.focusPlayer(winner, 650);
      return;
    }

    this.focusExplosion(explosionX, explosionY, 650);
  }

  shakeExplosion(): void {
    this.camera.shake(190, 0.008);
  }
}
