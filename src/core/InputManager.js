/**
 * Gère les "actions" clavier. Pour les touches edge-triggered (interact, leave,
 * jump), wasPressed() renvoie true sur la seule frame où la touche passe de
 * relâchée à pressée. isDown() est continu (utile pour le déplacement).
 *
 * AZERTY : Z avant, S arrière, Q gauche, D droite, Espace saut.
 */
export class InputManager {
  constructor(scene) {
    this.scene = scene;

    this.actions = {
      forward:  ['z', 'Z'],
      back:     ['s', 'S'],
      left:     ['q', 'Q'],
      right:    ['d', 'D'],
      interact: ['f', 'F'],
      leave:    ['Escape'],
    };

    this._down = new Set();
    this._downPrev = new Set();

    window.addEventListener('keydown', (e) => this._down.add(e.key));
    window.addEventListener('keyup',   (e) => this._down.delete(e.key));

    // À la fin de chaque frame, on copie l'état courant pour la frame suivante
    scene.onAfterRenderObservable.add(() => {
      this._downPrev = new Set(this._down);
    });
  }

  isDown(action) {
    const keys = this.actions[action];
    if (!keys) return false;
    return keys.some((k) => this._down.has(k));
  }

  wasPressed(action) {
    const keys = this.actions[action];
    if (!keys) return false;
    return keys.some((k) => this._down.has(k) && !this._downPrev.has(k));
  }
}