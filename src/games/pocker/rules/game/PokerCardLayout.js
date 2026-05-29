import { Vector3, Quaternion, MeshBuilder, StandardMaterial, Color3, DynamicTexture } from '@babylonjs/core';
import { CardAssetLibrary } from '../../../black-jack/rules/game/CardAssetLibrary.js';

const VIEW_DISTANCE = 1.25;
const VIEW_MIN_DISTANCE = 0.75;
const VIEW_DISTANCE_RATIO = 0.75;
const VIEW_Y_OFFSET = -0.06;
const HERO_HEIGHT = -0.06;
const BOARD_HEIGHT = 0.18;
const BOARD_SCALE = 0.015;
const BOARD_PANEL_HEIGHT = 0.23;
const BOARD_PANEL_MIN_WIDTH = 0.82;
const BOARD_PANEL_MARGIN = 0.26;
const BOARD_PANEL_DEPTH = 0.026;
const OPPONENT_SCALE = 0.011;
const CARD_SCALE = 0.013;
const SPACING_MULT = 1.6;
const MIRROR_X = -1;
const OPPONENT_Y_OFFSET = -0.2;
const OPPONENT_X_SCALE = 0.68;
const LABEL_Y_OFFSET = 0.08;

const OPPONENT_POSITIONS = [
  [{ x: 0, y: 0.68 }],
  [{ x: -0.3, y: 0.6 }, { x: 0.3, y: 0.6 }],
  [{ x: -0.5, y: 0.56 }, { x: 0, y: 0.73 }, { x: 0.5, y: 0.56 }],
  [{ x: -0.62, y: 0.45 }, { x: -0.24, y: 0.74 }, { x: 0.24, y: 0.74 }, { x: 0.62, y: 0.45 }],
  [{ x: -0.68, y: 0.38 }, { x: -0.38, y: 0.66 }, { x: 0, y: 0.76 }, { x: 0.38, y: 0.66 }, { x: 0.68, y: 0.38 }],
  [{ x: -0.72, y: 0.34 }, { x: -0.48, y: 0.62 }, { x: -0.18, y: 0.76 }, { x: 0.18, y: 0.76 }, { x: 0.48, y: 0.62 }, { x: 0.72, y: 0.34 }],
];

export class PokerCardLayout {
  constructor(renderer) {
    this.r = renderer;
    this._boardPanelMaterial = null;
    this._boardPanelTexture = null;
  }

  layoutCards() {
    this._layoutRow(this.r.boardMeshes, BOARD_HEIGHT, 0, BOARD_SCALE);
    this._layoutRow(this.r.heroMeshes, HERO_HEIGHT);
    this._layoutOpponents();
    
    if (this.r.boardMeshes.length > 0) {
      this._createBoardFrame(this.r.boardMeshes.length);
    }
  }

  dispose() {
    if (this._boardPanelMaterial) this._boardPanelMaterial.dispose();
    if (this._boardPanelTexture) this._boardPanelTexture.dispose();
  }

  _layoutRow(meshes, height, centerX = 0, scaleMultiplier = CARD_SCALE, faceDown = false) {
    if (!meshes.length) return;
    const camera = this.r.scene.activeCamera;
    if (!camera) return;

    const basis = this._getViewBasis();
    const spacing = (basis.layout.spacing || 0.05) * SPACING_MULT * (scaleMultiplier / CARD_SCALE);
    const startX = -((meshes.length - 1) * spacing) / 2;
    const base = camera.position
      .add(basis.forward.scale(VIEW_DISTANCE))
      .add(basis.right.scale(centerX))
      .add(basis.up.scale(height + VIEW_Y_OFFSET));
    const rotation = this._getCardRotation(basis, faceDown);
    const scale = basis.layout.scale * scaleMultiplier;

    meshes.forEach((mesh, index) => {
      mesh.position.copyFrom(base.add(basis.right.scale(startX + index * spacing)));
      mesh.rotationQuaternion = rotation;
      mesh.scaling = new Vector3(scale * MIRROR_X, scale, scale);
    });
  }

  _layoutOpponents() {
    if (!this.r.opponentHands.length) return;
    const basis = this._getViewBasis();
    if (!basis.camera) return;
    
    const positions = OPPONENT_POSITIONS[Math.min(OPPONENT_POSITIONS.length, this.r.opponentHands.length) - 1];
    const labelRotation = Quaternion.FromLookDirectionLH(basis.forward.scale(-1), basis.up);
    const totalOpponents = this.r.opponentHands.length;
    const spreadFactor = totalOpponents >= 4 ? 0.82 : totalOpponents === 2 ? 0.9 : 1;

    this.r.opponentHands.forEach((hand, index) => {
      const position = positions[index] ?? positions[positions.length - 1];
      const height = position.y + OPPONENT_Y_OFFSET;
      const faceDown = hand.folded || !hand.revealed;
      const scaleFactor = 1 - Math.max(0, (totalOpponents - 2) * 0.08);
      const adjScale = OPPONENT_SCALE * Math.max(0.68, scaleFactor);
      const spacing = (basis.layout.spacing || 0.05) * SPACING_MULT * (adjScale / CARD_SCALE);
      const startX = -((hand.meshes.length - 1) * spacing) / 2;
      const labelPadding = Math.max(0.14, spacing * 1.3);
      const labelForwardOffset = 0.03;
      const labelHeight = height + VIEW_Y_OFFSET + 0.02;
      const centerX = position.x * spreadFactor;
      
      this._layoutRow(hand.meshes, height, centerX, adjScale, faceDown);
      
      if (hand.label) {
        const labelPos = basis.camera.position
          .add(basis.forward.scale(VIEW_DISTANCE - labelForwardOffset))
          .add(basis.right.scale(centerX + startX - labelPadding))
          .add(basis.up.scale(labelHeight));
        hand.label.position.copyFrom(labelPos);
        hand.label.rotationQuaternion = labelRotation;
      }
    });
  }

  _createBoardFrame(cardCount) {
    const basis = this._getViewBasis();
    if (!basis.camera) return;

    const spacing = (basis.layout.spacing || 0.05) * SPACING_MULT * (BOARD_SCALE / CARD_SCALE);
    const width = Math.max(BOARD_PANEL_MIN_WIDTH, (Math.max(cardCount, 5) - 1) * spacing + BOARD_PANEL_MARGIN);
    const height = BOARD_PANEL_HEIGHT;
    const center = basis.camera.position
      .add(basis.forward.scale(VIEW_DISTANCE + BOARD_PANEL_DEPTH))
      .add(basis.up.scale(BOARD_HEIGHT + VIEW_Y_OFFSET));
    const rotation = Quaternion.FromLookDirectionLH(basis.forward.scale(-1), basis.up);

    const panel = MeshBuilder.CreatePlane('pockerBoardPanel', { width, height }, this.r.scene);
    panel.parent = this.r.root;
    panel.position.copyFrom(center);
    panel.rotationQuaternion = rotation;
    panel.material = this._getBoardPanelMaterial();
    panel.isPickable = false;
  }

  _getViewBasis() {
    const camera = this.r.scene.activeCamera;
    const layout = this.r.layout || CardAssetLibrary.getLayout();
    if (!camera) return { camera: null, layout };
    
    const forward = camera.getForwardRay().direction.normalize();
    let right = Vector3.Cross(Vector3.Up(), forward);
    if (right.lengthSquared() < 1e-4) right = Vector3.Cross(new Vector3(0, 0, 1), forward);
    right.normalize();
    const up = Vector3.Cross(forward, right).normalize();
    const distanceToTarget = camera.target ? Vector3.Distance(camera.position, camera.target) : VIEW_DISTANCE;
    const viewDistance = Math.max(VIEW_MIN_DISTANCE, Math.min(VIEW_DISTANCE, distanceToTarget * VIEW_DISTANCE_RATIO));
    
    return { camera, layout, forward, right, up, viewDistance };
  }

  _getCardRotation(basis, faceDown) {
    const lookDirection = faceDown ? basis.forward : basis.forward.scale(-1);
    return Quaternion.FromLookDirectionLH(lookDirection, basis.up).multiply(basis.layout.rotation);
  }

  _getBoardPanelMaterial() {
    if (!this._boardPanelMaterial) {
      this._boardPanelMaterial = new StandardMaterial('pockerBoardPanelMat', this.r.scene);
      this._boardPanelTexture = new DynamicTexture('pockerBoardPanelTex', { width: 512, height: 256 }, this.r.scene, true);
      const ctx = this._boardPanelTexture.getContext();
      const size = this._boardPanelTexture.getSize();
      const width = size.width;
      const height = size.height;
      const radius = Math.round(Math.min(width, height) * 0.12);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(8, 20, 18, 0.25)';
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
      this._boardPanelTexture.update();
      this._boardPanelMaterial.diffuseTexture = this._boardPanelTexture;
      this._boardPanelMaterial.opacityTexture = this._boardPanelTexture;
      this._boardPanelMaterial.diffuseColor = new Color3(1, 1, 1);
      this._boardPanelMaterial.emissiveColor = new Color3(1, 1, 1);
      this._boardPanelMaterial.alpha = 1;
      this._boardPanelMaterial.backFaceCulling = false;
      this._boardPanelMaterial.disableLighting = true;
    }
    return this._boardPanelMaterial;
  }
}