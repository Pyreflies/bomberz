import Phaser from "phaser";
import { GameMode, type GameMode as GameModeType } from "../../core/models/GameMode";
import { MatchFactory } from "../../core/services/MatchFactory";
import { clamp } from "../../shared/math";

export class RoomScene extends Phaser.Scene {
  private selectedMode: GameModeType = GameMode.Duel;
  private freeForAllPlayerCount = 4;
  private friendlyFireEnabled = false;
  private modeText?: Phaser.GameObjects.Text;
  private optionsText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;

  constructor() {
    super("RoomScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x111827);

    this.add.text(640, 120, "Local Room", {
      fontFamily: "Arial",
      fontSize: "48px",
      color: "#f8fafc",
    }).setOrigin(0.5);

    this.modeText = this.add.text(640, 220, "", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#bfdbfe",
    }).setOrigin(0.5);

    this.optionsText = this.add.text(640, 330, "", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#cbd5e1",
      align: "center",
      lineSpacing: 10,
    }).setOrigin(0.5);

    this.hintText = this.add.text(640, 540, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#f8fafc",
      align: "center",
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.registerInput();
    this.renderMenu();
  }

  private registerInput(): void {
    this.input.keyboard?.on("keydown-ONE", () => {
      this.selectedMode = GameMode.Duel;
      this.renderMenu();
    });

    this.input.keyboard?.on("keydown-TWO", () => {
      this.selectedMode = GameMode.TeamBattle;
      this.renderMenu();
    });

    this.input.keyboard?.on("keydown-THREE", () => {
      this.selectedMode = GameMode.FreeForAll;
      this.renderMenu();
    });

    this.input.keyboard?.on("keydown-F", () => {
      if (this.selectedMode === GameMode.TeamBattle) {
        this.friendlyFireEnabled = !this.friendlyFireEnabled;
        this.renderMenu();
      }
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.adjustFreeForAllPlayerCount(-1));
    this.input.keyboard?.on("keydown-A", () => this.adjustFreeForAllPlayerCount(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.adjustFreeForAllPlayerCount(1));
    this.input.keyboard?.on("keydown-D", () => this.adjustFreeForAllPlayerCount(1));

    this.input.keyboard?.on("keydown-ESC", () => {
      this.selectedMode = GameMode.Duel;
      this.freeForAllPlayerCount = 4;
      this.friendlyFireEnabled = false;
      this.renderMenu();
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      const matchFactory = new MatchFactory();
      const playerCount = this.selectedMode === GameMode.FreeForAll ? this.freeForAllPlayerCount : 2;
      const room = matchFactory.createLocalRoom(this.selectedMode, playerCount, this.friendlyFireEnabled);
      const match = matchFactory.createMatchFromRoom(room);
      this.scene.start("GameScene", { match });
    });
  }

  private adjustFreeForAllPlayerCount(delta: number): void {
    if (this.selectedMode !== GameMode.FreeForAll) {
      return;
    }

    this.freeForAllPlayerCount = clamp(this.freeForAllPlayerCount + delta, 2, 4);
    this.renderMenu();
  }

  private renderMenu(): void {
    const modeLines = [
      `${this.selectedMode === GameMode.Duel ? "> " : "  "}Press 1 = Duel - 2 players`,
      `${this.selectedMode === GameMode.TeamBattle ? "> " : "  "}Press 2 = TeamBattle - 2v2`,
      `${this.selectedMode === GameMode.FreeForAll ? "> " : "  "}Press 3 = FreeForAll - ${this.freeForAllPlayerCount} players`,
    ];

    const optionLines = [
      ...modeLines,
      "",
      this.selectedMode === GameMode.TeamBattle
        ? `Friendly fire: ${this.friendlyFireEnabled ? "ON" : "OFF"}  (Press F)`
        : "Friendly fire: fixed by selected mode",
      this.selectedMode === GameMode.FreeForAll
        ? "Change FFA player count: LEFT/RIGHT or A/D"
        : "Select mode with 1/2/3",
    ];

    this.modeText?.setText(`Selected: ${this.selectedMode}`);
    this.optionsText?.setText(optionLines);
    this.hintText?.setText("Press ENTER to start match\nPress ESC to reset selection");
  }
}
