/**
 * Bloque le curseur en mode déplacement (FPS-style mouse look) et le libère
 * en mode assis. Utilise l'API Pointer Lock du navigateur.
 *
 * Quand le curseur est bloqué, on lit `e.movementX` / `e.movementY` pour faire
 * tourner la caméra (mise à jour directe de alpha/beta de l'ArcRotateCamera).
 *
 * L'API Pointer Lock exige un geste utilisateur pour se déclencher → on bloque
 * uniquement sur clic du canvas. Côté code on appelle `enableFreeLook()` /
 * `disableFreeLook()` pour autoriser ou couper ce comportement selon le mode.
 */
const SENSITIVITY = 0.003;
const BETA_MIN = 0.1;
const BETA_MAX = Math.PI - 0.1;

export class PointerLockController {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.enabled = false;   // est-ce qu'on autorise le lock (mode libre) ?
    this.locked = false;    // est-ce qu'il est actuellement actif ?

    this._onClick = () => {
      if (this.enabled && !this.locked) {
        this.canvas.requestPointerLock();
      }
    };

    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
    };

    this._onMouseMove = (e) => {
      if (!this.locked) return;
      this.camera.alpha -= e.movementX * SENSITIVITY;
      const newBeta = this.camera.beta - e.movementY * SENSITIVITY;
      this.camera.beta = Math.max(BETA_MIN, Math.min(BETA_MAX, newBeta));
    };

    canvas.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  enableFreeLook() {
    this.enabled = true;
  }

  disableFreeLook() {
    this.enabled = false;
    if (this.locked) {
      document.exitPointerLock();
    }
  }
}