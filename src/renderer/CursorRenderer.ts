import { CoordinateSystem } from './CoordinateSystem';

export class CursorRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    coordSystem: CoordinateSystem,
    mouseX: number,
    mouseY: number,
  ): void {
    // --- Crosshair lines ---
    ctx.strokeStyle = '#00000015';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical line through cursor
    ctx.moveTo(mouseX, 0);
    ctx.lineTo(mouseX, coordSystem.canvasHeight);

    // Horizontal line through cursor
    ctx.moveTo(0, mouseY);
    ctx.lineTo(coordSystem.canvasWidth, mouseY);

    ctx.stroke();

    // --- Coordinate tooltip ---
    const { wx, wy } = coordSystem.screenToWorld(mouseX, mouseY);
    const decimals = this.getDecimalPlaces(coordSystem.pixelsPerUnit);
    const label = `(${this.formatCoord(wx, decimals)}, ${this.formatCoord(wy, decimals)})`;

    ctx.font = '12px system-ui, sans-serif';
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;
    const textHeight = 16;

    const paddingX = 8;
    const paddingY = 5;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;

    // Position the tooltip offset from the cursor, keeping it within bounds.
    const offsetX = 14;
    const offsetY = 14;
    let boxX = mouseX + offsetX;
    let boxY = mouseY + offsetY;

    if (boxX + boxWidth > coordSystem.canvasWidth) {
      boxX = mouseX - offsetX - boxWidth;
    }
    if (boxY + boxHeight > coordSystem.canvasHeight) {
      boxY = mouseY - offsetY - boxHeight;
    }

    // Background box with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(label, boxX + paddingX, boxY + boxHeight / 2);
  }

  /** Determine the number of decimal places based on zoom level. */
  private getDecimalPlaces(pixelsPerUnit: number): number {
    if (pixelsPerUnit >= 5000) return 4;
    if (pixelsPerUnit >= 500) return 3;
    if (pixelsPerUnit >= 50) return 2;
    if (pixelsPerUnit >= 5) return 1;
    return 0;
  }

  /** Format a coordinate value with the given number of decimal places. */
  private formatCoord(value: number, decimals: number): string {
    // Avoid displaying "-0.00"
    if (Math.abs(value) < Math.pow(10, -decimals) * 0.5) {
      return (0).toFixed(decimals);
    }
    return value.toFixed(decimals);
  }

  /** Draw a rounded rectangle path (compatible with older Canvas APIs). */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}
