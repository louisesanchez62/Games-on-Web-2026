import {
  Animation,
  CubicEase,
  EasingFunction,
  Vector3,
} from '@babylonjs/core';

const FPS = 60;
const TRANSITION_FRAMES = 45; // ~0.75s
const DEBUG_CAMERA = true;
const SEATED_FOV = 0.64;

export class CameraController {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this._savedState = null;
  }

  animateToView(view) {
    // Sauvegarder l'état EXACT du départ (alpha, beta, radius, target)
    this._savedState = {
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      fov: this.camera.fov,
      target: this.camera.target.clone(),
      lowerRadiusLimit: this.camera.lowerRadiusLimit,
      upperRadiusLimit: this.camera.upperRadiusLimit,
    };

    const fromTarget = this._savedState.target.clone();
    
    this.camera.detachControl();
    this.camera.lowerRadiusLimit = 0.1;
    this.camera.upperRadiusLimit = 100;
    this.camera.fov = SEATED_FOV;

    const arc = this._toArcParams(view.position, view.target);
    if (DEBUG_CAMERA) {
      console.log('[Camera] animateToView', {
        viewPosition: { x: view.position.x, y: view.position.y, z: view.position.z },
        viewTarget: { x: view.target.x, y: view.target.y, z: view.target.z },
        arc: { alpha: arc.alpha, beta: arc.beta, radius: arc.radius },
      });
    }
    return this._animateTo(
      fromTarget, view.target,
      this._savedState.alpha, this._savedState.beta, this._savedState.radius,
      arc.alpha, arc.beta, arc.radius
    );
  }

  async returnToPlayer() {
    if (!this._savedState) return;
    const s = this._savedState;
    const fromTarget = this.camera.target.clone();
    this._savedState = null;
    
    this.camera.lowerRadiusLimit = s.lowerRadiusLimit;
    this.camera.upperRadiusLimit = s.upperRadiusLimit;
    this.camera.fov = s.fov ?? this.camera.fov;
    this.camera.attachControl();

    // Chemin le plus court pour le retour aussi
    let targetAlpha = s.alpha;
    while (targetAlpha - this.camera.alpha > Math.PI) targetAlpha -= 2 * Math.PI;
    while (targetAlpha - this.camera.alpha < -Math.PI) targetAlpha += 2 * Math.PI;

    if (DEBUG_CAMERA) {
      console.log('[Camera] returnToPlayer', {
        target: { x: s.target.x, y: s.target.y, z: s.target.z },
        alpha: s.alpha,
        beta: s.beta,
        radius: s.radius,
      });
    }

    await this._animateTo(
      fromTarget, s.target,
      this.camera.alpha, this.camera.beta, this.camera.radius,
      targetAlpha, s.beta, s.radius
    );
  }

  _animateTo(fromTarget, toTarget, fromAlpha, fromBeta, fromRadius, toAlpha, toBeta, toRadius) {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

    return new Promise((resolve) => {
      Animation.CreateAndStartAnimation(
        'cam_target', this.camera, 'target', FPS, TRANSITION_FRAMES,
        fromTarget.clone(), toTarget.clone(),
        Animation.ANIMATIONLOOPMODE_CONSTANT, ease
      );
      Animation.CreateAndStartAnimation(
        'cam_alpha', this.camera, 'alpha', FPS, TRANSITION_FRAMES,
        fromAlpha, toAlpha,
        Animation.ANIMATIONLOOPMODE_CONSTANT, ease
      );
      Animation.CreateAndStartAnimation(
        'cam_beta', this.camera, 'beta', FPS, TRANSITION_FRAMES,
        fromBeta, toBeta,
        Animation.ANIMATIONLOOPMODE_CONSTANT, ease
      );
      Animation.CreateAndStartAnimation(
        'cam_radius', this.camera, 'radius', FPS, TRANSITION_FRAMES,
        fromRadius, toRadius,
        Animation.ANIMATIONLOOPMODE_CONSTANT, ease,
        () => resolve()
      );
    });
  }

  _toArcParams(position, target) {
    const dir = position.subtract(target);
    const radius = dir.length();
    if (radius < 1e-6) {
      return { alpha: this.camera.alpha, beta: this.camera.beta, radius: 0.1 };
    }
    const beta = Math.acos(Math.max(-1, Math.min(1, dir.y / radius)));
    let alpha = Math.atan2(dir.z, dir.x);
    while (alpha - this.camera.alpha > Math.PI) alpha -= 2 * Math.PI;
    while (alpha - this.camera.alpha < -Math.PI) alpha += 2 * Math.PI;
    return { alpha, beta, radius };
  }
}