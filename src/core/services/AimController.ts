import { gameplayTuning } from "../data/gameplayTuning";
import { clamp } from "../../shared/math";

export class AimController {
  increaseAngle(currentElevationDegrees: number): number {
    return this.clampElevation(currentElevationDegrees + gameplayTuning.angleStepDegrees);
  }

  decreaseAngle(currentElevationDegrees: number): number {
    return this.clampElevation(currentElevationDegrees - gameplayTuning.angleStepDegrees);
  }

  increaseAngleByDelta(currentElevationDegrees: number, deltaSeconds: number): number {
    return this.clampElevation(currentElevationDegrees + gameplayTuning.aimSpeedDegreesPerSecond * deltaSeconds);
  }

  decreaseAngleByDelta(currentElevationDegrees: number, deltaSeconds: number): number {
    return this.clampElevation(currentElevationDegrees - gameplayTuning.aimSpeedDegreesPerSecond * deltaSeconds);
  }

  clampElevation(elevationDegrees: number): number {
    return clamp(elevationDegrees, 0, 90);
  }

  getActualAngleDegrees(facingDirection: 1 | -1, aimElevationDegrees: number): number {
    const elevation = this.clampElevation(aimElevationDegrees);
    return facingDirection === 1 ? elevation : 180 - elevation;
  }
}
