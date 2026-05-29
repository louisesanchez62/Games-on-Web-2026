import {
  AdvancedDynamicTexture,
  StackPanel,
  TextBlock,
  Button,
  Control,
  Rectangle,
} from '@babylonjs/gui';
import { ChipWallet } from '../../economy/ChipWallet.js';

export class SlotMachineUI {
  constructor(scene, spinCost) {
    this.adt = AdvancedDynamicTexture.CreateFullscreenUI('slotUI', true, scene);
    this._onSpin = null;
    this._unsubscribeWallet = null;

    // Panneau principal
    this.panel = new StackPanel('slot_panel');
    this.panel.verticalAlignment   = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.paddingBottom = '36px';
    this.panel.width = '500px';
    this.panel.spacing  = 10;
    this.panel.background   = 'transparent';
    this.panel.cornerRadius = 20;
    this.panel.paddingLeft = '20px';
    this.panel.paddingRight  = '20px';
    this.panel.paddingTop = '16px';
    this.panel.paddingBottom = '18px';
    this.panel.thickness = 0;
    this.panel.color = 'transparent';
    this.adt.addControl(this.panel);

    // Titre
    this.title = new TextBlock('slot_title', '🎰  MACHINE À SOUS  🎰');
    this.title.color = '#ffe39d';
    this.title.fontSize  = 20;
    this.title.fontWeight = 'bold';
    this.title.height = '34px';
    this.title.outlineColor = 'black';
    this.title.outlineWidth = 2;
    this.panel.addControl(this.title);

    // Séparateur
    const sep = new Rectangle('slot_sep');
    sep.height = '2px';
    sep.width = '90%';
    sep.thickness  = 0;
    sep.background = '#caa85b';
    this.panel.addControl(sep);

    // Rouleaux
    this.reelsBox = new Rectangle('slot_reels_box');
    this.reelsBox.height= '74px';
    this.reelsBox.width = '380px';
    this.reelsBox.cornerRadius = 14;
    this.reelsBox.background = 'transparent';
    this.reelsBox.thickness  = 1;
    this.reelsBox.color = 'rgba(216, 183, 106, 0.35)';
    this.panel.addControl(this.reelsBox);

    this.reelsText = new TextBlock('slot_reels', '🎰  |  🎰  |  🎰');
    this.reelsText.color    = '#fff8e6';
    this.reelsText.fontSize = 28;
    this.reelsText.fontWeight = 'bold';
    this.reelsBox.addControl(this.reelsText);

    // Statut
    this.status = new TextBlock('slot_status', `Misez ${spinCost} jetons — Bonne chance !`);
    this.status.color = '#f0d27d';
    this.status.fontSize = 15;
    this.status.height = '32px';
    this.status.outlineColor = 'black';
    this.status.outlineWidth = 1;
    this.panel.addControl(this.status);

    // Info jetons
    this.chipInfo = new TextBlock('slot_chips', '');
    this.chipInfo.color = '#b8e8b8';
    this.chipInfo.fontSize = 13;
    this.chipInfo.height = '22px';
    this.panel.addControl(this.chipInfo);

    // Bouton jouer
    this.spinButton = Button.CreateSimpleButton('slot_spin', `▶  Jouer  (${spinCost} jetons)`);
    this.spinButton.width = '240px';
    this.spinButton.height = '50px';
    this.spinButton.color = 'white';
    this.spinButton.background  = '#2c7141';
    this.spinButton.thickness = 2;
    this.spinButton.cornerRadius = 10;
    this.spinButton.fontSize    = 17;
    this.spinButton.fontWeight  = 'bold';
    this.panel.addControl(this.spinButton);

    this.spinButton.onPointerUpObservable.add(() => {
      if (this._onSpin) this._onSpin();
    });

    this._unsubscribeWallet = ChipWallet.subscribe((state) => this._updateChipState(state));
  }

  _updateChipState(state) {
    this.chipInfo.text = `Jetons : ${state.chips} / ${state.maxChips}`;
    if (state.won) {
      this.status.text = 'VICTOIRE — 1000 jetons atteints !';
      this.chipInfo.color = '#7bff7b';
      this.spinButton.isEnabled = false;
      return;
    }
    if (state.gameOver) {
      this.status.text = 'Plus de jetons !';
      this.chipInfo.color = '#ff5555';
      this.spinButton.isEnabled = false;
      return;
    }
    this.chipInfo.color = '#90ee90';
    this.spinButton.isEnabled = true;
  }

  setStatus(text) { this.status.text = text; }
  setReels(text)  { this.reelsText.text = text; }
  onSpin(cb){ this._onSpin = cb; }

  dispose() {
    if (this._unsubscribeWallet) this._unsubscribeWallet();
    this.adt.dispose();
  }
}