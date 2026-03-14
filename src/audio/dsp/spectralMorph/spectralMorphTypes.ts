export enum SpectralMorphType {
  NONE = 0,
  VOCODE = 1,
  FORMANT_SCALE = 2,
  HARMONIC_SCALE = 3,
  INHARMONIC_SCALE = 4,
  SMEAR = 5,
  RANDOM_AMPLITUDES = 6,
  LOW_PASS = 7,
  HIGH_PASS = 8,
  PHASE_DISPERSE = 9,
  SHEPARD_TONE = 10,
  SKEW = 11,
}

export const SPECTRAL_MORPH_NAMES: Record<number, string> = {
  [SpectralMorphType.NONE]: "None",
  [SpectralMorphType.VOCODE]: "Vocode",
  [SpectralMorphType.FORMANT_SCALE]: "Formant Scale",
  [SpectralMorphType.HARMONIC_SCALE]: "Harmonic Stretch",
  [SpectralMorphType.INHARMONIC_SCALE]: "Inharmonic Stretch",
  [SpectralMorphType.SMEAR]: "Smear",
  [SpectralMorphType.RANDOM_AMPLITUDES]: "Rand Amp",
  [SpectralMorphType.LOW_PASS]: "Low Pass",
  [SpectralMorphType.HIGH_PASS]: "High Pass",
  [SpectralMorphType.PHASE_DISPERSE]: "Phase Disp",
  [SpectralMorphType.SHEPARD_TONE]: "Shepard Tone",
  [SpectralMorphType.SKEW]: "Time Skew",
};
