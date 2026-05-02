import { useEffect, useRef } from 'react';
import { RenderEngine3D } from '../renderer/RenderEngine3D';
import { viewport3DStore, mark3DViewportClean } from '../store/viewport3DStore';
import { expressionStore, markExpressionsClean } from '../store/expressionStore';
import { sliderStore, markSlidersClean, getSliderScope } from '../store/sliderStore';

export function useRenderLoop3D(canvasRef: React.RefObject<HTMLCanvasElement | null>): void {
  const engineRef = useRef<RenderEngine3D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new RenderEngine3D(canvas);
    engineRef.current = engine;
    let rafId: number;
    let firstRenderDone = false;

    const parent = canvas.parentElement;
    function applySize() {
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      engine.setSize(w, h);
      viewport3DStore.setState((prev) => ({ ...prev, dirty: true }));
    }
    applySize();

    const ro = parent ? new ResizeObserver(applySize) : null;
    if (parent && ro) ro.observe(parent);

    function frame() {
      const cam = viewport3DStore.state;
      const expr = expressionStore.state;
      const slider = sliderStore.state;

      const needs = cam.dirty || expr.dirty || slider.dirty || !firstRenderDone;

      if (needs) {
        engine.applyCamera(cam);
        engine.render(expr.expressions, getSliderScope());
        firstRenderDone = true;
        if (cam.dirty) mark3DViewportClean();
        if (expr.dirty) markExpressionsClean();
        if (slider.dirty) markSlidersClean();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [canvasRef]);
}
