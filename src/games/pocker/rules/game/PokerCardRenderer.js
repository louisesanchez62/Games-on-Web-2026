import { TransformNode } from '@babylonjs/core';
import { CardAssetLibrary } from '../../../black-jack/rules/game/CardAssetLibrary.js';
import { PokerCardLayout } from './PokerCardLayout.js';
import { PokerOpponentLabels } from './PokerOpponentLabels.js';

export class PokerCardRenderer {
  constructor(scene) {
    this.scene = scene;
    this.root = null;
    this.heroMeshes = [];
    this.boardMeshes = [];
    this.opponentHands = [];
    this.layout = CardAssetLibrary.getLayout();
    this.layoutEngine = new PokerCardLayout(this);
    this.labelFactory = new PokerOpponentLabels(this);
  }

  setLayout(layout) { 
    this.layout = layout; 
  }
  
  ensureRoot() { 
    if (!this.root) this.root = new TransformNode('pockerCards', this.scene); 
  }

  clear() {
    if (!this.root) return;
    this.root.getChildren().forEach((node) => node.dispose());
    this.labelFactory.dispose();
    this.heroMeshes = [];
    this.boardMeshes = [];
    this.opponentHands = [];
  }

  dispose() {
    if (this.root) this.root.dispose();
    this.root = null;
    this.layoutEngine.dispose();
    this.labelFactory.dispose();
    this.heroMeshes = [];
    this.boardMeshes = [];
    this.opponentHands = [];
  }

  render({ heroCards = [], communityCards = [], opponentHands = [] }) {
    this.ensureRoot();
    this.clear();
    
    for (const card of heroCards) this._addCard(card, this.heroMeshes);
    for (const card of communityCards) this._addCard(card, this.boardMeshes);
    
    for (const hand of opponentHands) {
      const meshes = [];
      for (const card of hand.cards) this._addCard(card, meshes);
      
      const labelMesh = this.labelFactory.create(hand.id);
      this.opponentHands.push({ 
        meshes, 
        folded: hand.folded, 
        revealed: hand.revealed, 
        label: labelMesh 
      });
    }
    
    this.layoutCards();
  }

  layoutCards() { 
    this.layoutEngine.layoutCards(); 
  }

  _addCard(card, targetList) {
    if (!this.root) return null;
    const clone = CardAssetLibrary.createCardClone(card, this.root);
    if (!clone) return null;
    targetList.push(clone);
    return clone;
  }
}