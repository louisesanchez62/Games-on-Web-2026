import { Vector3 } from '@babylonjs/core';

const EYE_HEIGHT = 0.8;

export class GameStationCameraView {
  constructor(station) {
    this.station = station;
  }

  get(chairIndex) {
    const zoom = 0.74;
    const topDownLift = 0.42;
    const inward = 0.15;
    const targetBias = 0.24;
    const chairPos = this.station.chairPositions[chairIndex].add(new Vector3(0, EYE_HEIGHT, 0));
    const tablePos = this.station.cameraAnchor.getAbsolutePosition();
    const basePos = Vector3.Lerp(tablePos, chairPos, zoom);
    const toCenter = tablePos.subtract(basePos);
    const inwardDir = toCenter.lengthSquared() > 1e-6 ? toCenter.normalize() : Vector3.Zero();
    const toChairFlat = new Vector3(chairPos.x - tablePos.x, 0, chairPos.z - tablePos.z);
    const toChairDir = toChairFlat.lengthSquared() > 1e-6 ? toChairFlat.normalize() : Vector3.Zero();
    return {
      position: basePos.add(new Vector3(0, topDownLift, 0)).add(inwardDir.scale(inward)),
      target: tablePos.add(toChairDir.scale(targetBias)),
    };
  }
}