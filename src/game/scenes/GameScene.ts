import Phaser from "phaser";
import { maps } from "../../core/data/maps";
import type { MatchState } from "../../core/models/MatchState";
import type { RoomState } from "../../core/models/RoomState";
import type { ShotResolvedEvent } from "../../core/models/ShotResolvedEvent";
import { LocalMatchClient } from "../../core/services/LocalMatchClient";
import { MatchFactory } from "../../core/services/MatchFactory";
import { MatchStateStore } from "../../core/services/MatchStateStore";
import { MAX_MOVE_DISTANCE_PER_TURN } from "../../core/services/MovementService";
import { PowerChargeController } from "../../core/services/PowerChargeController";
import { WeaponRegistry } from "../../core/services/WeaponRegistry";
import { AimInputController } from "../input/AimInputController";
import { ExplosionRenderer } from "../renderers/ExplosionRenderer";
import { PlayerRenderer } from "../renderers/PlayerRenderer";
import { PowerBarRenderer } from "../renderers/PowerBarRenderer";
import { ProjectileRenderer } from "../renderers/ProjectileRenderer";
import { TerrainRenderer } from "../renderers/TerrainRenderer";

interface GameSceneData {
  room: RoomState;
  match?: MatchState;
}

export class GameScene extends Phaser.Scene {
  private store?: MatchStateStore;
  private matchClient?: LocalMatchClient;
  private aimInput?: AimInputController;
  private playerRenderer?: PlayerRenderer;
  private projectileRenderer?: ProjectileRenderer;
  private explosionRenderer?: ExplosionRenderer;
  private powerBarRenderer?: PowerBarRenderer;
  private hudText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private isAnimatingShot = false;
  private lockedAngleDegrees = 45;
  private readonly powerChargeController = new PowerChargeController();
  private readonly weaponRegistry = new WeaponRegistry();

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneData): void {
    const match = data.match ?? new MatchFactory().createMatchFromRoom(data.room);

    this.store = new MatchStateStore();
    this.store.setState(match);
    this.matchClient = new LocalMatchClient(this.store);
  }

  create(): void {
    const state = this.getState();
    const map = maps.find((candidate) => candidate.mapId === state.mapId);

    if (!map) {
      throw new Error(`Unknown map: ${state.mapId}`);
    }

    this.cameras.main.setBackgroundColor(0x172033);
    this.addSkyDetails();

    new TerrainRenderer(this).render(map);
    this.playerRenderer = new PlayerRenderer(this);
    this.projectileRenderer = new ProjectileRenderer(this);
    this.explosionRenderer = new ExplosionRenderer(this);
    this.powerBarRenderer = new PowerBarRenderer(this, 24, 156);
    this.aimInput = new AimInputController(this);
    this.hudText = this.add.text(24, 20, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#f8fafc",
    }).setDepth(40);
    this.statusText = this.add.text(640, 86, "", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#fde68a",
    }).setOrigin(0.5).setDepth(40);

    this.store?.subscribe((updatedState) => {
      this.syncAimToActivePlayer(updatedState);
      this.renderState(updatedState);
    });
    this.syncAimToActivePlayer(state);
    this.renderState(state);
  }

  update(_time: number, deltaMilliseconds: number): void {
    if (!this.aimInput) {
      return;
    }

    if (this.aimInput.consumeEscape()) {
      this.scene.start("RoomScene");
      return;
    }

    const state = this.getState();

    if (state.phase === "MatchEnded" || this.isAnimatingShot) {
      return;
    }

    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);

    if (!activePlayer || !activePlayer.isAlive) {
      return;
    }

    const deltaSeconds = deltaMilliseconds / 1000;

    if (state.phase === "Aiming") {
      const angle = this.aimInput.updateKeyboardAim();
      this.matchClient?.updateActivePlayerAngle(angle);
      this.moveActivePlayer(deltaSeconds);

      if (this.aimInput.consumeFire()) {
        this.startPowerCharge();
      }
    } else if (state.phase === "ChargingPower") {
      this.powerChargeController.update(deltaSeconds);

      if (this.aimInput.consumeFire()) {
        this.fireChargedShot();
      }
    }

    this.renderState(this.getState());
  }

  private startPowerCharge(): void {
    const state = this.getState();
    const shooter = state.players.find((player) => player.slotId === state.activeSlotId);

    if (!shooter || !this.matchClient || !this.aimInput) {
      return;
    }

    const weapon = this.weaponRegistry.getWeapon(shooter.weaponId);
    this.lockedAngleDegrees = this.aimInput.getAngle();
    this.powerChargeController.start(weapon.maxPower);
    this.matchClient.startChargingPower(shooter.slotId, this.lockedAngleDegrees);
  }

  private fireChargedShot(): void {
    const state = this.getState();
    const shooter = state.players.find((player) => player.slotId === state.activeSlotId);

    if (!shooter || !this.matchClient) {
      return;
    }

    const power = this.powerChargeController.stop();
    this.isAnimatingShot = true;
    const event = this.matchClient.submitShot({
      matchId: state.matchId,
      shooterSlotId: shooter.slotId,
      weaponId: shooter.weaponId,
      angleDegrees: this.lockedAngleDegrees,
      power,
    });

    this.playResolvedShot(event);
  }

  private moveActivePlayer(deltaSeconds: number): void {
    const state = this.getState();
    const direction = this.aimInput?.getMoveDirection() ?? 0;

    if (direction === 0 || !this.matchClient) {
      return;
    }

    this.matchClient.moveActivePlayer({
      matchId: state.matchId,
      slotId: state.activeSlotId,
      direction,
      deltaSeconds,
    });
  }

  private playResolvedShot(event: ShotResolvedEvent): void {
    const weapon = this.weaponRegistry.getWeapon(event.weaponId);

    this.projectileRenderer?.animate(event.trajectory, () => {
      this.explosionRenderer?.play(event.explosionX, event.explosionY, weapon.explosionRadius, () => {
        this.isAnimatingShot = false;
        this.renderState(this.getState());
      });
    });
  }

  private syncAimToActivePlayer(state: MatchState): void {
    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);

    if (activePlayer) {
      this.aimInput?.setAngle(activePlayer.angleDegrees);
    }
  }

  private renderState(state: MatchState): void {
    this.playerRenderer?.render(state);

    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);
    const weapon = activePlayer ? this.weaponRegistry.getWeapon(activePlayer.weaponId) : undefined;
    const angle = activePlayer?.angleDegrees ?? this.aimInput?.getAngle() ?? 0;
    const power = this.powerChargeController.getPower();
    const activeName = activePlayer?.playerName ?? "None";
    const remainingMove = activePlayer
      ? Math.max(0, MAX_MOVE_DISTANCE_PER_TURN - activePlayer.movedDistanceThisTurn)
      : 0;

    this.powerBarRenderer?.render(power, weapon?.maxPower ?? 100, state.phase === "ChargingPower");
    this.hudText?.setText([
      `Mode: ${state.mode}`,
      `Active: ${activeName}`,
      `Phase: ${state.phase}`,
      `Angle: ${angle} deg`,
      `Power: ${Math.round(power)}`,
      `Move left: ${Math.round(remainingMove)} px`,
      "UP/DOWN: Aim  |  LEFT/RIGHT: Move",
      "SPACE: Start Power  |  SPACE again: Fire  |  ESC: Back to Room",
    ]);

    if (state.phase === "MatchEnded") {
      this.statusText?.setText(`Match ended: ${this.getWinnerLabel(state)} wins! Press ESC`);
    } else {
      this.statusText?.setText(this.isAnimatingShot ? "Shot in flight..." : "");
    }
  }

  private getWinnerLabel(state: MatchState): string {
    const winnerPlayer = state.players.find((player) => player.slotId === state.winnerSlotId);

    if (winnerPlayer) {
      return winnerPlayer.playerName;
    }

    const winnerTeam = state.teams.find((team) => team.teamId === state.winnerTeamId);

    if (winnerTeam) {
      return winnerTeam.name;
    }

    return "Nobody";
  }

  private getState(): MatchState {
    if (!this.store) {
      throw new Error("GameScene store is not initialized");
    }

    return this.store.getState();
  }

  private addSkyDetails(): void {
    this.add.circle(1070, 95, 36, 0xfacc15, 0.9);
    this.add.rectangle(640, 650, 1280, 140, 0x0f172a, 0.2);
  }
}
