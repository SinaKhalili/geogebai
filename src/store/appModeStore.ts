import { Store } from '@tanstack/store';

export type AppMode = '2D' | '3D';

interface AppModeState {
  mode: AppMode;
}

export const appModeStore = new Store<AppModeState>({
  mode: '2D',
});

export function setAppMode(mode: AppMode): void {
  appModeStore.setState(() => ({ mode }));
}

export function toggleAppMode(): void {
  appModeStore.setState((prev) => ({ mode: prev.mode === '2D' ? '3D' : '2D' }));
}
