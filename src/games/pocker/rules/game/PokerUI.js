import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
} from '@babylonjs/gui';
import { ChipWallet } from '../../../../economy/ChipWallet.js';

const UI_FONT = 'Trebuchet MS';

export class PokerUI {
  constructor(scene) {
    this.adt = AdvancedDynamicTexture.CreateFullscreenUI('pockerUI', true, scene);
    this._onOpponentCount = null;
    this._onNewRound = null;
    this._onFold = null;
    this._onCallOrCheck = null;
    this._onRaise = null;
    this._onAllIn = null;
    this._unsubscribeWallet = null;

    // ── Panneau principal ancré en bas ──────────────────────────────
    this.panel = new Rectangle('poker_panel');
    this.panel.verticalAlignment   = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.width        = '820px';
    this.panel.height       = '210px';
    this.panel.paddingBottom = '18px';
    this.panel.thickness    = 1;
    this.panel.color        = 'rgba(255, 226, 179, 0.12)';
    this.panel.background   = 'rgba(11, 18, 17, 0.88)';
    this.panel.cornerRadius = 20;
    this.panel.shadowColor = 'rgba(0, 0, 0, 0.50)';
    this.panel.shadowBlur = 14;
    this.panel.shadowOffsetX = 0;
    this.panel.shadowOffsetY = 5;
    this.adt.addControl(this.panel);

    this._innerStack = new StackPanel('poker_inner');
    this._innerStack.spacing    = 4;
    this._innerStack.width      = '820px';
    this._innerStack.background = 'transparent';
    this._innerStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.panel.addControl(this._innerStack);

    // ── Barre supérieure : street / pot / statut ────────────────────
    this._topBar = new Rectangle('poker_topbar');
    this._topBar.height     = '40px';
    this._topBar.width      = '820px';
    this._topBar.thickness  = 0;
    this._topBar.background = 'rgba(18, 30, 24, 0.42)';
    this._innerStack.addControl(this._topBar);

    this._topBarRow = new StackPanel('poker_topbar_row');
    this._topBarRow.isVertical = false;
    this._topBarRow.width      = '800px';
    this._topBarRow.height     = '40px';
    this._topBarRow.spacing    = 0;
    this._topBar.addControl(this._topBarRow);

    // Gauche : street + pot
    this._streetLabel = new TextBlock('poker_street');
    this._streetLabel.width    = '390px';
    this._streetLabel.height   = '40px';
    this._streetLabel.color    = '#d8e9cf';
    this._streetLabel.fontSize = 15;
    this._streetLabel.fontWeight = 'bold';
    this._streetLabel.fontFamily = UI_FONT;
    this._streetLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._streetLabel.paddingLeft = '14px';
    this._topBarRow.addControl(this._streetLabel);

    // Droite : statut IA en cours
    this._statusRight = new TextBlock('poker_status_right');
    this._statusRight.width    = '410px';
    this._statusRight.height   = '40px';
    this._statusRight.color    = '#96a8a0';
    this._statusRight.fontSize = 13;
    this._statusRight.fontStyle = 'italic';
    this._statusRight.fontFamily = UI_FONT;
    this._statusRight.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._statusRight.paddingRight = '14px';
    this._topBarRow.addControl(this._statusRight);

    // ── Barre historique ────────────────────────────────────────────
    this._historyBar = new Rectangle('poker_history');
    this._historyBar.height     = '30px';
    this._historyBar.width      = '820px';
    this._historyBar.thickness  = 0;
    this._historyBar.background = 'rgba(10, 18, 18, 0.36)';
    this._innerStack.addControl(this._historyBar);

    this.info = new TextBlock('poker_info');
    this.info.height   = '30px';
    this.info.width    = '800px';
    this.info.color    = '#8eb89c';
    this.info.fontSize = 13;
    this.info.fontStyle = 'italic';
    this.info.fontFamily = UI_FONT;
    this.info.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.info.paddingLeft = '14px';
    this.info.textWrapping = true;
    this._historyBar.addControl(this.info);

    // ── Zone centrale : message action + sélecteur IA ───────────────
    this._centerRow = new StackPanel('poker_center_row');
    this._centerRow.isVertical = false;
    this._centerRow.height     = '52px';
    this._centerRow.width      = '820px';
    this._centerRow.spacing    = 8;
    this._centerRow.paddingLeft  = '16px';
    this._centerRow.paddingRight = '16px';
    this._innerStack.addControl(this._centerRow);

    // Message action courant (gauche)
    this.status = new TextBlock('poker_status_msg');
    this.status.width    = '760px';
    this.status.height   = '52px';
    this.status.color    = '#f0f2e6';
    this.status.fontSize = 14;
    this.status.fontFamily = UI_FONT;
    this.status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.status.textWrapping = true;
    this._centerRow.addControl(this.status);

    // Sélecteur nombre d'IA (droite)
    this.selectorRow = new StackPanel('poker_selector');
    this.selectorRow.isVertical = false;
    this.selectorRow.width      = '0px';
    this.selectorRow.height     = '0px';
    this.selectorRow.spacing    = 6;
    this.selectorRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._centerRow.addControl(this.selectorRow);
    this.selectorRow.isVisible = false;

    this.selectorLabel = new TextBlock('poker_selector_label');
    this.selectorLabel.text = 'Adversaires';
    this.selectorLabel.width = '92px';
    this.selectorLabel.height = '52px';
    this.selectorLabel.color = '#c9d8c5';
    this.selectorLabel.fontSize = 12;
    this.selectorLabel.fontFamily = UI_FONT;
    this.selectorLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.selectorRow.addControl(this.selectorLabel);

    this.countButtons = [];
    for (let n = 1; n <= 6; n++) {
      const btn = this._makeBtn(`pc_${n}`, `${n}`, 44, 30, '#14261a', '#bfebc9');
      btn.fontSize = 12;
      btn.onPointerUpObservable.add(() => {
        if (this._onOpponentCount) this._onOpponentCount(n);
      });
      this.selectorRow.addControl(btn);
      this.countButtons.push(btn);
    }

    // ── Rangée de boutons d'action ──────────────────────────────────
    this.actionsRow = new StackPanel('poker_actions');
    this.actionsRow.isVertical = false;
    this.actionsRow.height = '58px';
    this.actionsRow.width  = '820px';
    this.actionsRow.spacing = 10;
    this.actionsRow.paddingLeft  = '16px';
    this.actionsRow.paddingRight = '16px';
    this.actionsRow.paddingBottom = '12px';
    this.actionsRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._innerStack.addControl(this.actionsRow);

    // Se coucher — brun/rouge comme la maquette
    this.foldButton = this._makeBtn('pf', 'Se coucher', 142, 42, '#6b2b1d', '#ffd1b0');

    // Suivre / Check — vert
    this.callButton = this._makeBtn('pc', 'Suivre', 150, 42, '#1f5544', '#c1ffe2');

    // Relancer — vert
    this.raiseButton = this._makeBtn('pr', 'Relancer', 142, 42, '#1f6b3f', '#bbffbf');

    // All-in — foncé bleuté comme la maquette
    this.allInButton = this._makeBtn('pa', 'All In', 112, 42, '#2b2240', '#d5c7ff');

    // Nouvelle main — gris neutre
    this.newRoundButton = this._makeBtn('pn', '↺ Rejouer', 120, 42, '#2a2a2a', '#e0e0e0');

    this.actionsRow.addControl(this.foldButton);
    this.actionsRow.addControl(this.callButton);
    this.actionsRow.addControl(this.raiseButton);
    this.actionsRow.addControl(this.allInButton);
    this.actionsRow.addControl(this.newRoundButton);

    this.foldButton.onPointerUpObservable.add(() => { if (this._onFold) this._onFold(); });
    this.callButton.onPointerUpObservable.add(() => { if (this._onCallOrCheck) this._onCallOrCheck(); });
    this.raiseButton.onPointerUpObservable.add(() => { if (this._onRaise) this._onRaise(); });
    this.allInButton.onPointerUpObservable.add(() => { if (this._onAllIn) this._onAllIn(); });
    this.newRoundButton.onPointerUpObservable.add(() => { if (this._onNewRound) this._onNewRound(); });

    this.actionsRow.isVisible = false;
    this.setActionButtons([]);

    this._unsubscribeWallet = ChipWallet.subscribe((s) => this._updateChipInfo(s));
  }

  // ── helpers ─────────────────────────────────────────────────────
  _makeBtn(id, text, width, height, bg = '#163d22', textColor = '#90e8a8') {
    const b = Button.CreateSimpleButton(id, text);
    b.width        = `${width}px`;
    b.height       = `${height}px`;
    b.color        = 'rgba(255, 255, 255, 0.18)';
    b.background   = bg;
    b.thickness    = 1;
    b.cornerRadius = 10;
    b.fontSize     = 14;
    b.fontWeight   = 'bold';
    if (b.textBlock) {
      b.textBlock.color = textColor;
      b.textBlock.fontFamily = UI_FONT;
      b.textBlock.fontWeight = 'bold';
    }
    return b;
  }

  _setButtonState(button, enabled, enabledBg, disabledBg, enabledColor, disabledColor) {
    button.isEnabled = enabled;
    button.background = enabled ? enabledBg : disabledBg;
    button.color = enabled ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)';
    if (button.textBlock) {
      button.textBlock.color = enabled ? enabledColor : disabledColor;
    }
  }

  _updateChipInfo(state) {
    return;
  }

  // ── API publique ─────────────────────────────────────────────────

  /**
   * Met à jour la barre supérieure.
   * @param {string} street  Ex : "Pre-flop"
   * @param {number} pot
   * @param {string} statusMsg  Message côté droit (ex : "IA 1 réfléchit…")
   */
  setTopBar(street, pot, statusMsg = '') {
    this._streetLabel.text  = `${street}  |  Pot : ${pot}`;
    this._statusRight.text  = statusMsg;
  }

  setStatus(text) {
    // Compatibilité legacy : on décompose "Pre-flop | Pot: X | A payer: Y"
    // pour peupler la barre supérieure et le message central correctement.
    const potMatch    = text.match(/Pot\s*:\s*(\d+)/i);
    const payerMatch  = text.match(/A payer\s*:\s*(\d+)/i);
    const streetMatch = text.match(/^(Pre-flop|Flop|Turn|River|Showdown|Preflop)/i);

    if (streetMatch && potMatch) {
      this.setTopBar(streetMatch[0], potMatch[1], payerMatch ? `À payer : ${payerMatch[1]}` : '');
      this.status.text = '';
    } else {
      // message libre → côté droit de la barre + texte central
      this._statusRight.text = text.length > 40 ? text.slice(0, 38) + '…' : text;
      this.status.text = text;
    }
  }

  setInfo(text) {
    // Supprime le préfixe "Actions : "
    this.info.text = text.replace(/^Actions\s*:\s*/i, 'Historique : ');
  }

  setOpponentCount(count) {
    this.countButtons.forEach((b, i) => {
      const sel = i + 1 === count;
      b.background = sel ? '#2a5d3b' : '#14261a';
      b.thickness  = 1;
      b.color      = sel ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.08)';
      if (b.textBlock) {
        b.textBlock.color = sel ? '#ffffff' : '#bfebc9';
      }
    });
  }

  setSelectorEnabled(enabled) {
    this.countButtons.forEach((b) => { b.isEnabled = enabled; });
  }

  setSelectorVisible(visible) {
    this.selectorRow.isVisible = visible;
  }

  setActionsVisible(visible) {
    this.actionsRow.isVisible = visible;
  }

  setActionButtons(actions, toCall = 0) {
    const types = new Set(actions.map((a) => a.type));
    const callAction  = actions.find((a) => a.type === 'call');
    const raiseAction = actions.find((a) => a.type === 'raise');

    const canFold = types.has('fold');
    const canCall = types.has('call') || types.has('check');
    const canRaise = types.has('raise');

    this._setButtonState(this.foldButton, canFold, '#6b2b1d', '#2a1812', '#ffd1b0', '#8b6b5f');
    this._setButtonState(this.callButton, canCall, types.has('check') ? '#1f4258' : '#1f5544', '#10231d', '#c1ffe2', '#5f7e74');
    this._setButtonState(this.raiseButton, canRaise, '#1f6b3f', '#10231d', '#bbffbf', '#5f7e74');
    this._setButtonState(this.allInButton, canRaise, '#2b2240', '#16141f', '#d5c7ff', '#6b6282');

    // Texte dynamique
    if (types.has('check')) {
      this.callButton.textBlock.text = 'Check';
    } else if (callAction) {
      this.callButton.textBlock.text = `Suivre ${callAction.amount}`;
    } else {
      this.callButton.textBlock.text = `Suivre ${toCall}`;
    }

    if (raiseAction) {
      this.raiseButton.textBlock.text = `Relancer ${raiseAction.amount}`;
    } else {
      this.raiseButton.textBlock.text = 'Relancer';
    }

  }

  setNewRoundEnabled(enabled) {
    this._setButtonState(this.newRoundButton, enabled, '#2a2a2a', '#151515', '#e0e0e0', '#7a7a7a');
  }

  // ── Callbacks ────────────────────────────────────────────────────
  onOpponentCount(cb) { this._onOpponentCount = cb; }
  onNewRound(cb)      { this._onNewRound = cb; }
  onFold(cb)          { this._onFold = cb; }
  onCallOrCheck(cb)   { this._onCallOrCheck = cb; }
  onRaise(cb)         { this._onRaise = cb; }
  onAllIn(cb)         { this._onAllIn = cb; }

  dispose() {
    if (this._unsubscribeWallet) this._unsubscribeWallet();
    this.adt.dispose();
  }
}