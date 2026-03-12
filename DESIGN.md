# Web Synth - Nexona — Architecture v2

## Goals

- Browser-based wavetable synthesizer
- Vital-inspired sound quality
- Expandable DSP design
- Real-time audio with stable latency
- Vercel static deployment

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI | Next.js + React |
| State | Valtio |
| DSP | TypeScript (WASM as future option) |
| Audio | Web Audio API + AudioWorklet |
| Deployment | Vercel |

WASM is explicitly a future option. TypeScript DSP is sufficient for Phase 1–3.
WASM migration is possible if DSP modules are kept behind clean class boundaries.

---

## System Architecture

Four layers:

```
UI Layer        (Next.js + React)
State Layer     (Valtio proxy)
Audio Engine    (TypeScript DSP in AudioWorklet)
WebAudio Layer  (AudioContext + AudioWorkletNode)
```

Signal flow:

```
UI → Valtio State → SAB / MessagePort → AudioWorklet → DSP Engine → Audio Output
```

DSP runs exclusively in the AudioWorklet thread.
UI thread never touches audio buffers.

---

## Thread Communication Design

Two channels are used. Do not mix their roles.

### SharedArrayBuffer — parameter values

Used for continuously changing numeric parameters (cutoff, detune, warpAmount, etc.).

```
Float32 values encoded as Int32 via bit reinterpretation.
Written from UI thread via Atomics.store.
Read from AudioWorklet thread via Atomics.load.
```

Requires the following response headers on Vercel:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### MessagePort — events

Used for discrete events that require immediate handling.

```
noteOn(note, velocity)
noteOff(note)
loadPatch(patch)
loadWavetable(id, data)
```

### Valtio → SAB sync

Valtio subscribe mirrors parameter changes to SAB.
Continuous parameters use SAB. Events use MessagePort directly.

```
subscribe(synthState.filter, () => {
  setParam(SabParam.FilterCutoff, synthState.filter.cutoff)
})
```

---

## SAB Parameter Layout

All parameters are Float32 encoded as Int32. Managed via enum.

```
Master        0–9
OscA         10–29
OscB         30–49
Sub / Noise  50–59
Filter       60–69
Amp Env      70–79
Filter Env   80–89
LFO1         90–99
Effects     100–119

TOTAL = 256 slots
```

Key entries:

```
MasterVolume = 0

OscAOn = 10
OscAWavetableIndex = 11
OscAFramePosition = 12
OscAPitch = 13
OscADetune = 14
OscAUnisonVoices = 15
OscAUnisonDetune = 16
OscAUnisonSpread = 17
OscALevel = 18
OscAPan = 19
OscAWarpType = 20
OscAWarpAmount = 21

FilterCutoff = 60
FilterResonance = 61
FilterDrive = 62
FilterType = 63
FilterEnvAmount = 64

AmpEnvAttack = 70
AmpEnvDecay = 71
AmpEnvSustain = 72
AmpEnvRelease = 73
```

---

## DSP Engine Structure

```
AudioEngine
 ├ VoiceManager
 │   └ Voice[]
 ├ ModulationEngine
 ├ wavetablePresets
 ├ EffectsChain
 └ Output
```

Each note creates one Voice. Polyphony target: 16 voices.

---

## Voice Architecture

```
Voice
 ├ OscillatorA
 ├ OscillatorB
 ├ SubOscillator
 ├ NoiseGenerator
 ├ Mixer
 ├ Drive (tanh saturation)
 ├ Filter (SVF)
 ├ AmpEnvelope
 └ Pan
```

Signal flow per voice:

```
OscA + OscB + Sub + Noise
 ↓
Mixer
 ↓
Drive
 ↓
Filter
 ↓
AmpEnvelope
 ↓
Pan → Output
```

### Voice Lifecycle

```
IDLE → ATTACK → DECAY → SUSTAIN → RELEASE → IDLE
```

noteOn triggers ATTACK. noteOff triggers RELEASE.
Voice returns to IDLE when amplitude reaches zero.

---

## Voice Stealing

When all voices are active and a new noteOn arrives:

1. Find voices in RELEASE state → steal the quietest
2. If none in RELEASE → steal the oldest active voice
3. Apply short fade-out before reassigning to prevent click

This must be implemented before polyphony is tested.

---

## Oscillator Engine

Each oscillator:

```
Oscillator
 ├ phase
 ├ frequency
 ├ wavetable reference
 ├ unisonVoices (1–16)
 ├ unisonDetune (cents)
 ├ unisonSpread (pan)
 ├ warpProcessor
 └ framePosition (morph)
```

### Phase Accumulation

```
phase += frequency / sampleRate
if phase >= 1.0: phase -= 1.0
```

### Wavetable Lookup

```
index = phase * tableSize
i = floor(index)
frac = index - i
sample = table[i] * (1 - frac) + table[i+1] * frac
```

Linear interpolation is mandatory. Integer lookup produces audible artifacts.

### Frame Interpolation (morph)

```
frameIndex = morph * (numFrames - 1)
f = floor(frameIndex)
frac = frameIndex - f
sample = lerp(wavetable[f][i], wavetable[f+1][i], frac)
```

---

## Unison Algorithm

Bad implementation: random detune per voice.
Correct implementation: symmetric spread.

For N unison voices with spread d (cents):

```
voice 0: -((N-1)/2) * d
voice 1: -((N-1)/2 - 1) * d
...
voice N-1: +((N-1)/2) * d
```

Frequency conversion:

```
freq_i = baseFreq * 2^(detune_i / 1200)
```

Pan spread: evenly distributed from -1 to +1.

Phase at note start: randomized per unison voice.
Without random phase, output sounds like a flanger.

---

## Warp System

Warp transforms the oscillator phase before wavetable lookup.

```
phase → warpProcessor → wavetable lookup
```

WarpProcessor is a pure function:

```
WarpProcessor
 ├ type: WarpType
 ├ amount: float [0, 1]
 └ process(phase) → warpedPhase
```

### Warp Types

**BEND**
```
if phase < 0.5:
    p = phase ^ (1 + amount)
else:
    p = 1 - (1 - phase) ^ (1 + amount)
```

**SYNC**
```
p = fract(phase * (1 + amount * 8))
```
Warning: aliasing-prone. Use with band-limited tables.

**PHASE_DISTORTION** (Casio CZ style)
```
p = phase + amount * sin(2π * phase)
```

**MIRROR**
```
if phase < amount:
    p = phase
else:
    p = amount - (phase - amount)
```

**QUANTIZE**
```
steps = floor(4 + amount * 60)
p = floor(phase * steps) / steps
```
Warning: aliasing-prone.

**FM**
```
phase += modulatorSignal * amount
```
OscB acts as modulator for OscA.
Warning: aliasing-prone. Requires oversampling or band-limited tables.

### Warp Pipeline

Two warp stages can be chained:

```
phase → warp1 → warp2 → wavetable lookup
```

### Warp Parameter Smoothing

Warp amount must be smoothed to prevent clicks:

```
current += (target - current) * 0.001
```

---

## Band-Limited Wavetable Generation

### Why it is required

Saw, square, and all non-sine waveforms contain harmonics above Nyquist.
These alias back into the audible range as inharmonic noise.
Sync, FM, and quantize warp modes make aliasing significantly worse.

### Approach: Lazy generation with pitch-band cache

Wavetables are not pre-generated at startup.
They are generated on first use per pitch band, then cached.

```
pitchBand(midiNote) = floor(midiNote / 12)

key = `${wavetableId}_${pitchBand(note)}`

if cache.has(key):
    return cache.get(key)
else:
    table = generateBandLimited(wavetableId, note)
    cache.set(key, table)
    return table
```

### Generation pipeline

```
1. Generate one cycle of waveform (2048 samples, oversampled)
2. FFT
3. Zero all bins above Nyquist for this pitch band
4. Inverse FFT
5. Normalize
6. Store as Float32Array
```

### Table size and frames

```
tableSize = 2048 samples
frames = 256 (for wavetable morph)
pitchBands = 10 (one per octave, MIDI 0–127)
```

Memory per wavetable:
```
256 frames × 2048 samples × 10 bands × 4 bytes ≈ 20 MB
```

Load only on demand. Do not pre-generate all tables at startup.

---

## Filter

State Variable Filter (SVF).

### Coefficient calculation

```
g = tan(π * cutoff / sampleRate)
k = resonance
```

### Per-sample update

```
hp = (input - lp - k * bp) / (1 + g * k + g * g)
bp = bp + g * hp
lp = lp + g * bp
```

### Drive (pre-filter saturation)

```
x = tanh(drive * x)
```

This is responsible for a significant portion of the analog warmth in Vital-style filters.
Apply before the SVF computation.

### Modes

lowpass, highpass, bandpass selectable per voice.

### Oversampling

Filter-only 2x oversampling is a viable CPU-efficient option.
Full-chain oversampling is deferred to a later phase.

---

## Envelope System

ADSR with sample-accurate transitions.

```
States: IDLE → ATTACK → DECAY → SUSTAIN → RELEASE → IDLE
```

Used for: amplitude, filter cutoff modulation.

Exponential curves recommended for attack and release.
Linear sustain level.

---

## LFO

```
LFO
 ├ rate (Hz or tempo-synced)
 ├ shape: sine | triangle | square | random
 ├ phase
 └ syncMode: free | tempo
```

LFO runs at control rate (per block, not per sample) to reduce CPU load.

---

## Modulation Matrix

```
ModRoute
 ├ source: ModSource
 ├ target: ModTarget
 └ amount: float [-1, 1]
```

Evaluation per sample:

```
finalValue = baseValue + Σ(source_i * amount_i)
```

Sources: LFO1, LFO2, AmpEnv, FilterEnv, Velocity, KeyTrack, Macro1–4

Targets: OscA/B pitch, OscA/B framePosition, OscA/B warpAmount,
         FilterCutoff, FilterResonance, AmpLevel, PanPosition

---

## Saturation

Soft clipping applied at mixer output and optionally at master output.

```
y = tanh(x)
```

Alternative (cheaper):

```
y = x / (1 + abs(x))
```

Prevents digital harshness without heavy CPU cost.

---

## Analog Drift

Slight instability applied per voice to simulate analog behavior.

### Pitch drift

Low-frequency noise added to oscillator frequency:

```
drift = perlinNoise(time * 0.1) * 0.3  (cents)
freq = baseFreq * 2^(drift / 1200)
```

### Phase drift

Small noise added to phase accumulator each sample:

```
phase += tinyNoise * 0.0001
```

Range: 0.1–0.5 cents pitch drift is sufficient.

---

## Noise Generator

```
Types: white | pink | brown
```

Pink noise (1/f spectrum) is preferred for analog-style sounds.

Pink noise generation: Paul Kellet's algorithm or filtered white noise.

Used as a voice source, mixed into the oscillator mixer.

---

## Effects Chain (Post-Voice)

```
voiceMix
 ↓
Chorus
 ↓
Delay
 ↓
Reverb
 ↓
Limiter
 ↓
Output
```

Effects run on the summed voice output, not per-voice.

---

## Parameter Smoothing

All continuously-varying parameters must be smoothed.

```
smoothed += (target - smoothed) * α
```

Typical α values:
- Cutoff, resonance: 0.005
- Pitch: 0.01
- Warp amount: 0.001

Without smoothing, any parameter change that occurs mid-block produces an audible click.

---

## Denormal Prevention

Denormal floating-point values (near 1e-20) cause severe CPU spikes in some DSP loops.

Apply to all feedback paths (filter state variables, envelope decay tail):

```
if abs(x) < 1e-12: x = 0
```

Or add a small DC offset (1e-25) to feedback nodes.

---

## AudioContext Initialization

AudioContext must be created inside a user gesture handler.
This is a browser requirement. It cannot be bypassed.

```
button.onClick → new AudioContext() → load worklet → ready
```

Do not attempt to create AudioContext on page load.

---

## CPU Budget

```
sampleRate = 48000
blockSize = 128
blocks/sec = 375
```

Estimated load at max polyphony:

```
16 voices × 2 oscillators × 8 unison = 256 oscillator instances
+ filter per voice
+ modulation per voice
```

TypeScript DSP can handle this. Measure before optimizing.
If CPU becomes a bottleneck in Phase 3+, migrate DSP hot path to WASM.

---

## Wavetable Data

Basic waveforms (sine, saw, square, triangle) are bundled as JSON.
User wavetables are loaded from Vercel Blob storage on demand.

```
fetch(wavetableUrl)
 ↓
ArrayBuffer
 ↓
bandLimitGenerate(buffer, midiNote)
 ↓
cache
```

---

## UI Architecture

Next.js App Router. All audio components use `"use client"`.
AudioContext is created client-side only.

```
Panels:
 OscillatorPanel (A, B, Sub)
 FilterPanel
 EnvelopePanel (Amp, Filter)
 LfoPanel
 ModulationPanel
 EffectsPanel
 Visualizer
```

---

## State Management

Valtio proxy. Single source of truth for all synth parameters.

```
synthState
 ├ oscillators: { a, b, sub }
 ├ filter
 ├ envelopes: { amp, filter }
 ├ lfos: [lfo1, lfo2]
 ├ modulations: ModRoute[]
 ├ effects
 └ master
```

Valtio subscribe → SAB write for continuous params.
Direct MessagePort post for events.

---

## Patch System

Format: JSON

```json
{
  "oscillators": {},
  "filter": {},
  "envelopes": {},
  "lfos": {},
  "modulations": [],
  "effects": {}
}
```

URL sharing: patch JSON → gzip → base64 → URL fragment.

---

## Visualization

Phase 1–2: Canvas2D waveform display.
Phase 3: WebGL spectrum analyzer.
Future: WebGPU spectrogram.

Real-time data passed from AudioWorklet to UI via MessagePort (meter, waveform buffer).

---

## Directory Structure

```
src/
 app/
   page.tsx
   layout.tsx

 components/
   OscillatorPanel/
   FilterPanel/
   EnvelopePanel/
   LfoPanel/
   ModulationPanel/
   EffectsPanel/
   Visualizer/

 state/
   synthState.ts

 audio/
   sab/
     layout.ts          (SabParam enum, setParam, getParam)
     init.ts

   worklet/
     processor.ts
     node.ts

   engine/
     synthEngine.ts
     voiceManager.ts

   dsp/
     oscillator/
       oscillator.ts
       unisonEngine.ts
     wavetable/
       wavetablePresets.ts
       bandlimit.ts
       cache.ts
     warp/
       warpProcessor.ts
       warpTypes.ts
     filter/
       svf.ts
     envelope/
       adsr.ts
     lfo/
       lfo.ts
     modulation/
       modMatrix.ts
     effects/
       chorus.ts
       delay.ts
       reverb.ts
       limiter.ts
     utils/
       smoothing.ts
       denormal.ts
       interpolation.ts
       drift.ts
       noise.ts

 patch/
   schema.ts
   serializer.ts
   loader.ts

 utils/
```

---

## Implementation Phases

### Phase 1 — Minimal working audio

- AudioWorklet initialization
- SAB + MessagePort communication
- Single sine wavetable oscillator (1 frame, no morph)
- ADSR envelope (amp only)
- SVF filter (lowpass)
- Mono voice
- Parameter smoothing
- Denormal prevention

Target: sound comes out, parameters respond without clicks.

### Phase 2 — Polyphony and core DSP

- Voice manager with stealing
- Band-limited wavetable generation (lazy + cache)
- Frame interpolation (morph)
- Unison (symmetric detune, pan spread, random phase)
- Warp system (Bend, Sync, Phase Distortion, Mirror)
- Filter drive
- Amp + Filter envelopes
- LFO with modulation matrix

### Phase 3 — Full voice architecture

- OscillatorB and Sub
- Noise generator (pink)
- FM warp
- Analog drift
- Soft saturation
- Effects chain (Chorus, Delay, Reverb, Limiter)
- Patch save/load/share

### Phase 4 — Advanced and future

- Canvas2D → WebGL visualizer
- Procedural wavetable generation
- Wavetable editor
- Collaborative editing (WebSocket, last-write-wins patch sync)
- AI patch generation
- WebGPU spectrogram
- WASM DSP migration (if CPU budget is exceeded)

---

## Design Principles

1. UI thread and DSP thread are strictly separated
2. All audio state lives in the AudioWorklet; Valtio is a mirror
3. DSP modules are pure functions or stateful classes with no UI dependencies
4. Parameters are always smoothed before use in DSP
5. Deterministic output: same patch produces same sound on any browser
6. Measure CPU before optimizing; do not optimize prematurely
7. Each phase must produce working audio before the next begins

---

## Known Risks

| Risk | Mitigation |
|------|-----------|
| SAB unavailable (missing COOP/COEP headers) | Verify vercel.json headers in Phase 1 |
| Wavetable cache memory growth | Cap cache size, evict LRU entries |
| Voice stealing click | Implement fade-out before voice reassignment |
| Warp aliasing (Sync, FM, Quantize) | Use band-limited tables, consider per-warp oversampling |
| Denormal CPU spike | Apply denormal guard in all filter and envelope feedback paths |
| AudioContext blocked by browser | Always initialize inside user gesture |
| Parameter click on fast change | Smoothing on every continuously-varying SAB parameter |
