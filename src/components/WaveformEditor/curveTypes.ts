export enum CurveType {
  LINEAR = 0,
  SMOOTH = 1,
  STEP = 2,
  SINE = 3,
}

export interface ControlPoint {
  id: string;
  x: number; // [0, 1] position in cycle
  y: number; // [-1, 1] amplitude
  curveType: CurveType; // interpolation for the segment AFTER this point
}

export interface WaveformModel {
  points: ControlPoint[]; // sorted by x, min 2 (x=0 and x=1)
}

let nextId = 0;
export function makePointId(): string {
  return `cp_${Date.now()}_${nextId++}`;
}

export function defaultModel(): WaveformModel {
  return {
    points: [
      { id: makePointId(), x: 0, y: 0, curveType: CurveType.LINEAR },
      { id: makePointId(), x: 1, y: 0, curveType: CurveType.LINEAR },
    ],
  };
}

export function sineModel(): WaveformModel {
  return {
    points: [
      { id: makePointId(), x: 0, y: 0, curveType: CurveType.SMOOTH },
      { id: makePointId(), x: 0.25, y: 1, curveType: CurveType.SMOOTH },
      { id: makePointId(), x: 0.5, y: 0, curveType: CurveType.SMOOTH },
      { id: makePointId(), x: 0.75, y: -1, curveType: CurveType.SMOOTH },
      { id: makePointId(), x: 1, y: 0, curveType: CurveType.SMOOTH },
    ],
  };
}
