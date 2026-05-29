import { MeshBuilder, DynamicTexture, StandardMaterial, Color3 } from '@babylonjs/core';

const LABEL_WIDTH = 0.26;
const LABEL_HEIGHT = 0.06;

export class PokerOpponentLabels {
  constructor(renderer) {
    this.r = renderer;
    this._labelResources = [];
  }

  create(text) {
    if (!this.r.root) return null;
    const safeText = String(text ?? '').slice(0, 16);
    
    const label = MeshBuilder.CreatePlane(`pokerLabel_${safeText}`, { width: LABEL_WIDTH, height: LABEL_HEIGHT }, this.r.scene);
    label.parent = this.r.root;
    label.isPickable = false;

    const texture = new DynamicTexture(`pokerLabelTex_${safeText}`, { width: 256, height: 64 }, this.r.scene, true);
    texture.hasAlpha = true;
    texture.drawText(safeText, null, 44, 'bold 36px Arial', '#f6d37a', 'rgba(0, 0, 0, 0)', true);

    const material = new StandardMaterial(`pokerLabelMat_${safeText}`, this.r.scene);
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.emissiveColor = new Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.disableLighting = true;
    label.material = material;

    this._labelResources.push({ material, texture });
    return label;
  }

  dispose() {
    for (const resource of this._labelResources) {
      if (resource.texture) resource.texture.dispose();
      if (resource.material) resource.material.dispose();
    }
    this._labelResources = [];
  }
}