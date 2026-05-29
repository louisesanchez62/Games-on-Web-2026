import { MeshBuilder, Vector3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';

const VIEW_DISTANCE = 1.25;
const VIEW_PLAYER_HEIGHT = 0;
const VIEW_DEALER_HEIGHT = 0.28;
const LABEL_LINK_OFFSET_X = 0;
const LABEL_LINK_OFFSET_Y = 0;

export class BlackjackLabelOverlay {
  constructor(renderer) {
    this.renderer = renderer;
    this.adt = null;
    this.playerAnchor = null;
    this.dealerAnchor = null;
    this.playerLabel = null;
    this.dealerLabel = null;
  }

  ensure() {
    if (!this.adt) this.adt = AdvancedDynamicTexture.CreateFullscreenUI('blackjackLabels', true, this.renderer.scene);
    if (!this.playerAnchor) this.playerAnchor = this._createAnchor('bj_anchor_player');
    if (!this.dealerAnchor) this.dealerAnchor = this._createAnchor('bj_anchor_dealer');
    if (!this.playerLabel) this.playerLabel = this._createLabel('VOUS', '#71d29a', this.playerAnchor);
    if (!this.dealerLabel) this.dealerLabel = this._createLabel('IA', '#f0c35c', this.dealerAnchor);
  }

  layout() {
    if (!this.playerAnchor || !this.dealerAnchor) return;
    const camera = this.renderer.scene.activeCamera;
    if (!camera) return;

    const forward = camera.getForwardRay().direction.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    const layout = this.renderer._getLayout();
    const spacing = (layout.spacing || 0.05) * 2;
    const labelPadding = Math.max(0.26, spacing * 1.6);

    const place = (anchor, meshes, rowHeight, fallbackX) => {
      const base = camera.position
        .add(forward.scale(VIEW_DISTANCE))
        .add(up.scale(rowHeight));
      if (meshes.length) {
        const startX = -((meshes.length - 1) * spacing) / 2;
        anchor.position.copyFrom(base.add(right.scale(startX - labelPadding)));
      } else {
        anchor.position.copyFrom(base.add(right.scale(fallbackX - labelPadding)));
      }
    };

    place(this.playerAnchor, this.renderer.playerMeshes, VIEW_PLAYER_HEIGHT, -0.28);
    place(this.dealerAnchor, this.renderer.dealerMeshes, VIEW_DEALER_HEIGHT, -0.28);
  }

  release() {
    if (this.playerAnchor) this.playerAnchor.dispose();
    if (this.dealerAnchor) this.dealerAnchor.dispose();
    this.playerAnchor = null;
    this.dealerAnchor = null;
  }

  dispose() {
    this.release();
    if (this.playerLabel) this.adt.removeControl(this.playerLabel);
    if (this.dealerLabel) this.adt.removeControl(this.dealerLabel);
    this.playerLabel = null;
    this.dealerLabel = null;
    if (this.adt) this.adt.dispose();
    this.adt = null;
  }

  _createAnchor(name) {
    const anchor = MeshBuilder.CreateBox(name, { size: 0.01 }, this.renderer.scene);
    anchor.parent = this.renderer.root;
    anchor.isPickable = false;
    anchor.visibility = 0;
    return anchor;
  }

  _createLabel(text, color, anchorMesh) {
    const label = new TextBlock(`${text}_label`);
    label.text = text;
    label.color = color;
    label.fontSize = 20;
    label.fontWeight = 'bold';
    label.outlineColor = 'black';
    label.outlineWidth = 3;
    this.adt.addControl(label);
    label.linkWithMesh(anchorMesh);
    label.linkOffsetX = LABEL_LINK_OFFSET_X;
    label.linkOffsetY = LABEL_LINK_OFFSET_Y;
    return label;
  }
}