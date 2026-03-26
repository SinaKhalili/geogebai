import { useEffect, useRef } from 'react';
import { panViewport, zoomViewport } from '../store/viewportStore';

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onMouseMove?: (x: number, y: number) => void,
  onMouseLeave?: () => void,
): void {
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pinchDistance = useRef<number | null>(null);

  // Store callbacks in refs so we don't re-attach listeners when they change
  const onMouseMoveRef = useRef(onMouseMove);
  const onMouseLeaveRef = useRef(onMouseLeave);
  onMouseMoveRef.current = onMouseMove;
  onMouseLeaveRef.current = onMouseLeave;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(e: PointerEvent | MouseEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      isDragging.current = true;
      lastPos.current = getCanvasPos(e);
      canvas!.setPointerCapture(e.pointerId);
      canvas!.style.cursor = 'grabbing';
    }

    function handlePointerMove(e: PointerEvent) {
      const pos = getCanvasPos(e);

      if (isDragging.current) {
        const dx = pos.x - lastPos.current.x;
        const dy = pos.y - lastPos.current.y;
        lastPos.current = pos;
        panViewport(dx, dy);
      } else {
        onMouseMoveRef.current?.(pos.x, pos.y);
      }
    }

    function handlePointerUp(e: PointerEvent) {
      if (!isDragging.current) return;
      isDragging.current = false;
      canvas!.releasePointerCapture(e.pointerId);
      canvas!.style.cursor = 'grab';
    }

    function handlePointerLeave() {
      if (!isDragging.current) {
        onMouseLeaveRef.current?.();
      }
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomViewport(factor, mouseX, mouseY);
    }

    // Touch: pinch-to-zoom support
    function getTouchDistance(t1: Touch, t2: Touch): number {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(t1: Touch, t2: Touch): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchDistance.current !== null) {
        e.preventDefault();
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const factor = newDist / pinchDistance.current;
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        zoomViewport(factor, center.x, center.y);
        pinchDistance.current = newDist;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        pinchDistance.current = null;
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Set initial cursor
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasRef]);
}
