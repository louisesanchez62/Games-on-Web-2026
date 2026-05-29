/**
 * Détecte si le joueur est près d'une chaise et orchestre les transitions
 * s'asseoir / quitter. États : free → transition → seated → transition → free.
 */
export class InteractionSystem {
  constructor(player, casino, cameraController, uiManager, inputManager, pointerLock) {
    this.player = player;
    this.casino = casino;
    this.cameraController = cameraController;
    this.uiManager = uiManager;
    this.input = inputManager;
    this.pointerLock = pointerLock;

    this._state = 'free';
    this._activeStation = null;
  }

  update() {
    if (this._state === 'transition') return;

    if (this._state === 'seated') {
      if (this.input.wasPressed('leave')) {
        this._leaveSeat();
      }
      return;
    }

    // Mode libre : trouve la chaise accessible la plus proche
    const playerPos = this.player.position;
    let foundStation = null;
    let foundIndex = -1;
    for (const station of this.casino.stations) {
      const i = station.findChairInRange(playerPos);
      if (i !== -1) {
        foundStation = station;
        foundIndex = i;
        break;
      }
    }

    // Highlight la chaise trouvée (toutes les autres en cyan via -1)
    for (const station of this.casino.stations) {
      station.highlight(station === foundStation ? foundIndex : -1);
    }

    if (foundStation) {
      this.uiManager.hud.showInteractPrompt("[F] s'asseoir");
      if (this.input.wasPressed('interact')) {
        this._takeSeat(foundStation, foundIndex);
      }
    } else if (!this.pointerLock.locked) {
      this.uiManager.hud.showInteractPrompt('[Clic] reprendre');
    } else {
      this.uiManager.hud.hideInteractPrompt();
    }
  }

  async _takeSeat(station, chairIndex) {
    this._state = 'transition';
    this.uiManager.hud.hideInteractPrompt();
    this.player.lockMovement();
    this.pointerLock.disableFreeLook();
    await this.cameraController.animateToView(station.getCameraView(chairIndex));
    station.activate(chairIndex);
    this._activeStation = station;
    this._state = 'seated';
    this.uiManager.hud.showInteractPrompt('[Echap] quitter');
  }

  async _leaveSeat() {
    this._state = 'transition';
    this.uiManager.hud.hideInteractPrompt();
    this._activeStation.deactivate();
    await this.cameraController.returnToPlayer();
    this.player.unlockMovement();
    this.pointerLock.enableFreeLook();
    this._activeStation = null;
    this._state = 'free';
  }
}