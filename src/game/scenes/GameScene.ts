import Phaser from "phaser";
import { maps } from "../../core/data/maps";
import { gameplayTuning } from "../../core/data/gameplayTuning";
import type { MatchState } from "../../core/models/MatchState";
import type { RoomState } from "../../core/models/RoomState";
import type { ShotResolvedEvent } from "../../core/models/ShotResolvedEvent";
import { LocalMatchClient } from "../../core/services/LocalMatchClient";
import { MatchFactory } from "../../core/services/MatchFactory";
import { MatchStateStore } from "../../core/services/MatchStateStore";
import { MAX_MOVE_DISTANCE_PER_TURN } from "../../core/services/MovementService";
import { PowerChargeController } from "../../core/services/PowerChargeController";
import { WeaponRegistry } from "../../core/services/WeaponRegistry";
import { WindService } from "../../core/services/WindService";
import { SoundController } from "../audio/SoundController";
import { CameraController } from "../controllers/CameraController";
import { AimInputController } from "../input/AimInputController";
import { ExplosionRenderer } from "../renderers/ExplosionRenderer";
import { FloatingTextRenderer } from "../renderers/FloatingTextRenderer";
import { PlayerRenderer } from "../renderers/PlayerRenderer";
import { PowerBarRenderer } from "../renderers/PowerBarRenderer";
import { ProjectileRenderer } from "../renderers/ProjectileRenderer";
import { ProjectileTrailRenderer } from "../renderers/ProjectileTrailRenderer";
import { TerrainRenderer } from "../renderers/TerrainRenderer";
import { TurnIndicatorRenderer } from "../renderers/TurnIndicatorRenderer";

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
  private projectileTrailRenderer?: ProjectileTrailRenderer;
  private explosionRenderer?: ExplosionRenderer;
  private floatingTextRenderer?: FloatingTextRenderer;
  private turnIndicatorRenderer?: TurnIndicatorRenderer;
  private cameraController?: CameraController;
  private powerBarRenderer?: PowerBarRenderer;
  private hudText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private windIndicatorText?: Phaser.GameObjects.Text;
  private isAnimatingShot = false;
  private pendingShotEvent?: ShotResolvedEvent;
  private lockedAngleDegrees = 45;
  private readonly powerChargeController = new PowerChargeController();
  private readonly weaponRegistry = new WeaponRegistry();
  private readonly windService = new WindService();
  private readonly soundController = new SoundController();

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
    this.cameraController = new CameraController(this);
    this.cameraController.configureWorld(map.width, map.height);
    this.addSkyDetails();

    new TerrainRenderer(this).render(map);
    this.playerRenderer = new PlayerRenderer(this);
    this.projectileRenderer = new ProjectileRenderer(this);
    this.projectileTrailRenderer = new ProjectileTrailRenderer(this);
    this.explosionRenderer = new ExplosionRenderer(this);
    this.floatingTextRenderer = new FloatingTextRenderer(this);
    this.turnIndicatorRenderer = new TurnIndicatorRenderer(this);
    this.powerBarRenderer = new PowerBarRenderer(this, 24, 156);
    this.aimInput = new AimInputController(this);
    this.hudText = this.add.text(24, 20, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#f8fafc",
    }).setScrollFactor(0).setDepth(70);
    this.statusText = this.add.text(640, 86, "", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#fde68a",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(80);
    this.windIndicatorText = this.add.text(640, 24, "", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#bae6fd",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(80);

    this.store?.subscribe((updatedState) => {
      this.syncAimToActivePlayer(updatedState);
      this.renderState(updatedState);
    });
    this.syncAimToActivePlayer(state);
    this.renderState(state);
    this.cameraController.focusActivePlayer(state, 0);
    this.showTurnTransition(state.activeSlotId);
  }

  update(_time: number, deltaMilliseconds: number): void {
    if (!this.aimInput) {
      return;
    }

    if (this.aimInput.consumeEscape()) {
      this.scene.start("RoomScene");
      return;
    }

    this.recoverIfProjectileStateStuck();
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
      this.updateAimElevation(activePlayer, deltaSeconds);
      this.moveActivePlayer(deltaSeconds);

      if (this.aimInput.consumeUndo()) {
        this.matchClient?.undoLastPreShotAction(state.matchId, state.activeSlotId);
      }

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
    this.lockedAngleDegrees = shooter.angleDegrees;
    this.powerChargeController.start(weapon.maxPower);
    this.matchClient.startChargingPower(shooter.slotId, this.lockedAngleDegrees);
    this.cameraController?.focusPlayer(shooter, 220);
  }

  private fireChargedShot(): void {
    const state = this.getState();
    const shooter = state.players.find((player) => player.slotId === state.activeSlotId);

    if (!shooter || !this.matchClient) {
      return;
    }

    const power = this.powerChargeController.stop();
    this.isAnimatingShot = true;
    this.soundController.playShotSound();
    const event = this.matchClient.submitShot({
      matchId: state.matchId,
      shooterSlotId: shooter.slotId,
      weaponId: shooter.weaponId,
      angleDegrees: this.lockedAngleDegrees,
      power,
    });
    this.pendingShotEvent = event;

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

  private updateAimElevation(activePlayer: MatchState["players"][number], deltaSeconds: number): void {
    const direction = this.aimInput?.getAimDirection() ?? 0;

    if (direction === 0 || !this.matchClient) {
      return;
    }

    const nextElevation =
      activePlayer.aimElevationDegrees + direction * gameplayTuning.aimSpeedDegreesPerSecond * deltaSeconds;
    this.matchClient.updateActivePlayerAimElevation(nextElevation);
  }

  private playResolvedShot(event: ShotResolvedEvent): void {
    const weapon = this.weaponRegistry.getWeapon(event.weaponId);
    let finalized = false;
    const finalizeOnce = (): void => {
      if (finalized) {
        return;
      }

      finalized = true;
      this.finalizeShotResolution(event, weapon.maxPower);
    };

    this.projectileRenderer?.animate(event.trajectory, () => {
      this.cameraController?.focusExplosion(event.explosionX, event.explosionY);
      this.cameraController?.shakeExplosion();
      this.soundController.playExplosionSound();
      const explosionVariant = event.matchEnded || event.damageResults.some((result) => result.killed) ? "firework" : "poof";
      this.explosionRenderer?.play(event.explosionX, event.explosionY, weapon.explosionRadius, () => {
        this.showDamageFeedback(event);
        finalizeOnce();
      }, explosionVariant);
    }, (point) => {
      this.cameraController?.followProjectile(point.x, point.y);
      this.projectileTrailRenderer?.addPoint(point.x, point.y);
    });

    this.time.delayedCall(Math.max(2500, event.trajectory.length * 30), finalizeOnce);
  }

  private finalizeShotResolution(event: ShotResolvedEvent, weaponMaxPower: number): void {
    this.isAnimatingShot = false;
    this.pendingShotEvent = undefined;
    this.powerChargeController.start(weaponMaxPower);
    this.powerChargeController.stop();
    const state = this.getState();

    if (state.phase === "ProjectileInFlight") {
      this.forceRecoveredPhase(event);
    }

    const finalizedState = this.getState();
    this.renderState(finalizedState);

    if (finalizedState.phase === "MatchEnded") {
      this.cameraController?.focusMatchEnd(finalizedState, event.explosionX, event.explosionY);
    } else {
      this.cameraController?.focusActivePlayer(finalizedState);
      this.showTurnTransition(finalizedState.activeSlotId);
      this.soundController.playTurnSound();
    }
  }

  private recoverIfProjectileStateStuck(): void {
    if (this.isAnimatingShot || this.pendingShotEvent || !this.store) {
      return;
    }

    const state = this.store.getState();

    if (state.phase !== "ProjectileInFlight") {
      return;
    }

    this.store.setState({ ...state, phase: state.winnerSlotId || state.winnerTeamId ? "MatchEnded" : "Aiming" });
  }

  private forceRecoveredPhase(event: ShotResolvedEvent): void {
    if (!this.store) {
      return;
    }

    const state = this.store.getState();

    if (event.matchEnded) {
      this.store.setState({
        ...state,
        phase: "MatchEnded",
        winnerSlotId: event.winnerSlotId,
        winnerTeamId: event.winnerTeamId,
      });
      return;
    }

    this.store.setState({
      ...state,
      phase: "Aiming",
      activeSlotId: event.nextTurnSlotId ?? state.activeSlotId,
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
    this.turnIndicatorRenderer?.render(state);

    const activePlayer = state.players.find((player) => player.slotId === state.activeSlotId);
    const weapon = activePlayer ? this.weaponRegistry.getWeapon(activePlayer.weaponId) : undefined;
    const angle = activePlayer?.angleDegrees ?? this.aimInput?.getAngle() ?? 0;
    const aimElevation = activePlayer?.aimElevationDegrees ?? 0;
    const power = this.powerChargeController.getPower();
    const activeName = activePlayer?.playerName ?? "None";
    const remainingMove = activePlayer
      ? Math.max(0, MAX_MOVE_DISTANCE_PER_TURN - activePlayer.movedDistanceThisTurn)
      : 0;

    this.powerBarRenderer?.render(power, weapon?.maxPower ?? 100, state.phase === "ChargingPower");
    this.windIndicatorText?.setText(this.getWindIndicator(state));
    this.hudText?.setText([
      `Mode: ${state.mode}`,
      `Active: ${activeName}`,
      `Phase: ${state.phase}`,
      `Aim: ${Math.round(aimElevation)} deg`,
      `Actual Angle: ${Math.round(angle)} deg`,
      `Power: ${Math.round(power)}`,
      `Move left: ${Math.round(remainingMove)} px`,
      `Undo: ${this.matchClient?.getUndoCount() ?? 0}`,
      `Wind: ${this.windService.formatWind(state.wind)}`,
      "UP/DOWN: Aim higher/lower  |  LEFT/RIGHT: Move  |  Z: Undo",
      "SPACE: Start Power  |  SPACE again: Fire  |  ESC: Back to Room",
    ]);

    if (state.phase === "MatchEnded") {
      this.statusText?.setText(`${this.getWinnerLabel(state)} Wins!\nPress ESC to return to Room`);
    } else {
      this.statusText?.setText(this.isAnimatingShot ? "Shot in flight..." : "");
    }
  }

  private showDamageFeedback(event: ShotResolvedEvent): void {
    const state = this.getState();

    for (const result of event.damageResults) {
      const target = state.players.find((player) => player.slotId === result.targetSlotId);

      if (!target) {
        continue;
      }

      this.floatingTextRenderer?.show(target.x, target.y - 76, result.killed ? `-${result.damage} KO` : `-${result.damage}`);
      this.playerRenderer?.flash(result.targetSlotId, result.killed);
      this.soundController.playHitSound();
    }
  }

  private showTurnTransition(slotId: string): void {
    const player = this.getState().players.find((candidate) => candidate.slotId === slotId);

    if (player && player.isAlive) {
      this.turnIndicatorRenderer?.showTurnText(player.playerName);
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

  private getWindIndicator(state: MatchState): string {
    if (state.wind.direction === 0 || state.wind.strength === 0) {
      return "Wind: Calm";
    }

    const arrow = state.wind.direction > 0 ? "---->" : "<----";
    const repeats = Math.max(1, Math.ceil(state.wind.strength / 6));
    return `Wind: ${arrow.repeat(repeats)} ${state.wind.strength}`;
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
