import { TransformNode } from '@babylonjs/core';
import { CardAssetLibrary } from './CardAssetLibrary.js';
import { BlackjackHandLayout } from './BlackjackHandLayout.js';
import { BlackjackLabelOverlay } from './BlackjackLabelOverlay.js';

export class TableCardRenderer {
  constructor(scene, tableNode) {
    this.scene = scene;
    this.tableNode = tableNode;
    this.root = null;
    this.playerMeshes = [];
    this.dealerMeshes = [];
    this.layout = CardAssetLibrary.getLayout();
    this.handLayout = new BlackjackHandLayout(this);
    this.labelOverlay = new BlackjackLabelOverlay(this);
  }

  setLayout(layout) { this.layout = layout; }
  ensureRoot() { if (!this.root) this.root = new TransformNode('blackjackCards', this.scene); }

  clear() {
    if (!this.root) return;
    this.root.getChildren().forEach((node) => node.dispose());
    this.labelOverlay.release();
    this.playerMeshes = [];
    this.dealerMeshes = [];
  }

  dispose() {
    if (this.root) this.root.dispose();
    this.root = null;
    this.labelOverlay.dispose();
    this.playerMeshes = [];
    this.dealerMeshes = [];
  }

  renderHands(playerCards, dealerCards) {
    this.ensureRoot();
    this.clear();
    this.labelOverlay.ensure();

    for (const card of playerCards) this._addCard(card, this.playerMeshes);
    for (const card of dealerCards) this._addCard(card, this.dealerMeshes);

    this.layoutHands();
  }

  layoutHands() {
    this.handLayout.layout(this.playerMeshes, true);
    this.handLayout.layout(this.dealerMeshes, false);
    this.labelOverlay.layout();
  }

  _addCard(card, targetList) {
    if (!this.root) return null;
    const clone = CardAssetLibrary.createCardClone(card, this.root);
    if (!clone) return null;
    targetList.push(clone);
    return clone;
  }

  _getLayout() {
    return this.layout || CardAssetLibrary.getLayout();
  }
}
