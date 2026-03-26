import { Store } from '@tanstack/store';
import { CoordinateSystem } from '../renderer/CoordinateSystem';

interface ViewportState {
  coordSystem: CoordinateSystem;
  dirty: boolean;
}

export const viewportStore = new Store<ViewportState>({
  coordSystem: new CoordinateSystem(),
  dirty: true,
});

/**
 * Pan the viewport by the given pixel deltas.
 */
export function panViewport(dxPixels: number, dyPixels: number): void {
  const current = viewportStore.state.coordSystem;
  const next = current.clone();
  next.pan(dxPixels, dyPixels);
  viewportStore.setState((prev) => ({
    ...prev,
    coordSystem: next,
    dirty: true,
  }));
}

/**
 * Zoom the viewport by the given factor, centered on the given screen point.
 */
export function zoomViewport(factor: number, screenX: number, screenY: number): void {
  const current = viewportStore.state.coordSystem;
  const next = current.clone();
  next.zoom(factor, screenX, screenY);
  viewportStore.setState((prev) => ({
    ...prev,
    coordSystem: next,
    dirty: true,
  }));
}

/**
 * Reset the viewport to the default position and zoom level.
 */
export function resetViewport(): void {
  const current = viewportStore.state.coordSystem;
  const next = new CoordinateSystem(current.canvasWidth, current.canvasHeight);
  viewportStore.setState((prev) => ({
    ...prev,
    coordSystem: next,
    dirty: true,
  }));
}

/**
 * Resize the viewport canvas dimensions.
 */
export function resizeViewport(width: number, height: number): void {
  const current = viewportStore.state.coordSystem;
  const next = current.clone();
  next.resize(width, height);
  viewportStore.setState((prev) => ({
    ...prev,
    coordSystem: next,
    dirty: true,
  }));
}

/**
 * Mark the viewport as clean (rendered up to date).
 */
export function markViewportClean(): void {
  viewportStore.setState((prev) => ({
    ...prev,
    dirty: false,
  }));
}
