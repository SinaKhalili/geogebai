export const COLOR_PALETTE: string[] = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#be185d', // pink
  '#854d0e', // brown
  '#4f46e5', // indigo
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
];

export function getColor(index: number): string {
  return COLOR_PALETTE[((index % COLOR_PALETTE.length) + COLOR_PALETTE.length) % COLOR_PALETTE.length];
}
