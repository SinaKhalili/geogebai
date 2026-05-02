import * as THREE from 'three';

const TICK_LEN = 0.12;
const TICK_COLOR_X = 0xd11d2c;
const TICK_COLOR_Y = 0x2a7d2a;
const TICK_COLOR_Z = 0x1f5fcc;
const LABEL_COLOR = '#3a3a3a';

/**
 * Build a Group containing tick marks and numeric labels for the three axes.
 *
 * Math convention: x horizontal, y depth, z vertical.
 * Three.js (Y-up): world X = math x, world Y = math z, world Z = math y.
 * So axis-Z labels are vertical, and we offset them in world X for legibility.
 */
export function buildAxisLabels(extent: number): THREE.Group {
  const group = new THREE.Group();
  const ticks: number[] = [];
  for (let v = -extent; v <= extent; v++) {
    if (v === 0) continue;
    ticks.push(v);
  }

  // X axis ticks (along world X). Tick segment in world Y direction.
  for (const v of ticks) {
    group.add(makeTick(
      new THREE.Vector3(v, -TICK_LEN, 0),
      new THREE.Vector3(v, TICK_LEN, 0),
      TICK_COLOR_X,
    ));
    group.add(makeLabel(String(v), new THREE.Vector3(v, -0.35, 0)));
  }

  // Y axis (math y) ticks: along world Z. Tick segment in world Y direction.
  for (const v of ticks) {
    group.add(makeTick(
      new THREE.Vector3(0, -TICK_LEN, v),
      new THREE.Vector3(0, TICK_LEN, v),
      TICK_COLOR_Y,
    ));
    group.add(makeLabel(String(v), new THREE.Vector3(0, -0.35, v)));
  }

  // Z axis (math z) ticks: along world Y. Tick segment in world X direction.
  for (const v of ticks) {
    group.add(makeTick(
      new THREE.Vector3(-TICK_LEN, v, 0),
      new THREE.Vector3(TICK_LEN, v, 0),
      TICK_COLOR_Z,
    ));
    group.add(makeLabel(String(v), new THREE.Vector3(0.45, v, 0)));
  }

  // Axis end labels: x, y, z at the positive ends.
  group.add(makeLabel('x', new THREE.Vector3(extent + 0.6, 0, 0), 0.6));
  group.add(makeLabel('y', new THREE.Vector3(0, 0, extent + 0.6), 0.6));
  group.add(makeLabel('z', new THREE.Vector3(0, extent + 0.6, 0), 0.6));

  return group;
}

function makeTick(from: THREE.Vector3, to: THREE.Vector3, color: number): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geom, mat);
}

function makeLabel(text: string, position: THREE.Vector3, scale: number = 0.45): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = 'bold 44px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(scale * 2, scale, 1);
  return sprite;
}
