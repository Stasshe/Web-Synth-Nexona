export function flushDenormal(x: number): number {
  if (x > -1e-12 && x < 1e-12) return 0;
  return x;
}
