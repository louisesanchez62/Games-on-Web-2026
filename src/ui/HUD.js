import { Control, Image, Rectangle, StackPanel, TextBlock } from '@babylonjs/gui';
import { ChipWallet } from '../economy/ChipWallet.js';
import { showVictoryOverlay } from './VictoryOverlay.js';

const CHIP_FILL_WIDTH = 200;

export class HUD {
  constructor(adt) {
    this.adt = adt;

    this.interactPrompt = new TextBlock('interactPrompt');
    this.interactPrompt.text = '';
    this.interactPrompt.color = 'white';
    this.interactPrompt.fontSize = 22;
    this.interactPrompt.outlineColor = 'black';
    this.interactPrompt.outlineWidth = 3;
    this.interactPrompt.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.interactPrompt.paddingBottom = '80px';
    this.adt.addControl(this.interactPrompt);

    this._buildChipMeter();
    this._unsubscribeWallet = ChipWallet.subscribe((s) => this._updateChipMeter(s));
  }

  showInteractPrompt(text) { this.interactPrompt.text = text; }
  hideInteractPrompt(){ this.interactPrompt.text = ''; }

  _buildChipMeter() {
    this.chipPanel = new StackPanel('chipPanel');
    this.chipPanel.isVertical = false;
    this.chipPanel.width = '300px';
    this.chipPanel.height = '58px';
    this.chipPanel.paddingTop = '8px';
    this.chipPanel.paddingLeft = '10px';
    this.chipPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.chipPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.chipPanel.spacing = 10;
    this.chipPanel.background = 'transparent';
    this.chipPanel.cornerRadius = 18;
    this.chipPanel.thickness = 0;
    this.chipPanel.color = 'transparent';
    this.adt.addControl(this.chipPanel);

    this.chipIcon = new Image('chipIcon', '/assets/jeton.png');
    this.chipIcon.width = '34px';
    this.chipIcon.height = '34px';
    this.chipPanel.addControl(this.chipIcon);

    this.chipMeterColumn = new StackPanel('chipMeterColumn');
    this.chipMeterColumn.width = '220px';
    this.chipMeterColumn.height = '46px';
    this.chipMeterColumn.spacing = 5;
    this.chipPanel.addControl(this.chipMeterColumn);

    this.chipText = new TextBlock('chipText');
    this.chipText.height = '16px';
    this.chipText.color = '#f7f2e6';
    this.chipText.fontSize = 13;
    this.chipText.fontWeight = 'bold';
    this.chipText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.chipText.outlineColor = 'rgba(0,0,0,0.8)';
    this.chipText.outlineWidth = 2;
    this.chipMeterColumn.addControl(this.chipText);

    this.chipBarTrack = new Rectangle('chipBarTrack');
    this.chipBarTrack.height = '12px';
    this.chipBarTrack.width = `${CHIP_FILL_WIDTH}px`;
    this.chipBarTrack.thickness = 1;
    this.chipBarTrack.cornerRadius = 6;
    this.chipBarTrack.background = 'rgba(255,255,255,0.06)';
    this.chipBarTrack.color = 'rgba(255, 220, 150, 0.14)';
    this.chipBarTrack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.chipMeterColumn.addControl(this.chipBarTrack);

    this.chipBarFill = new Rectangle('chipBarFill');
    this.chipBarFill.height = '8px';
    this.chipBarFill.width = '200px';
    this.chipBarFill.thickness = 0;
    this.chipBarFill.background = '#f0c35c';
    this.chipBarFill.cornerRadius = 5;
    this.chipBarFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.chipBarTrack.addControl(this.chipBarFill);
  }

  _updateChipMeter({ chips, maxChips, gameOver, won }) {
    const ratio = maxChips > 0 ? Math.max(0, Math.min(1, chips / maxChips)) : 0;
    const fillPx = Math.max(10, Math.round(CHIP_FILL_WIDTH * ratio));

    if (won) {
      this.chipText.text = `VICTOIRE — ${chips} jetons`;
      this.chipText.color = '#7bff7b';
      this.chipBarFill.background = '#5cff8c';
      showVictoryOverlay();
    } else if (gameOver) {
      this.chipText.text = `${chips} jetons`;
      this.chipText.color = '#ff7676';
      this.chipBarFill.background = '#8a1f2d';
    } else {
      this.chipText.text = `${chips} jetons`;
      this.chipText.color = 'white';
      this.chipBarFill.background = '#d5aa3b';
    }

    this.chipBarFill.width = `${fillPx}px`;
  }
}