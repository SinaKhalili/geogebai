import { CoordinateSystem } from './CoordinateSystem';
import type { Point } from '../math/types';

export class ExplicitPlotRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    points: (Point | null)[],
    coordSystem: CoordinateSystem,
    color: string,
    lineWidth: number = 2.5,
  ): void {
    if (points.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    const yClipMin = -2000;
    const yClipMax = coordSystem.canvasHeight + 2000;
    let penDown = false;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];

      if (pt === null) {
        // Gap marker: lift the pen
        penDown = false;
        continue;
      }

      const { sx, sy } = coordSystem.worldToScreen(pt.x, pt.y);

      // Clip points that are extremely far off-screen vertically
      if (sy < yClipMin || sy > yClipMax) {
        penDown = false;
        continue;
      }

      if (!penDown) {
        ctx.moveTo(sx, sy);
        penDown = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.stroke();
  }
}
