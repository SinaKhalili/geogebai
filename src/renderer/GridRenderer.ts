import { CoordinateSystem } from './CoordinateSystem';

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, coordSystem: CoordinateSystem): void {
    const bounds = coordSystem.getVisibleBounds();
    const { major, minor } = coordSystem.getGridSpacing();

    // Compute line ranges with a small buffer so lines don't pop in at the edges.
    const xStart = Math.floor(bounds.xMin / minor) * minor;
    const xEnd = Math.ceil(bounds.xMax / minor) * minor;
    const yStart = Math.floor(bounds.yMin / minor) * minor;
    const yEnd = Math.ceil(bounds.yMax / minor) * minor;

    // --- Minor grid lines ---
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let x = xStart; x <= xEnd; x += minor) {
      // Skip lines that will be drawn as major lines.
      if (this.isMultiple(x, major)) continue;
      const { sx } = coordSystem.worldToScreen(x, 0);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, coordSystem.canvasHeight);
    }
    for (let y = yStart; y <= yEnd; y += minor) {
      if (this.isMultiple(y, major)) continue;
      const { sy } = coordSystem.worldToScreen(0, y);
      ctx.moveTo(0, sy);
      ctx.lineTo(coordSystem.canvasWidth, sy);
    }
    ctx.stroke();

    // --- Major grid lines ---
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let x = Math.floor(bounds.xMin / major) * major; x <= bounds.xMax; x += major) {
      if (this.isNearZero(x)) continue; // axis drawn separately
      const { sx } = coordSystem.worldToScreen(x, 0);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, coordSystem.canvasHeight);
    }
    for (let y = Math.floor(bounds.yMin / major) * major; y <= bounds.yMax; y += major) {
      if (this.isNearZero(y)) continue;
      const { sy } = coordSystem.worldToScreen(0, y);
      ctx.moveTo(0, sy);
      ctx.lineTo(coordSystem.canvasWidth, sy);
    }
    ctx.stroke();

    // --- Axes ---
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    // X-axis
    const { sy: axisY } = coordSystem.worldToScreen(0, 0);
    ctx.moveTo(0, axisY);
    ctx.lineTo(coordSystem.canvasWidth, axisY);

    // Y-axis
    const { sx: axisX } = coordSystem.worldToScreen(0, 0);
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, coordSystem.canvasHeight);

    ctx.stroke();

    // --- Numeric labels ---
    this.drawLabels(ctx, coordSystem, bounds, major);
  }

  private drawLabels(
    ctx: CanvasRenderingContext2D,
    coordSystem: CoordinateSystem,
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
    major: number,
  ): void {
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    const origin = coordSystem.worldToScreen(0, 0);

    // Labels along the x-axis
    const labelYOffset = 6;
    for (let x = Math.floor(bounds.xMin / major) * major; x <= bounds.xMax; x += major) {
      if (this.isNearZero(x)) continue;
      const { sx } = coordSystem.worldToScreen(x, 0);
      const label = this.formatNumber(x);
      // Place label just below the x-axis
      const drawY = Math.min(Math.max(origin.sy + labelYOffset, 2), coordSystem.canvasHeight - 14);
      ctx.fillText(label, sx, drawY);
    }

    // Labels along the y-axis
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    const labelXOffset = -6;

    for (let y = Math.floor(bounds.yMin / major) * major; y <= bounds.yMax; y += major) {
      if (this.isNearZero(y)) continue;
      const { sy } = coordSystem.worldToScreen(0, y);
      const label = this.formatNumber(y);
      // Place label to the left of the y-axis
      const drawX = Math.min(Math.max(origin.sx + labelXOffset, 30), coordSystem.canvasWidth - 2);
      ctx.fillText(label, drawX, sy);
    }
  }

  private formatNumber(value: number): string {
    const abs = Math.abs(value);

    // Use scientific notation for very large or very small numbers.
    if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) {
      return value.toExponential(1);
    }

    // Convert to string and strip trailing zeros.
    // Using toPrecision then parseFloat strips trailing zeros automatically.
    const str = parseFloat(value.toPrecision(10)).toString();
    return str;
  }

  /** Check whether a value is effectively zero (within floating-point tolerance). */
  private isNearZero(value: number): boolean {
    return Math.abs(value) < 1e-10;
  }

  /** Check whether `value` is a multiple of `step` (within tolerance). */
  private isMultiple(value: number, step: number): boolean {
    const remainder = Math.abs(value % step);
    return remainder < step * 1e-6 || remainder > step * (1 - 1e-6);
  }
}
