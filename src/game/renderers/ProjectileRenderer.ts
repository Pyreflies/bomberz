import Phaser from "phaser";
import type { TrajectoryPoint } from "../../core/models/ShotResolvedEvent";

export class ProjectileRenderer {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  animate(points: TrajectoryPoint[], onComplete: () => void): void {
    const projectile = this.scene.add.circle(points[0]?.x ?? 0, points[0]?.y ?? 0, 7, 0xf8fafc).setDepth(20);
    let index = 0;

    const timer = this.scene.time.addEvent({
      delay: 12,
      loop: true,
      callback: () => {
        index += 3;
        const point = points[Math.min(index, points.length - 1)];

        if (point) {
          projectile.setPosition(point.x, point.y);
        }

        if (index >= points.length - 1) {
          timer.remove(false);
          projectile.destroy();
          onComplete();
        }
      },
    });
  }
}
