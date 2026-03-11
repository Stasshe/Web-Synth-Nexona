import { describe, expect, it } from "vitest";
import { fft, ifft } from "../fft";

describe("FFT", () => {
  it("roundtrips a signal through FFT and IFFT", () => {
    const n = 256;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    // Create a signal with known harmonics
    for (let i = 0; i < n; i++) {
      real[i] = Math.sin((2 * Math.PI * i) / n) + 0.5 * Math.sin((4 * Math.PI * i) / n);
    }
    const original = new Float32Array(real);

    fft(real, imag);
    ifft(real, imag);

    for (let i = 0; i < n; i++) {
      expect(real[i]).toBeCloseTo(original[i], 4);
    }
  });

  it("pure sine has energy in one bin", () => {
    const n = 256;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      real[i] = Math.sin((2 * Math.PI * i) / n);
    }

    fft(real, imag);

    // Bin 1 should have significant magnitude
    const mag1 = Math.sqrt(real[1] ** 2 + imag[1] ** 2);
    expect(mag1).toBeGreaterThan(50);

    // Other bins (excluding mirrored bin n-1) should be near zero
    for (let i = 2; i < n - 1; i++) {
      const mag = Math.sqrt(real[i] ** 2 + imag[i] ** 2);
      expect(mag).toBeLessThan(1);
    }
  });
});
