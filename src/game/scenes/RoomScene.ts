import Phaser from "phaser";
import { MatchFactory } from "../../core/services/MatchFactory";

export class RoomScene extends Phaser.Scene {
  constructor() {
    super("RoomScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x111827);

    this.add.text(640, 230, "Local Room", {
      fontFamily: "Arial",
      fontSize: "48px",
      color: "#f8fafc",
    }).setOrigin(0.5);

    this.add.text(640, 310, "Press ENTER to start Duel", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#bfdbfe",
    }).setOrigin(0.5);

    this.add.text(640, 380, "Duel MVP: 2 players, 1 map, 1 cannon", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    this.input.keyboard?.once("keydown-ENTER", () => {
      const matchFactory = new MatchFactory();
      const room = matchFactory.createDuelRoom();
      const match = matchFactory.createMatchFromRoom(room);
      this.scene.start("GameScene", { match });
    });
  }
}
