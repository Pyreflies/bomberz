import Phaser from "phaser";
import type { MatchPlayerState, MatchState } from "../../core/models/MatchState";

interface PlayerView {
  body: Phaser.GameObjects.Arc;
  name: Phaser.GameObjects.Text;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  aimLine: Phaser.GameObjects.Line;
}

export class PlayerRenderer {
  private readonly scene: Phaser.Scene;
  private readonly views = new Map<string, PlayerView>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(state: MatchState): void {
    for (const player of state.players) {
      const view = this.views.get(player.slotId) ?? this.createView(player);
      const color = player.teamId === "team-1" ? 0x38bdf8 : 0xfb7185;
      const hpRatio = player.hp / player.maxHp;
      const isActive = state.activeSlotId === player.slotId && state.phase !== "MatchEnded";

      view.body.setPosition(player.x, player.y);
      view.body.setFillStyle(player.isAlive ? color : 0x64748b);
      view.body.setStrokeStyle(isActive ? 4 : 2, isActive ? 0xfacc15 : 0x0f172a);
      view.name.setText(`${player.playerName} ${player.hp}/${player.maxHp}`);
      view.name.setPosition(player.x, player.y - 58);
      view.hpBack.setPosition(player.x, player.y - 36);
      view.hpFill.setPosition(player.x - 30 + 30 * hpRatio, player.y - 36);
      view.hpFill.setSize(60 * hpRatio, 7);
      view.aimLine.setVisible(isActive && player.isAlive);

      const radians = (player.angleDegrees * Math.PI) / 180;
      view.aimLine.setTo(0, 0, Math.cos(radians) * 48, -Math.sin(radians) * 48);
      view.aimLine.setPosition(player.x, player.y);
    }
  }

  private createView(player: MatchPlayerState): PlayerView {
    const body = this.scene.add.circle(player.x, player.y, 24, 0xffffff).setDepth(10);
    const name = this.scene.add.text(player.x, player.y - 58, "", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#f8fafc",
    }).setOrigin(0.5).setDepth(11);
    const hpBack = this.scene.add.rectangle(player.x, player.y - 36, 64, 11, 0x0f172a).setDepth(11);
    const hpFill = this.scene.add.rectangle(player.x, player.y - 36, 60, 7, 0x22c55e).setDepth(12);
    const aimLine = this.scene.add.line(player.x, player.y, 0, 0, 48, -48, 0xfacc15).setOrigin(0, 0).setLineWidth(3).setDepth(12);
    const view = { body, name, hpBack, hpFill, aimLine };

    this.views.set(player.slotId, view);
    return view;
  }
}
