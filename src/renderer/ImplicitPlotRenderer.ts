import { CoordinateSystem } from './CoordinateSystem';
import type { LineSegment } from '../math/marchingSquares';

export class ImplicitPlotRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    segments: LineSegment[],
    coordSystem: CoordinateSystem,
    color: string,
    lineWidth: number = 2.5,
  ): void {
    if (segments.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const p1 = coordSystem.worldToScreen(seg.x1, seg.y1);
      const p2 = coordSystem.worldToScreen(seg.x2, seg.y2);
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
    }

    ctx.stroke();
  }
}
