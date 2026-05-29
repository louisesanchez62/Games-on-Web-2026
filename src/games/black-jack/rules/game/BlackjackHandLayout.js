import { Quaternion, Vector3 } from '@babylonjs/core';

const VIEW_DISTANCE = 1.25;
const VIEW_PLAYER_HEIGHT = 0;
const VIEW_DEALER_HEIGHT = 0.28;
const VIEW_SCALE = 0.02;
const VIEW_SPACING_MULT = 2;
const VIEW_MIRROR_X = -1;

export class BlackjackHandLayout {
  constructor(renderer) {
    this.renderer = renderer;
  }

  layout(meshes, isPlayer) {
    if (!meshes.length) return;
    const camera = this.renderer.scene.activeCamera;
    if (!camera) return;

    const layout = this.renderer._getLayout();
    const spacing = (layout.spacing || 0.05) * VIEW_SPACING_MULT;
    const startX = -((meshes.length - 1) * spacing) / 2;
    const forward = camera.getForwardRay().direction.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    const base = camera.position
      .add(forward.scale(VIEW_DISTANCE))
      .add(up.scale(isPlayer ? VIEW_PLAYER_HEIGHT : VIEW_DEALER_HEIGHT));
    const faceCam = Quaternion.FromLookDirectionLH(forward.scale(-1), up).multiply(layout.rotation);
    const scale = layout.scale * VIEW_SCALE;

    meshes.forEach((mesh, index) => {
      mesh.position.copyFrom(base.add(right.scale(startX + index * spacing)));
      mesh.rotationQuaternion = faceCam;
      mesh.scaling = new Vector3(scale * VIEW_MIRROR_X, scale, scale);
    });
  }
}