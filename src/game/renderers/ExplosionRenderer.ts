import Phaser from "phaser";

export class ExplosionRenderer {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(x: number, y: number, radius: number, onComplete: () => void, variant: "poof" | "firework" = "poof"): void {
    if (this.playSpritesheetExplosion(x, y, radius, onComplete, variant)) {
      return;
    }

    this.playFallbackExplosion(x, y, radius, onComplete);
  }

  private playSpritesheetExplosion(
    x: number,
    y: number,
    radius: number,
    onComplete: () => void,
    variant: "poof" | "firework",
  ): boolean {
    const textureKey = variant === "firework" ? "effect-firework" : "effect-poof";
    const animationKey = variant === "firework" ? "explosion-firework" : "explosion-poof";

    if (!this.scene.textures.exists(textureKey) || !this.scene.anims.exists(animationKey)) {
      return false;
    }

    const sprite = this.scene.add.sprite(x, y, textureKey).setDepth(35);
    const scale = Math.max(0.45, (radius * 2.1) / 256);
    let completed = false;
    const finish = (): void => {
      if (completed) {
        return;
      }

      completed = true;
      sprite.destroy();
      onComplete();
    };

    sprite.setScale(scale);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    sprite.play(animationKey);
    this.scene.time.delayedCall(1200, finish);
    return true;
  }

  private playFallbackExplosion(x: number, y: number, radius: number, onComplete: () => void): void {
    const flash = this.scene.add.circle(x, y, 18, 0xfff7ed, 0.95).setDepth(31);
    const core = this.scene.add.circle(x, y, 10, 0xf97316, 0.8).setDepth(30);
    const ring = this.scene.add.circle(x, y, 8, 0xf97316, 0.45).setStrokeStyle(4, 0xffedd5).setDepth(30);
    const smoke = this.scene.add.circle(x, y, radius * 0.35, 0x334155, 0.25).setDepth(29);

    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 440,
      ease: "Cubic.easeOut",
      onComplete: () => {
        ring.destroy();
        core.destroy();
        flash.destroy();
        smoke.destroy();
        onComplete();
      },
    });

    this.scene.tweens.add({
      targets: core,
      radius: radius * 0.55,
      alpha: 0,
      duration: 330,
      ease: "Cubic.easeOut",
    });

    this.scene.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 150,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: smoke,
      radius: radius * 0.85,
      alpha: 0,
      duration: 520,
      ease: "Sine.easeOut",
    });
  }
}
