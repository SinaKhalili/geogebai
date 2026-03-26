import { CoordinateSystem } from './CoordinateSystem';
import type { InequalityOp } from '../math/types';
import { evaluateImplicitGrid } from '../math/evaluator';
import { marchingSquares } from '../math/marchingSquares';
import { ImplicitPlotRenderer } from './ImplicitPlotRenderer';

export class InequalityRenderer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private boundaryRenderer = new ImplicitPlotRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    evaluator: (scope: Record<string, number>) => number,
    inequalityOp: InequalityOp,
    coordSystem: CoordinateSystem,
    sliderScope: Record<string, number>,
    color: string,
    alpha: number = 0.2,
  ): void {
    // Determine reduced resolution for the fill
    const scaleFactor = 4;
    const rw = Math.ceil(coordSystem.canvasWidth / scaleFactor);
    const rh = Math.ceil(coordSystem.canvasHeight / scaleFactor);

    // Create/reuse offscreen canvas
    if (
      !this.offscreenCanvas ||
      this.offscreenCanvas.width !== rw ||
      this.offscreenCanvas.height !== rh
    ) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = rw;
      this.offscreenCanvas.height = rh;
    }

    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) return;

    const imageData = offCtx.createImageData(rw, rh);
    const data = imageData.data;

    // Parse hex color to RGB
    const { r, g, b } = parseHexColor(color);
    const alphaValue = Math.round(alpha * 255);

    // Determine the inequality check function
    const check = getInequalityCheck(inequalityOp);

    // Fill pixels
    for (let py = 0; py < rh; py++) {
      for (let px = 0; px < rw; px++) {
        // Map reduced-res pixel to screen coords (center of the pixel block)
        const sx = (px + 0.5) * scaleFactor;
        const sy = (py + 0.5) * scaleFactor;

        // Convert to world coords
        const { wx, wy } = coordSystem.screenToWorld(sx, sy);

        // Evaluate f(x, y)
        const val = evaluator({ x: wx, y: wy, ...sliderScope });

        if (isFinite(val) && check(val)) {
          const idx = (py * rw + px) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = alphaValue;
        }
      }
    }

    offCtx.putImageData(imageData, 0, 0);

    // Draw scaled-up offscreen canvas onto main canvas
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(
      this.offscreenCanvas,
      0, 0, rw, rh,
      0, 0, coordSystem.canvasWidth, coordSystem.canvasHeight,
    );
    ctx.restore();

    // Draw boundary line using marching squares
    const bounds = coordSystem.getVisibleBounds();
    const gridW = Math.min(Math.floor(coordSystem.canvasWidth / 3), 400);
    const gridH = Math.round(gridW * (bounds.yMax - bounds.yMin) / (bounds.xMax - bounds.xMin));

    const grid = evaluateImplicitGrid(
      evaluator,
      bounds.xMin, bounds.xMax,
      bounds.yMin, bounds.yMax,
      gridW, Math.max(gridH, 1),
      sliderScope,
    );

    const segments = marchingSquares(
      grid, gridW, Math.max(gridH, 1),
      bounds.xMin, bounds.xMax,
      bounds.yMin, bounds.yMax,
    );

    this.boundaryRenderer.render(ctx, segments, coordSystem, color, 2);
  }
}

/**
 * Parse a hex color string (e.g. "#2563eb") to RGB components.
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const fullHex =
    clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean;

  return {
    r: parseInt(fullHex.substring(0, 2), 16),
    g: parseInt(fullHex.substring(2, 4), 16),
    b: parseInt(fullHex.substring(4, 6), 16),
  };
}

/**
 * Return a function that checks whether a value satisfies the inequality.
 */
function getInequalityCheck(op: InequalityOp): (val: number) => boolean {
  switch (op) {
    case '<':
      return (val) => val < 0;
    case '>':
      return (val) => val > 0;
    case '<=':
      return (val) => val <= 0;
    case '>=':
      return (val) => val >= 0;
  }
}
