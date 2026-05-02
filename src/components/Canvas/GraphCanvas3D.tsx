import { useRef } from 'react';
import { useRenderLoop3D } from '../../hooks/useRenderLoop3D';
import { useCanvasInteraction3D } from '../../hooks/useCanvasInteraction3D';

export function GraphCanvas3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useCanvasInteraction3D(canvasRef);
  useRenderLoop3D(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    />
  );
}
