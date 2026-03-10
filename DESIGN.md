# Web Wavetable Synth Architecture (Next.js)

## Goals

* Browser-based wavetable synthesizer
* Vital-inspired architecture
* Expandable DSP design
* Real-time audio with stable latency

---

## System Architecture

Layers:

1. UI Layer (Next.js + React)
2. State Layer (Valtio)
3. Audio Engine (TypeScript DSP initially)
4. WebAudio Layer (AudioWorklet)

Signal flow:

UI → Synth State → AudioWorklet → DSP Engine → Audio Output

DSP runs in the AudioWorklet thread.

---

## DSP Engine

Core modules:

AudioEngine

* VoiceManager
* OscillatorEngine
* ModulationEngine
* Filter
* Effects

Each note creates one voice.

Polyphony target:

16–32 voices

---

## Voice Architecture

Voice

* Oscillator A
* Oscillator B
* Sub Oscillator
* Noise
* Mixer
* Filter
* Amp Envelope

Signal Flow:

OscA
OscB
Sub
Noise
↓
Mixer
↓
Filter
↓
Amplifier
↓
Output

---

## Oscillator Engine

Each oscillator supports:

* wavetable playback
* unison
* detune
* phase offset
* warp modes

Unison voices: 1–16

---

## Wavetable System

Structure:

wavetable[frame][sample]

Typical size:

* tableSize: 2048 samples
* frames: 128–256

Interpolation:

1. Phase interpolation
2. Frame interpolation

---

## Band‑Limited Wavetable Generation

Goal: prevent aliasing.

Approach:

1. Generate waveform
2. FFT
3. Remove harmonics above Nyquist
4. Inverse FFT
5. Store wavetable frames

Multiple harmonic‑limited tables may be stored for different pitch ranges.

---

## Envelope System

ADSR envelope with states:

* Idle
* Attack
* Decay
* Sustain
* Release

Used for:

* amplitude
* filter modulation

---

## LFO

Parameters:

* rate
* shape
* phase
* sync

Shapes:

* sine
* triangle
* square
* custom

---

## Modulation Matrix

Structure:

source → target

Examples:

* LFO1 → filter cutoff
* ENV2 → wavetable position

Evaluation:

value = base + Σ(source × amount)

---

## Filter

Initial filter type:

State Variable Filter

Modes:

* lowpass
* highpass
* bandpass

Parameters:

* cutoff
* resonance

---

## Effects (Post FX)

Chain example:

voice mix
→ distortion
→ chorus
→ delay
→ reverb

---

## WebAudio Layer

Architecture:

AudioContext
→ AudioWorkletNode
→ AudioWorkletProcessor

DSP executes in AudioWorklet.

Block size typically 128 samples.

---

## UI Architecture

Next.js app router.

Panels:

* OscillatorPanel
* FilterPanel
* LfoPanel
* EnvelopePanel
* EffectsPanel
* Visualizer

---

## State Management

Valtio proxy state.

Responsibilities:

* synth parameters
* UI state
* patch state

State updates are mirrored to AudioWorklet.

---

## Patch System

Patch format: JSON

Example:

{
oscillators: {},
filter: {},
envelopes: {},
lfos: {},
modulations: []
}

Patch sharing via encoded URL.

---

## Visualization

Real‑time waveform and spectrum display.

Possible implementations:

* Canvas2D
* WebGL
* WebGPU (future)

---

## Future Features

* collaborative editing
* procedural wavetable generation
* AI patch generation
* WebGPU spectral visualization

These features are not part of the initial implementation but the architecture should allow integration later.

---

## Directory Structure

src

app/
page.tsx

components/
OscillatorPanel
FilterPanel
LfoPanel
EnvelopePanel

state/
synthState.ts

audio/
worklet/
processor.ts
node.ts

engine/
synthEngine.ts
voiceManager.ts

dsp/
oscillator/
wavetable/
filter/
envelope/
effects/

patch/
schema.ts
serializer.ts

utils/

---

## Minimal Implementation Phase

Phase 1:

* single wavetable oscillator
* ADSR
* filter
* mono voice

Phase 2:

* polyphony
* unison
* modulation

Phase 3:

* multi oscillator
* effects

Phase 4:

* advanced wavetable tools
* visualizers

---

## Design Principles

1. UI and DSP separation
2. deterministic audio processing
3. modular DSP components
4. extensible modulation system
5. future collaborative features
