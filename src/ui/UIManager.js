import { AdvancedDynamicTexture } from '@babylonjs/gui';

import { HUD } from './HUD.js';

export class UIManager {

  constructor(scene) {

    this.adt =
      AdvancedDynamicTexture.CreateFullscreenUI(
        'UI',
        true,
        scene
      );

    this.hud = new HUD(this.adt);
  }
}