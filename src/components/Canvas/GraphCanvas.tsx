import { useStore } from '@tanstack/react-store';
import { appModeStore } from '../../store/appModeStore';
import { GraphCanvas2D } from './GraphCanvas2D';
import { GraphCanvas3D } from './GraphCanvas3D';

export function GraphCanvas() {
  const mode = useStore(appModeStore, (s) => s.mode);
  return mode === '3D' ? <GraphCanvas3D /> : <GraphCanvas2D />;
}
