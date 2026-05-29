import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
} from '@babylonjs/gui';
import { ChipWallet } from '../../../../economy/ChipWallet.js';

export class BlackjackUI {
  constructor(scene) {
    this.adt = AdvancedDynamicTexture.CreateFullscreenUI('blackjackUI', true, scene);
    this._unsubscribeWallet = null;
    this._onHit   = null;
    this._onStand = null;
    this._onDeal  = null;

    // ── Panneau principal ────────────────────────────────────────────
    this.panel = new Rectangle('bj_panel');
    this.panel.verticalAlignment   = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.width        = '460px';
    this.panel.height       = '180px';
    this.panel.paddingBottom = '20px';
    this.panel.thickness    = 0;
    this.panel.background   = 'rgba(18, 24, 22, 0.78)';
    this.panel.cornerRadius = 18;
    this.panel.shadowColor = 'rgba(0, 0, 0, 0.45)';
    this.panel.shadowBlur = 12;
    this.panel.shadowOffsetX = 0;
    this.panel.shadowOffsetY = 4;
    this.adt.addControl(this.panel);

    this._inner = new StackPanel('bj_inner');
    this._inner.width      = '460px';
    this._inner.background = 'transparent';
    this._inner.spacing    = 0;
    this._inner.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.addControl(this._inner);

    // ── Titre centré ─────────────────────────────────────────────────
    this._titleBar = new Rectangle('bj_title_bar');
    this._titleBar.height     = '42px';
    this._titleBar.width      = '460px';
    this._titleBar.thickness  = 0;
    this._titleBar.background = 'transparent';
    this._inner.addControl(this._titleBar);

    this.titleText = new TextBlock('bj_title', 'À vous de jouer');
    this.titleText.color      = '#e8e8e0';
    this.titleText.fontSize   = 18;
    this.titleText.fontWeight = 'bold';
    this._titleBar.addControl(this.titleText);

    // ── Score ─────────────────────────────────────────────────────────
    this._scoreBar = new Rectangle('bj_score_bar');
    this._scoreBar.height     = '30px';
    this._scoreBar.width      = '460px';
    this._scoreBar.thickness  = 0;
    this._scoreBar.background = 'transparent';
    this._inner.addControl(this._scoreBar);

    this.info = new TextBlock('bj_info', '');
    this.info.color    = '#90c8a0';
    this.info.fontSize = 14;
    this.info.fontWeight = 'bold';
    this._scoreBar.addControl(this.info);

    // ── Statut (messages d'état) ──────────────────────────────────────
    this.status = new TextBlock('bj_status', '');
    this.status.height   = '28px';
    this.status.width    = '400px';
    this.status.color    = '#ffd700';
    this.status.fontSize = 13;
    this.status.textWrapping = true;
    this.status.outlineColor = 'black';
    this.status.outlineWidth = 1;
    this._inner.addControl(this.status);

    // ── Rangée de boutons ─────────────────────────────────────────────
    this._btnRow = new StackPanel('bj_btn_row');
    this._btnRow.isVertical = false;
    this._btnRow.height     = '54px';
    this._btnRow.width      = '460px';
    this._btnRow.spacing    = 12;
    this._btnRow.paddingLeft  = '16px';
    this._btnRow.paddingRight = '16px';
    this._btnRow.paddingBottom = '10px';
    this._btnRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._inner.addControl(this._btnRow);

    this.hitButton   = this._makeBtn('bj_hit',   'Tirer',  190, 42);
    this.standButton = this._makeBtn('bj_stand', 'Rester', 190, 42);
    this.dealButton  = this._makeBtn('bj_deal',  '↺ Nouvelle donne', 400, 42, '#1a2a1a', '#88cc88');
    this.dealButton.isVisible = false;

    this._btnRow.addControl(this.hitButton);
    this._btnRow.addControl(this.standButton);
    this._inner.addControl(this.dealButton);

    this.hitButton.onPointerUpObservable.add(()  => { if (this._onHit)   this._onHit(); });
    this.standButton.onPointerUpObservable.add(() => { if (this._onStand) this._onStand(); });
    this.dealButton.onPointerUpObservable.add(()  => { if (this._onDeal)  this._onDeal(); });

    this._unsubscribeWallet = ChipWallet.subscribe((s) => this._onWallet(s));
  }

  _makeBtn(id, text, width, height, bg = '#163d22', textColor = '#a0e8b0') {
    const b = Button.CreateSimpleButton(id, text);
    b.width = `${width}px`;
    b.height = `${height}px`;
    b.color = 'rgba(255, 255, 255, 0.18)';
    b.background = bg;
    b.thickness = 0;
    b.cornerRadius = 9;
    b.fontSize = 16;
    b.fontWeight = 'bold';
    if (b.textBlock) {
      b.textBlock.color = textColor;
      b.textBlock.fontWeight = 'bold';
    }
    return b;
  }

  _onWallet(state) {
    if (state.won) {
      this.titleText.text  = 'VICTOIRE !';
      this.titleText.color = '#7bff7b';
    } else if (state.gameOver) {
      this.titleText.text  = 'Game Over';
      this.titleText.color = '#ff7676';
    }
  }

  setStatus(text) {
    const scoreMatch = text.match(/Vous\s*:\s*(\d+)\s*\|\s*Croupier\s*:\s*(\d+)/i);
    if (scoreMatch) {
      this.info.text = `Score :  Vous : ${scoreMatch[1]}  |  IA : ${scoreMatch[2]}`;
      return;
    }
    this.status.text = text;
    // Actualiser le titre selon l'état
    if (text.includes('VICTOIRE')) {
      this.titleText.text  = 'VICTOIRE !';
      this.titleText.color = '#7bff7b';
    } else if (text.includes('GAME OVER') || text.includes('plus de jetons')) {
      this.titleText.text  = 'Game Over';
      this.titleText.color = '#ff7676';
    } else if (text.includes('Votre tour')) {
      this.titleText.text  = 'À vous de jouer';
      this.titleText.color = '#e8e8e0';
    } else if (text.includes('Croupier')) {
      this.titleText.text  = 'Croupier joue…';
      this.titleText.color = '#e8d080';
    }
  }

  setInfo(text) {
    // "Vous: X | Croupier: Y" → zone score
    const scoreMatch = text.match(/Vous\s*:\s*(\d+)\s*\|\s*Croupier\s*:\s*(\d+)/i);
    if (scoreMatch) {
      this.info.text = `Score :  Vous : ${scoreMatch[1]}  |  IA : ${scoreMatch[2]}`;
    } else {
      this.info.text = text;
    }
  }

  setActionEnabled(enabled) {
    this.hitButton.isEnabled   = enabled;
    this.standButton.isEnabled = enabled;
    this.hitButton.background   = enabled ? '#163d22' : '#0e2318';
    this.standButton.background = enabled ? '#163d22' : '#0e2318';
    this.hitButton.color   = enabled ? '#a0e8b0' : '#4a6a4a';
    this.standButton.color = enabled ? '#a0e8b0' : '#4a6a4a';
  }

  showDealButton(show) {
    this.dealButton.isVisible   = show;
    this._btnRow.isVisible      = !show;
  }

  onHit(cb)   { this._onHit   = cb; }
  onStand(cb) { this._onStand = cb; }
  onDeal(cb)  { this._onDeal  = cb; }

  dispose() {
    if (this._unsubscribeWallet) this._unsubscribeWallet();
    this.adt.dispose();
  }
}