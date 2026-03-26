import { useRef, useEffect, useCallback } from 'react';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useRenderLoop } from '../../hooks/useRenderLoop';
import { resizeViewport, viewportStore } from '../../store/viewportStore';

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((x: number, y: number) => {
    mousePos.current = { x, y };
    // Trigger a re-render by marking viewport dirty (lightweight)
    viewportStore.setState((prev) => ({ ...prev, dirty: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    mousePos.current = null;
    viewportStore.setState((prev) => ({ ...prev, dirty: true }));
  }, []);

  useCanvasInteraction(canvasRef, handleMouseMove, handleMouseLeave);
  useRenderLoop(canvasRef, mousePos);

  // Handle resize with ResizeObserver and high-DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    function updateSize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      // Set the actual canvas pixel dimensions (high-DPI)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Set display size via CSS
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context for high-DPI
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Update the viewport store with CSS pixel dimensions
      resizeViewport(width, height);
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(parent);

    // Initial size setup
    updateSize();

    return () => {
      observer.disconnect();
    };
  }, []);

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
