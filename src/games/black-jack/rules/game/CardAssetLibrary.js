import {
  SceneLoader,
  Quaternion,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

// Card size/spacing knobs (tweak these to resize cards and spacing)
const CARD_WIDTH = 0.08;         // target width in meters
const CARD_LIFT = 0.003;         // extra lift above table
const CARD_SPACING_RATIO = 1.15; // spacing multiplier (higher = more gap)
const CARD_THICKNESS = 0.001;    // used to keep cards slightly above surface
// If the GLB uses 01=2, 02=3, ..., 13=A, use 'two-first'.
// If it uses 01=A, 02=2, ..., 13=K, use 'ace-first'.
const ASSET_RANK_MODE = 'ace-first';

function pickThinAxis(size) {
  const axes = [
    { axis: 'x', size: size.x },
    { axis: 'y', size: size.y },
    { axis: 'z', size: size.z },
  ];
  axes.sort((a, b) => a.size - b.size);
  return axes[0].axis;
}

function rotationForThinAxis(axis) {
  if (axis === 'z') return Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
  if (axis === 'x') return Quaternion.FromEulerAngles(0, 0, Math.PI / 2);
  return Quaternion.Identity();
}

function getCardKeyFromName(name) {
  const match = name.toLowerCase().match(/(clubs|diamonds|hearts|spades)[^\d]*(\d{2})/);
  if (!match) return null;
  return `${match[1]}${match[2]}`;
}

function rankToAssetIndex(rank) {
  if (ASSET_RANK_MODE === 'two-first') {
    return rank === 1 ? 13 : rank - 1;
  }
  return rank;
}

export class CardAssetLibrary {
  static _meshSources = null; // Map<key, Mesh[]>
  static _loadPromise = null;
  static _layout      = null;

  static async load(scene) {
    if (CardAssetLibrary._meshSources) return CardAssetLibrary._meshSources;
    if (!CardAssetLibrary._loadPromise) {
      CardAssetLibrary._loadPromise = SceneLoader.ImportMeshAsync(
        '', '/public/', 'playing_cards.glb', scene
      ).then((result) => {
        const meshSources = new Map();

        for (const mesh of result.meshes) {
          if (!mesh.name) continue;
          const key = getCardKeyFromName(mesh.name);
          if (!key) continue;
          if (!meshSources.has(key)) meshSources.set(key, []);
          meshSources.get(key).push(mesh);
        }

        // Cacher les sources (reste actives pour les instances)
        for (const meshes of meshSources.values()) {
          for (const m of meshes) {
            m.setEnabled(true);
            m.isVisible = false;
          }
        }

        CardAssetLibrary._meshSources = meshSources;
        CardAssetLibrary._layout      = CardAssetLibrary._buildLayout();
        return meshSources;
      });
    }
    return CardAssetLibrary._loadPromise;
  }

  static _buildLayout() {
  const sample = CardAssetLibrary._meshSources?.values().next().value?.[0];
  let rotation = Quaternion.Identity();
  if (sample?.getBoundingInfo) {
    sample.computeWorldMatrix(true);
    const bounds = sample.getBoundingInfo().boundingBox;
    const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
    const thinAxis = pickThinAxis(size);
    rotation = rotationForThinAxis(thinAxis);
  }

  return {
    //  Modifie cette valeur pour changer la taille de l'objet ENTIER
    // 1.0 = Taille d'origine du fichier GLB
    // 0.8 = Un peu plus petit / 1.5 = Plus grand
    scale: 0.88, 
    
    spacing: CARD_WIDTH * CARD_SPACING_RATIO,
    rotation: rotation,
    lift: Math.max(CARD_LIFT, CARD_THICKNESS * 2),
  };
}

  static getLayout() {
    return CardAssetLibrary._layout ?? CardAssetLibrary._buildLayout();
  }

  static createCardClone(card, parent) {
    const assetIndex = rankToAssetIndex(card.rank);
    const key    = `${card.suit}${String(assetIndex).padStart(2, '0')}`;
    const meshes = CardAssetLibrary._meshSources?.get(key);

    console.log(`[CardLib] rank=${card.rank} → assetIndex=${assetIndex} → key="${key}" → found=${!!meshes?.length}`);

    if (!meshes?.length) {
      console.warn(`[CardLib] ❌ clé introuvable: "${key}"`);
      console.warn('[CardLib] clés disponibles:', [...(CardAssetLibrary._meshSources?.keys() ?? [])].slice(0, 10));
      return null;
    }

    const scene = parent._scene ?? parent.getScene?.();
    const root  = new TransformNode(`card_${key}_${Date.now()}`, scene);
    root.parent = parent;

    for (const mesh of meshes) {
      // createInstance() est la méthode la plus fiable dans Babylon.js
      const inst      = mesh.createInstance(`${key}_inst_${Date.now()}`);
      inst.parent     = root;
      inst.position   = Vector3.Zero();
      inst.rotationQuaternion = Quaternion.Identity();
      inst.scaling    = new Vector3(1, 1, 1);
      inst.isPickable = false;
      inst.setEnabled(true);
      inst.isVisible  = true;
      if (inst.material) {
        inst.material.backFaceCulling = false;
        inst.material.twoSidedLighting = true;
      }

    }

    const bounds = root.getHierarchyBoundingVectors(true);
    if (
      Number.isFinite(bounds.min.x) &&
      Number.isFinite(bounds.min.y) &&
      Number.isFinite(bounds.min.z) &&
      Number.isFinite(bounds.max.x) &&
      Number.isFinite(bounds.max.y) &&
      Number.isFinite(bounds.max.z)
    ) {
      const center = bounds.min.add(bounds.max).scale(0.5);
      const offset = new Vector3(-center.x, -center.y, -center.z);
      for (const child of root.getChildren()) {
        if (child.position) child.position.addInPlace(offset);
      }
    }

    return root;
  }
}