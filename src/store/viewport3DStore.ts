import { Store } from '@tanstack/store';

interface Viewport3DState {
  // Spherical orbit camera
  theta: number;   // azimuth, radians
  phi: number;     // polar (from +y axis), radians
  distance: number;
  target: { x: number; y: number; z: number };
  dirty: boolean;
}

const DEFAULT_STATE: Viewport3DState = {
  theta: Math.PI / 4,
  phi: Math.PI / 3,
  distance: 14,
  target: { x: 0, y: 0, z: 0 },
  dirty: true,
};

export const viewport3DStore = new Store<Viewport3DState>({ ...DEFAULT_STATE });

const PHI_MIN = 0.05;
const PHI_MAX = Math.PI - 0.05;

export function orbitCamera(deltaTheta: number, deltaPhi: number): void {
  viewport3DStore.setState((prev) => ({
    ...prev,
    theta: prev.theta + deltaTheta,
    phi: clamp(prev.phi + deltaPhi, PHI_MIN, PHI_MAX),
    dirty: true,
  }));
}

export function dollyCamera(factor: number): void {
  viewport3DStore.setState((prev) => ({
    ...prev,
    distance: clamp(prev.distance * factor, 1, 200),
    dirty: true,
  }));
}

export function panCameraTarget(dx: number, dy: number, dz: number): void {
  viewport3DStore.setState((prev) => ({
    ...prev,
    target: { x: prev.target.x + dx, y: prev.target.y + dy, z: prev.target.z + dz },
    dirty: true,
  }));
}

export function reset3DViewport(): void {
  viewport3DStore.setState(() => ({ ...DEFAULT_STATE }));
}

export function mark3DViewportClean(): void {
  viewport3DStore.setState((prev) => ({ ...prev, dirty: false }));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
