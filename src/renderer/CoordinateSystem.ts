export interface ScreenPoint {
  sx: number;
  sy: number;
}

export interface WorldPoint {
  wx: number;
  wy: number;
}

export interface VisibleBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GridSpacing {
  major: number;
  minor: number;
}

export class CoordinateSystem {
  worldCenterX: number;
  worldCenterY: number;
  pixelsPerUnit: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(width = 800, height = 600) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.worldCenterX = 0;
    this.worldCenterY = 0;
    this.pixelsPerUnit = 50;
  }

  worldToScreen(wx: number, wy: number): ScreenPoint {
    const sx = (wx - this.worldCenterX) * this.pixelsPerUnit + this.canvasWidth / 2;
    const sy = -(wy - this.worldCenterY) * this.pixelsPerUnit + this.canvasHeight / 2;
    return { sx, sy };
  }

  screenToWorld(sx: number, sy: number): WorldPoint {
    const wx = (sx - this.canvasWidth / 2) / this.pixelsPerUnit + this.worldCenterX;
    const wy = -(sy - this.canvasHeight / 2) / this.pixelsPerUnit + this.worldCenterY;
    return { wx, wy };
  }

  getVisibleBounds(): VisibleBounds {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvasWidth, this.canvasHeight);
    return {
      xMin: topLeft.wx,
      xMax: bottomRight.wx,
      yMin: bottomRight.wy,
      yMax: topLeft.wy,
    };
  }

  pan(dxPixels: number, dyPixels: number): void {
    this.worldCenterX -= dxPixels / this.pixelsPerUnit;
    this.worldCenterY += dyPixels / this.pixelsPerUnit;
  }

  zoom(factor: number, screenFocusX: number, screenFocusY: number): void {
    const worldFocus = this.screenToWorld(screenFocusX, screenFocusY);

    this.pixelsPerUnit = Math.min(10000, Math.max(1, this.pixelsPerUnit * factor));

    // Adjust worldCenter so the focus point remains at the same screen position.
    // From worldToScreen: screenFocusX = (worldFocus.wx - worldCenterX) * ppu + canvasWidth/2
    // Solving for worldCenterX: worldCenterX = worldFocus.wx - (screenFocusX - canvasWidth/2) / ppu
    this.worldCenterX = worldFocus.wx - (screenFocusX - this.canvasWidth / 2) / this.pixelsPerUnit;
    this.worldCenterY = worldFocus.wy + (screenFocusY - this.canvasHeight / 2) / this.pixelsPerUnit;
  }

  resize(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
  }

  getGridSpacing(): GridSpacing {
    const rawSpacing = 100 / this.pixelsPerUnit;
    const pow = Math.floor(Math.log10(rawSpacing));
    const magnitude = Math.pow(10, pow);
    const normalized = rawSpacing / magnitude;

    let major: number;
    let minor: number;

    if (normalized < 2) {
      major = 1 * magnitude;
      minor = major / 5;
    } else if (normalized < 5) {
      major = 2 * magnitude;
      minor = major / 4;
    } else {
      major = 5 * magnitude;
      minor = major / 5;
    }

    return { major, minor };
  }

  clone(): CoordinateSystem {
    const copy = new CoordinateSystem(this.canvasWidth, this.canvasHeight);
    copy.worldCenterX = this.worldCenterX;
    copy.worldCenterY = this.worldCenterY;
    copy.pixelsPerUnit = this.pixelsPerUnit;
    return copy;
  }
}
