import { useEffect, useRef } from 'react';
import { RenderEngine } from '../renderer/RenderEngine';
import { viewportStore, markViewportClean } from '../store/viewportStore';
import { expressionStore, markExpressionsClean } from '../store/expressionStore';
import { sliderStore, markSlidersClean, getSliderScope } from '../store/sliderStore';

export function useRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mousePos: React.RefObject<{ x: number; y: number } | null>,
): void {
  const engineRef = useRef<RenderEngine | null>(null);
  const hasRendered = useRef(false);

  useEffect(() => {
    engineRef.current = new RenderEngine();
    let rafId: number;

    function frame() {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      const viewportState = viewportStore.state;
      const exprState = expressionStore.state;
      const sliderState = sliderStore.state;

      const needsRender =
        viewportState.dirty ||
        exprState.dirty ||
        sliderState.dirty ||
        !hasRendered.current;

      if (needsRender) {
        const { coordSystem } = viewportState;
        const { expressions } = exprState;
        const sliderScope = getSliderScope();
        const mouse = mousePos.current;

        engineRef.current!.render(
          ctx,
          coordSystem,
          expressions,
          sliderScope,
          mouse?.x ?? null,
          mouse?.y ?? null,
        );

        hasRendered.current = true;

        // Mark all stores clean
        if (viewportState.dirty) markViewportClean();
        if (exprState.dirty) markExpressionsClean();
        if (sliderState.dirty) markSlidersClean();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [canvasRef, mousePos]);
}
