import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color3,
  HavokPlugin,
} from '@babylonjs/core';
import '@babylonjs/loaders'; // active le support glTF/glb
import HavokPhysics from '@babylonjs/havok';

import { InputManager } from './InputManager.js';
import { PointerLockController } from './PointerLockController.js';
import { Player } from '../player/Player.js';
import { Casino } from '../casino/Casino.js';
import { CameraController } from '../camera/CameraController.js';
import { InteractionSystem } from '../interaction/InteractionSystem.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0.1, 0.1, 0.15).toColor4();

    new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);

    // Caméra unique partagée par tout le jeu (3e personne libre + vue assise).
    // Paramètres alignés avec ceux du projet précédent du user.
    this.camera = new ArcRotateCamera('mainCamera', 1.5 * Math.PI, 1.15, 4.5, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 3;    // zoom minimum
    this.camera.upperRadiusLimit = 6;   // zoom maximum
    this.camera.wheelPrecision = 20;     // vitesse de zoom à la molette (plus haut = plus lent)
    this.camera.lowerBetaLimit = 0.5;   // empêche de monter trop haut (vue du dessus)
    this.camera.upperBetaLimit = 1.7;  // empêche de passer sous l'horizontale
  }

  async start() {
    // Physics doit être prêt avant qu'on crée les corps physiques (sol, joueur).
    const havokInstance = await HavokPhysics();
    const havokPlugin = new HavokPlugin(true, havokInstance);
    this.scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

    this.inputManager = new InputManager(this.scene);
    this.gameStarted = false;

    this.uiManager = new UIManager(this.scene);

    this.casino = new Casino(this.scene);
    await this.casino.init();

    this.player = new Player(this.scene, this.camera);
    await this.player.init();

    this.pointerLock = new PointerLockController(this.canvas, this.camera);

    this.cameraController = new CameraController(this.camera, this.player);
    this.interactionSystem = new InteractionSystem(
      this.player,
      this.casino,
      this.cameraController,
      this.uiManager,
      this.inputManager,
      this.pointerLock
    );

    this.engine.runRenderLoop(() => {

  const dt = this.engine.getDeltaTime() / 1000;

    if (this.gameStarted) {
      this.player.update( dt, this.inputManager, this.camera );
      this.interactionSystem.update();
    }

    this.scene.render();
  });

    window.addEventListener('resize', () => this.engine.resize());
  }

  startGameplay() {
    this.gameStarted = true;
    this.pointerLock.enableFreeLook();
  }
}