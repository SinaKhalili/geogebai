import {
  MC_CORNER_OFFSETS,
  MC_EDGE_ENDPOINTS,
  MC_EDGE_TABLE,
  MC_TRI_TABLE,
} from './marchingCubesTables';

export interface MarchingCubesBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export interface MarchingCubesResult {
  positions: Float32Array;
  indices: Uint32Array;
}

const EMPTY: MarchingCubesResult = {
  positions: new Float32Array(0),
  indices: new Uint32Array(0),
};

/**
 * Marching cubes over F: (x, y, z) -> number on a regular grid.
 * Surface is taken at F = 0; sign(F) determines inside/outside.
 *
 * Returns a deduplicated (positions, indices) pair suitable for
 * THREE.BufferGeometry.
 */
export function marchingCubes(
  evaluate: (scope: Record<string, number>) => number,
  sliderScope: Record<string, number>,
  bounds: MarchingCubesBounds,
  resolution: number,
): MarchingCubesResult {
  const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds;
  const N = Math.max(2, Math.floor(resolution));
  const verts = N + 1;

  // Sample grid: index (i, j, k) -> values[i + j*verts + k*verts*verts]
  const values = new Float32Array(verts * verts * verts);
  const dx = (xMax - xMin) / N;
  const dy = (yMax - yMin) / N;
  const dz = (zMax - zMin) / N;

  for (let k = 0; k < verts; k++) {
    const z = zMin + k * dz;
    for (let j = 0; j < verts; j++) {
      const y = yMin + j * dy;
      for (let i = 0; i < verts; i++) {
        const x = xMin + i * dx;
        let v: number;
        try {
          v = evaluate({ ...sliderScope, x, y, z });
        } catch {
          v = NaN;
        }
        values[i + j * verts + k * verts * verts] = v;
      }
    }
  }

  // Walk cells. Per cell, build case index, then emit triangles.
  // Vertex dedup via position hash so adjacent cells share edge midpoints,
  // letting computeVertexNormals smooth normals across cell boundaries.
  const posList: number[] = [];
  const indexList: number[] = [];
  const dedup = new Map<string, number>();

  function getOrAddVertex(x: number, y: number, z: number): number {
    // 5-decimal precision is enough — adjacent cells produce identical floats here.
    const key = `${x.toFixed(5)}|${y.toFixed(5)}|${z.toFixed(5)}`;
    const existing = dedup.get(key);
    if (existing !== undefined) return existing;
    const idx = posList.length / 3;
    posList.push(x, y, z);
    dedup.set(key, idx);
    return idx;
  }

  // Edge intersection cache per cell — 12 entries, reset per cell.
  const cellEdgeIdx = new Int32Array(12);

  for (let k = 0; k < N; k++) {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        // Gather 8 corner values
        let nan = false;
        const cVal = new Float32Array(8);
        for (let c = 0; c < 8; c++) {
          const off = MC_CORNER_OFFSETS[c];
          const v = values[(i + off[0]) + (j + off[1]) * verts + (k + off[2]) * verts * verts];
          if (!Number.isFinite(v)) {
            nan = true;
            break;
          }
          cVal[c] = v;
        }
        if (nan) continue;

        // Case index: bit c set if corner c < 0 (inside)
        let caseIndex = 0;
        for (let c = 0; c < 8; c++) {
          if (cVal[c] < 0) caseIndex |= 1 << c;
        }

        const edges = MC_EDGE_TABLE[caseIndex];
        if (edges === 0) continue;

        // Compute intersection points for each crossed edge
        for (let e = 0; e < 12; e++) {
          if ((edges & (1 << e)) === 0) {
            cellEdgeIdx[e] = -1;
            continue;
          }
          const [a, b] = MC_EDGE_ENDPOINTS[e];
          const va = cVal[a];
          const vb = cVal[b];
          const denom = vb - va;
          // If both are very close to zero, fall back to midpoint.
          let t = Math.abs(denom) < 1e-9 ? 0.5 : -va / denom;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;

          const oa = MC_CORNER_OFFSETS[a];
          const ob = MC_CORNER_OFFSETS[b];
          const xA = xMin + (i + oa[0]) * dx;
          const yA = yMin + (j + oa[1]) * dy;
          const zA = zMin + (k + oa[2]) * dz;
          const xB = xMin + (i + ob[0]) * dx;
          const yB = yMin + (j + ob[1]) * dy;
          const zB = zMin + (k + ob[2]) * dz;

          const px = xA + t * (xB - xA);
          const py = yA + t * (yB - yA);
          const pz = zA + t * (zB - zA);

          cellEdgeIdx[e] = getOrAddVertex(px, py, pz);
        }

        // Emit triangles from MC_TRI_TABLE
        const triBase = caseIndex * 16;
        for (let t = 0; t < 16; t += 3) {
          const e0 = MC_TRI_TABLE[triBase + t];
          if (e0 < 0) break;
          const e1 = MC_TRI_TABLE[triBase + t + 1];
          const e2 = MC_TRI_TABLE[triBase + t + 2];
          const i0 = cellEdgeIdx[e0];
          const i1 = cellEdgeIdx[e1];
          const i2 = cellEdgeIdx[e2];
          if (i0 < 0 || i1 < 0 || i2 < 0) continue;
          if (i0 === i1 || i1 === i2 || i0 === i2) continue;
          indexList.push(i0, i1, i2);
        }
      }
    }
  }

  if (indexList.length === 0) return EMPTY;

  return {
    positions: new Float32Array(posList),
    indices: new Uint32Array(indexList),
  };
}
