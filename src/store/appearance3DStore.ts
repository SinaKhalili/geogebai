import { Store } from '@tanstack/store';
import { viewport3DStore } from './viewport3DStore';

interface Appearance3DState {
  wireframe: boolean;
  opacity: number; // 0..1
}

export const appearance3DStore = new Store<Appearance3DState>({
  wireframe: false,
  opacity: 1,
});

export function setWireframe(wireframe: boolean): void {
  appearance3DStore.setState((prev) => ({ ...prev, wireframe }));
  viewport3DStore.setState((prev) => ({ ...prev, dirty: true }));
}

export function toggleWireframe(): void {
  setWireframe(!appearance3DStore.state.wireframe);
}

export function setOpacity(opacity: number): void {
  const clamped = Math.max(0, Math.min(1, opacity));
  appearance3DStore.setState((prev) => ({ ...prev, opacity: clamped }));
  viewport3DStore.setState((prev) => ({ ...prev, dirty: true }));
}
