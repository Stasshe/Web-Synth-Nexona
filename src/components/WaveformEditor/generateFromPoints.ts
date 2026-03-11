import { CurveType, type WaveformModel } from "./curveTypes";

export function generateWaveformFromPoints(model: WaveformModel, tableSize: number): Float32Array {
  const data = new Float32Array(tableSize + 1);
  const { points } = model;

  if (points.length < 2) {
    data[tableSize] = data[0];
    return data;
  }

  for (let i = 0; i <= tableSize; i++) {
    const t = i / tableSize;

    // Find segment: largest k where points[k].x <= t
    let k = 0;
    for (let j = 1; j < points.length; j++) {
      if (points[j].x <= t) k = j;
      else break;
    }

    // Last point — use its y directly
    if (k >= points.length - 1) {
      data[i] = points[points.length - 1].y;
      continue;
    }

    const p0 = points[k];
    const p1 = points[k + 1];
    const segLen = p1.x - p0.x;
    const localT = segLen > 0 ? (t - p0.x) / segLen : 0;

    switch (p0.curveType) {
      case CurveType.LINEAR:
        data[i] = p0.y + (p1.y - p0.y) * localT;
        break;

      case CurveType.SMOOTH: {
        // Cosine interpolation — smooth S-curve
        const ct = (1 - Math.cos(localT * Math.PI)) * 0.5;
        data[i] = p0.y + (p1.y - p0.y) * ct;
        break;
      }

      case CurveType.STEP:
        data[i] = p0.y;
        break;

      case CurveType.SINE: {
        // Half-sine arch between points
        const baseline = p0.y + (p1.y - p0.y) * localT;
        const amplitude = Math.abs(p1.y - p0.y) || 0.5;
        data[i] = baseline + amplitude * Math.sin(localT * Math.PI * 2);
        break;
      }

      default:
        data[i] = p0.y + (p1.y - p0.y) * localT;
    }
  }

  // Wrap-around
  data[tableSize] = data[0];
  return data;
}
