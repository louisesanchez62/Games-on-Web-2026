import { Vector3 } from '@babylonjs/core';
import { GameStationCameraView } from './GameStationCameraView.js';
import { GameStationLabels } from './GameStationLabels.js';

const INTERACTION_RADIUS = 1.5;

export class GameStation {
  constructor(scene, tableNode, chairNodes, gameLabel = '') {
    this.scene = scene;
    this.tableNode = tableNode;
    this.gameLabel = gameLabel;
    this.chairs = chairNodes;
    this.chairPositions = chairNodes.map((c) => c.getAbsolutePosition().clone());
    const camAnchor = scene.getTransformNodeByName(`camera_${tableNode.name.toLowerCase()}`);
    this.cameraAnchor = camAnchor || tableNode;
    this.cameraView = new GameStationCameraView(this);
    this.labels = new GameStationLabels(this);
    this.labels.build();
  }

  findChairInRange(playerPosition) {
    let closest = -1;
    let closestDist = INTERACTION_RADIUS;
    for (let i = 0; i < this.chairPositions.length; i++) {
      const dist = Vector3.Distance(playerPosition, this.chairPositions[i]);
      if (dist < closestDist) {
        closest = i;
        closestDist = dist;
      }
    }
    return closest;
  }

  getCameraView(chairIndex) {
    return this.cameraView.get(chairIndex);
  }

  highlight(chairIndex) {
    this.labels.highlight(chairIndex);
  }

  // À surcharger
  activate(chairIndex) {}
  deactivate() {}
}
