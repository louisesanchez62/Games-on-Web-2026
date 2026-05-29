import {
  Axis,
  Color3,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { GameStation } from './GameStation.js';
import { SlotMachineGame } from '../../games/slot-machine/SlotMachineGame.js';

const CHAIR_DISTANCE = 0.9;
const CHAIR_HEIGHT = 0.45;

function createFallbackChair(scene, machineNode) {
  const chairNode = new TransformNode(`${machineNode.name}_chaise1`, scene);
  const forward = machineNode.getDirection(Axis.Z);
  const base = machineNode.getAbsolutePosition();
  chairNode.position = base.add(forward.scale(-CHAIR_DISTANCE));

  const seat = MeshBuilder.CreateBox(`${chairNode.name}_seat`, {
    width: 0.45,
    height: 0.08,
    depth: 0.45,
  }, scene);
  seat.parent = chairNode;
  seat.position = new Vector3(0, CHAIR_HEIGHT, 0);

  const back = MeshBuilder.CreateBox(`${chairNode.name}_back`, {
    width: 0.45,
    height: 0.45,
    depth: 0.06,
  }, scene);
  back.parent = chairNode;
  back.position = new Vector3(0, CHAIR_HEIGHT + 0.23, -0.2);

  const mat = new StandardMaterial(`${chairNode.name}_mat`, scene);
  mat.diffuseColor = new Color3(0.20, 0.18, 0.14);
  mat.emissiveColor = new Color3(0.08, 0.06, 0.04);
  seat.material = mat;
  back.material = mat;

  return chairNode;
}

function computeForward(machineNode, chairPos) {
  const base = machineNode.getAbsolutePosition();
  let dir = base.subtract(chairPos);
  if (dir.length() < 0.01) {
    dir = machineNode.getDirection(Axis.Z);
  }
  return dir.normalize();
}

export class SlotMachineStation extends GameStation {
  constructor(scene, machineNode, chairNodes = []) {
    const chairs = chairNodes.length ? chairNodes : [createFallbackChair(scene, machineNode)];
    super(scene, machineNode, chairs, 'MACHINE A SOUS');
    this._machineTargets = [];
    this._machineRoots = [];
    this._buildMachines(machineNode, chairs);
    this.game = new SlotMachineGame(scene, machineNode);
  }

  _buildMachines(machineNode, chairs) {
    chairs.forEach((chair, index) => {
      const chairPos = chair.getAbsolutePosition();
      const dir = computeForward(machineNode, chairPos);

      const root = new TransformNode(`${machineNode.name}_slot_${index + 1}`, this.scene);
      root.position = chairPos.add(dir.scale(0.7));
      root.rotationQuaternion = Quaternion.FromLookDirectionLH(dir.scale(-1), Vector3.Up());

      this._machineRoots.push(root);
      this._machineTargets.push(root.position.add(new Vector3(0, 0.9, 0)));
    });
  }

  getCameraView(chairIndex) {
    const chairPos = this.chairPositions[chairIndex].add(new Vector3(0, 0.8, 0));
    const target = this._machineTargets[chairIndex] ?? this.tableNode.getAbsolutePosition();
    return {
      position: chairPos,
      target,
    };
  }

  activate() {
    this.game.start();
  }

  deactivate() {
    this.game.stop();
  }
}
