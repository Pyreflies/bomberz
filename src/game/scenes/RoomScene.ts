import Phaser from "phaser";
import { GameMode, type GameMode as GameModeType } from "../../core/models/GameMode";
import type { PlayerSlot } from "../../core/models/PlayerSlot";
import type { RoomState } from "../../core/models/RoomState";
import { RoomFactory } from "../../core/services/RoomFactory";

export class RoomScene extends Phaser.Scene {
  private readonly roomFactory = new RoomFactory();
  private room!: RoomState;
  private modeText?: Phaser.GameObjects.Text;
  private controlsText?: Phaser.GameObjects.Text;
  private slotsText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super("RoomScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x111827);
    this.room = this.roomFactory.createRoom(GameMode.Duel, 2, false, "training-field-farm");

    this.add.text(48, 38, "Local Room", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#f8fafc",
    });

    this.modeText = this.add.text(48, 100, "", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#bfdbfe",
      lineSpacing: 8,
    });

    this.controlsText = this.add.text(48, 210, "", {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#cbd5e1",
      lineSpacing: 8,
    });

    this.add.text(570, 86, "Player Slots", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#f8fafc",
    });

    this.slotsText = this.add.text(570, 140, "", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#e2e8f0",
      lineSpacing: 18,
    });

    this.statusText = this.add.text(48, 650, "", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#fde68a",
    });

    this.registerInput();
    this.renderRoom();
  }

  private registerInput(): void {
    this.input.keyboard?.on("keydown-ONE", () => this.rebuildRoom(GameMode.Duel));
    this.input.keyboard?.on("keydown-TWO", () => this.rebuildRoom(GameMode.TeamBattle));
    this.input.keyboard?.on("keydown-THREE", () => this.rebuildRoom(GameMode.FreeForAll));

    this.input.keyboard?.on("keydown-F", () => {
      if (this.room.settings.gameMode !== GameMode.TeamBattle) {
        return;
      }

      this.rebuildRoom(GameMode.TeamBattle, this.room.settings.maxPlayers, !this.room.settings.friendlyFireEnabled);
    });

    this.input.keyboard?.on("keydown-M", () => this.toggleMap());

    this.input.keyboard?.on("keydown-A", () => this.changeFreeForAllPlayerCount(-1));
    this.input.keyboard?.on("keydown-LEFT", () => this.changeFreeForAllPlayerCount(-1));
    this.input.keyboard?.on("keydown-D", () => this.changeFreeForAllPlayerCount(1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.changeFreeForAllPlayerCount(1));

    this.input.keyboard?.on("keydown-Q", () => this.toggleReady("slot-1"));
    this.input.keyboard?.on("keydown-W", () => this.toggleReady("slot-2"));
    this.input.keyboard?.on("keydown-E", () => this.toggleReady("slot-3"));
    this.input.keyboard?.on("keydown-R", () => this.toggleReady("slot-4"));

    this.input.keyboard?.on("keydown-ESC", () => {
      this.room = this.roomFactory.createRoom(GameMode.Duel, 2, false, "training-field-farm");
      this.setStatus("Selection reset.");
      this.renderRoom();
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      const validation = this.roomFactory.validateCanStart(this.room);

      if (!validation.canStart) {
        this.setStatus(validation.message ?? "Cannot start match.");
        this.renderRoom();
        return;
      }

      this.scene.start("GameScene", { room: this.room });
    });
  }

  private rebuildRoom(
    mode: GameModeType,
    playerCount = mode === GameMode.FreeForAll ? this.room.settings.maxPlayers : 2,
    friendlyFireEnabled = this.room.settings.friendlyFireEnabled,
  ): void {
    const nextPlayerCount = mode === GameMode.FreeForAll ? playerCount : mode === GameMode.TeamBattle ? 4 : 2;
    const nextFriendlyFire = mode === GameMode.TeamBattle ? friendlyFireEnabled : false;
    this.room = this.roomFactory.createRoom(mode, nextPlayerCount, nextFriendlyFire, this.room.settings.mapId);
    this.setStatus("Ready states reset.");
    this.renderRoom();
  }

  private toggleMap(): void {
    const nextMapId =
      this.room.settings.mapId === "training-field-farm" ? "training-field-industrial" : "training-field-farm";
    this.room = this.roomFactory.createRoom(
      this.room.settings.gameMode,
      this.room.settings.maxPlayers,
      this.room.settings.friendlyFireEnabled,
      nextMapId,
    );
    this.setStatus("Map changed. Ready states reset.");
    this.renderRoom();
  }

  private changeFreeForAllPlayerCount(delta: number): void {
    if (this.room.settings.gameMode !== GameMode.FreeForAll) {
      return;
    }

    const playerCount = Phaser.Math.Clamp(this.room.settings.maxPlayers + delta, 2, 4);
    this.rebuildRoom(GameMode.FreeForAll, playerCount, false);
  }

  private toggleReady(slotId: string): void {
    const before = this.room.slots.find((slot) => slot.slotId === slotId);
    this.room = this.roomFactory.toggleReady(this.room, slotId);

    if (before?.state === "Closed") {
      this.setStatus(`Slot ${before.slotIndex + 1} is closed.`);
    } else {
      this.setStatus("");
    }

    this.renderRoom();
  }

  private renderRoom(): void {
    const friendlyFireLine =
      this.room.settings.gameMode === GameMode.TeamBattle
        ? `Friendly fire: ${this.room.settings.friendlyFireEnabled ? "ON" : "OFF"}`
        : "Friendly fire: N/A";

    this.modeText?.setText([
      `Mode: ${this.room.settings.gameMode}`,
      `Max players: ${this.room.settings.maxPlayers}`,
      friendlyFireLine,
      `Map: ${this.room.settings.mapId}`,
    ]);

    this.controlsText?.setText([
      "Mode: 1 Duel  |  2 TeamBattle  |  3 FreeForAll",
      "FFA count: A/D or LEFT/RIGHT",
      "Map: M toggle Farm/Industrial",
      "TeamBattle friendly fire: F",
      "Ready: Q Player 1  |  W Player 2  |  E Player 3  |  R Player 4",
      "Start: ENTER",
      "Reset: ESC",
    ]);

    this.slotsText?.setText(this.room.slots.map((slot) => this.formatSlot(slot)));
  }

  private formatSlot(slot: PlayerSlot): string {
    if (slot.state === "Closed") {
      return `Slot ${slot.slotIndex + 1}: Closed`;
    }

    const teamLabel = this.getTeamLabel(slot);
    const readyLabel = slot.isReady ? "Ready" : "Not Ready";

    return `Slot ${slot.slotIndex + 1}: ${slot.playerName}  |  ${teamLabel}  |  ${readyLabel}`;
  }

  private getTeamLabel(slot: PlayerSlot): string {
    if (this.room.settings.gameMode === GameMode.FreeForAll) {
      return "FFA";
    }

    const team = this.room.teams.find((candidate) => candidate.teamId === slot.teamId);
    return team?.name ?? "No Team";
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }
}
