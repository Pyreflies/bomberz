import { gameplayTuning } from "../data/gameplayTuning";
import { clamp } from "../../shared/math";

export class AimController {
  increaseAngle(currentAngleDegrees: number): number {
    return this.clampAngle(currentAngleDegrees + gameplayTuning.angleStepDegrees);
  }

  decreaseAngle(currentAngleDegrees: number): number {
    return this.clampAngle(currentAngleDegrees - gameplayTuning.angleStepDegrees);
  }

  clampAngle(angleDegrees: number): number {
    return clamp(angleDegrees, 0, 180);
  }
}
