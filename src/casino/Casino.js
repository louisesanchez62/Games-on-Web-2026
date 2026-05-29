import {
  SceneLoader,
  Vector3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import { PokerTable } from './stations/PokerTable.js';
import { BlackjackTable } from './stations/BlackjackTable.js';
import { SlotMachineStation } from './stations/SlotMachineStation.js';

export class Casino {
  // Table5 et Table6 = rangées de machines à sous (12 chaises chacune)
  static TABLES = [
    { name: 'Table1', type: 'poker' },
    { name: 'Table2', type: 'poker' },
    { name: 'Table3', type: 'blackjack' },
    { name: 'Table5', type: 'slot' },
    { name: 'Table6', type: 'slot' },
  ];

  constructor(scene) {
    this.scene = scene;
    this.casinoMesh = null;
    this.stations = [];
  }

  async init() {
    const result = await SceneLoader.ImportMeshAsync('', '/public/', 'casino.glb', this.scene);
    this.casinoMesh = result.meshes[0];

    const safetyFloor = MeshBuilder.CreateBox(
      'safetyFloor',
      { width: 200, height: 0.2, depth: 200 },
      this.scene
    );
    safetyFloor.position.y = -0.1;
    safetyFloor.isVisible = false;
    new PhysicsAggregate(safetyFloor, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

    this._buildStations();

    const colliders = this.casinoMesh.getDescendants(false, n => n.name.startsWith('collider.'));
    for (const empty of colliders) {
      const box = MeshBuilder.CreateBox(empty.name, { size: 2 }, this.scene);
      box.position = empty.absolutePosition.clone();
      if (empty.absoluteRotationQuaternion) box.rotationQuaternion = empty.absoluteRotationQuaternion.clone();
      box.scaling = empty.absoluteScaling.clone();
      box.isVisible = false;
      const debugMat = new StandardMaterial(empty.name + '_mat', this.scene);
      debugMat.emissiveColor = new Color3(1, 0, 0);
      debugMat.alpha = 0.3;
      box.material = debugMat;
      new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    }
    console.log(`[Casino] ${colliders.length} collider(s) créé(s)`);
  }

  _buildStations() {
    const find = (name) =>
      this.casinoMesh.getDescendants(false, (n) => n.name === name)[0];

    for (const { name, type } of Casino.TABLES) {
      const tableNode = find(name);
      if (!tableNode) {
        console.warn(`Casino: "${name}" introuvable dans le glb`);
        continue;
      }

      const chairs = [];
      for (let i = 1; ; i++) {
        const chair = find(`${name}_chaise${i}`);
        if (!chair) break;
        chairs.push(chair);
      }
      console.log(`[Casino] ${name} (${type}) → ${chairs.length} chaise(s) trouvée(s)`);

      let station;
      if (type === 'poker') {
        station = new PokerTable(this.scene, tableNode, chairs);
      } else if (type === 'blackjack') {
        station = new BlackjackTable(this.scene, tableNode, chairs);
      } else {
        // type === 'slot' : chaque chaise = une machine à sous indépendante
        for (const chair of chairs) {
          this.stations.push(new SlotMachineStation(this.scene, tableNode, [chair]));
        }
        continue; // skip le push standard ci-dessous
      }
      this.stations.push(station);
    }

    // Détection legacy pour les nodes nommés Slot* / machine*
    const slotNodes = this.casinoMesh.getDescendants(false, (node) => {
      const lower = node.name.toLowerCase();
      if (lower.includes('chaise')) return false;
      // Exclure Table5/Table6 déjà traités
      if (lower === 'table5' || lower === 'table6') return false;
      return lower.startsWith('slot') || lower.includes('machine');
    });

    for (const node of slotNodes) {
      const chairs = [];
      const find2 = (name) =>
        this.casinoMesh.getDescendants(false, (n) => n.name === name)[0];
      for (let i = 1; ; i++) {
        const chair = find2(`${node.name}_chaise${i}`);
        if (!chair) break;
        chairs.push(chair);
      }
      this.stations.push(new SlotMachineStation(this.scene, node, chairs));
    }
  }
}