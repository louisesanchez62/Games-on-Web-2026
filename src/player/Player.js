import {
  SceneLoader, Vector3, MeshBuilder, TransformNode,
  PhysicsAggregate, PhysicsShapeType, PhysicsMotionType,
} from '@babylonjs/core';

// Réglages
const SPEED = 3.5;
const ROT_SPEED = 0.3;
const WALK_ANIM_SPEED = 2;
const SPAWN = new Vector3(0, 2, 0);

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.anims = {};
    this.currentAnim = null;
    this.mode = 'free';
  }

  async init() {
    // Capsule physique invisible, ne tourne jamais (inertie 0)
    this.body = MeshBuilder.CreateCapsule('playerBody', { height: 1.8, radius: 0.4 }, this.scene);
    this.body.position = SPAWN.clone();
    this.body.isVisible = false;

    this.aggregate = new PhysicsAggregate(this.body, PhysicsShapeType.CAPSULE,
      { mass: 1, friction: 0.5, restitution: 0 }, this.scene);
    this.aggregate.body.disablePreStep = false;
    this.aggregate.body.setMassProperties({ inertia: Vector3.ZeroReadOnly });

    // Pivot pour la rotation Y du visuel (glb a un rotationQuaternion qu'on ne touche pas)
    this.visualPivot = new TransformNode('visualPivot', this.scene);
    this.visualPivot.parent = this.body;
    this.visualPivot.position = new Vector3(0, -0.9, 0);

    // Mesh visuel + anims du glb
    const result = await SceneLoader.ImportMeshAsync('', '/assets/', 'player.glb', this.scene);
    this.visual = result.meshes[0];
    this.visual.parent = this.visualPivot;
    result.animationGroups.forEach(ag => this.anims[ag.name] = ag);

    // Point que vise la caméra (au niveau de la tête)
    this.cameraTarget = new TransformNode('cameraTarget', this.scene);
    this.cameraTarget.parent = this.body;
    this.cameraTarget.position = new Vector3(0, 1, 0);
    this.camera.lockedTarget = this.cameraTarget;

    this._playAnim('idle');
  }

  update(dt, input, camera) {
    if (this.mode !== 'free') return;

    const fwd   = input.isDown('forward');
    const back  = input.isDown('back');
    const left  = input.isDown('left');
    const right = input.isDown('right');

    const camForward = camera.getForwardRay().direction.clone();
    camForward.y = 0;
    camForward.normalize();
    const camRight = Vector3.Cross(Vector3.Up(), camForward).normalize();

    let moveDir = Vector3.Zero();
    if (fwd)   moveDir.addInPlace(camForward);
    if (back)  moveDir.subtractInPlace(camForward);
    if (right) moveDir.addInPlace(camRight);
    if (left)  moveDir.subtractInPlace(camRight);
    const moving = moveDir.lengthSquared() > 0.01;
    if (moving) moveDir.normalize();

    const vy = this.aggregate.body.getLinearVelocity().y;
    this.aggregate.body.setLinearVelocity(new Vector3(moveDir.x * SPEED, vy, moveDir.z * SPEED));

    if (moving) {
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetYaw - this.visualPivot.rotation.y;
      diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
      this.visualPivot.rotation.y += diff * ROT_SPEED;
    }

    this._playAnim(moving ? 'walk' : 'idle');
  }

  _playAnim(name) {
    const ag = this.anims[name];
    if (!ag || ag === this.currentAnim) return;
    if (this.currentAnim) this.currentAnim.stop();
    ag.start(true, name === 'walk' ? WALK_ANIM_SPEED : 1);
    this.currentAnim = ag;
  }

  lockMovement() {
    if (this.mode === 'interacting') return;
    this.mode = 'interacting';
    this.aggregate.body.setLinearVelocity(Vector3.Zero());
    this.aggregate.body.setMotionType(PhysicsMotionType.STATIC);
    this.body.setEnabled(false);
    this.camera.lockedTarget = null;
  }

  unlockMovement() {
    if (this.mode === 'free') return;
    this.mode = 'free';
    this.body.setEnabled(true);
    this.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
    this.camera.lockedTarget = this.cameraTarget;
    this._playAnim('idle');
  }

  get position() {
    return this.body.position;
  }
}