import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';

const IDLE_COLOR = new Color3(0.2, 0.8, 1);
const ACTIVE_COLOR = new Color3(1, 0.85, 0.2);

let labelAdt = null;
const getLabelAdt = (scene) => labelAdt ??= AdvancedDynamicTexture.CreateFullscreenUI('seatLabels', true, scene);

export class GameStationLabels {
  constructor(station) {
    this.station = station;
    this.markers = [];
  }

  build() {
    this.markers = this.station.chairs.map((_, index) => this._createMarker(index));
    if (this.station.gameLabel) this._createTableLabel(this.station.gameLabel);
  }

  highlight(chairIndex) {
    for (let i = 0; i < this.markers.length; i++) this.markers[i].material.emissiveColor = i === chairIndex ? ACTIVE_COLOR : IDLE_COLOR;
  }

  _createMarker(index) {
    const id = `${this.station.tableNode.name}_${index + 1}`;
    const marker = MeshBuilder.CreateSphere(`marker_${id}`, { diameter: 0.3 }, this.station.scene);
    marker.position = this.station.chairPositions[index].clone();
    marker.isPickable = false;
    const mat = new StandardMaterial(`markerMat_${id}`, this.station.scene);
    mat.emissiveColor = IDLE_COLOR;
    mat.disableLighting = true;
    marker.material = mat;

    const label = new TextBlock();
    label.text = String(index + 1);
    label.color = 'white';
    label.fontSize = 22;
    label.outlineColor = 'black';
    label.outlineWidth = 3;
    getLabelAdt(this.station.scene).addControl(label);
    label.linkWithMesh(marker);
    label.linkOffsetY = -30;
    return marker;
  }

  _createTableLabel(text) {
    const label = new TextBlock(`${this.station.tableNode.name}_gameLabel`);
    label.text = text;
    label.color = '#ffe5a3';
    label.fontSize = 28;
    label.outlineColor = 'black';
    label.outlineWidth = 4;
    getLabelAdt(this.station.scene).addControl(label);
    label.linkWithMesh(this.station.tableNode);
    label.linkOffsetY = -86;
  }
}