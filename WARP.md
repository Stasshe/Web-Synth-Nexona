Vital 系シンセの特徴は **wavetable + warp** にある。
warp は単なるエフェクトではなく、**oscillator phase を変形する DSP**。
つまり

```
phase → warp → wavetable lookup
```

この順序で処理する。

今回は **実用的な warp system 設計**をまとめる。

---

# 1 Warp の基本構造

通常の oscillator

```
phase += freq / sampleRate
sample = wavetable(phase)
```

warp oscillator

```
phase += freq / sampleRate
warpedPhase = warp(phase, amount)
sample = wavetable(warpedPhase)
```

つまり **phase transform**。

これが Vital / Serum のコア。

---

# 2 Warp System Architecture

拡張性を考えるとこうする。

```
Oscillator
 ├ phase
 ├ wavetable
 └ warpProcessor
        ├ type
        └ amount
```

warp 処理

```
phase
 ↓
warp function
 ↓
lookup wavetable
```

warp は **pure function** にする。

---

# 3 Bend Warp

最も基本。

phase を曲げる。

式

```
p = phase
a = amount

if p < 0.5:
    p = p^(1 + a)
else:
    p = 1 - (1 - p)^(1 + a)
```

効果

* harmonic distribution が変わる
* saw が変形する

Vital でよく使う。

---

# 4 Sync Warp

ハードシンク風。

phase を折り返す。

```
p = fract(phase * (1 + amount * 8))
```

結果

* aggressive sound
* metallic tone

classic EDM sound。

---

# 5 Phase Distortion

Casio CZ の方式。

式

```
p = phase + amount * sin(2π phase)
```

効果

* harmonic emphasis
* wavetableでも強力

---

# 6 Mirror Warp

phase を反転する。

```
if phase < amount:
    p = phase
else:
    p = amount - (phase - amount)
```

結果

* waveform symmetry change
* odd harmonics増加

---

# 7 Quantize Warp

phase を段階化。

```
steps = 4 + amount * 64
p = floor(phase * steps) / steps
```

結果

* bitcrusherっぽい音
* digital tone

---

# 8 FM Warp

Vitalの重要機能。

oscillator 同士を FM。

```
phase += modOsc * amount
```

つまり

```
carrierPhase + modulatorSignal
```

FM oscillator構造

```
OscA (carrier)
OscB (modulator)
```

注意

FM は aliasing しやすい。

対策

```
oversampling
```

---

# 9 Warp Pipeline

warp を1つだけにすると拡張性が低い。

おすすめ構造

```
phase
 ↓
warp1
 ↓
warp2
 ↓
wavetable lookup
```

つまり

```
warp stack
```

例

```
sync
+
phase distortion
```

---

# 10 Warp Parameter Smoothing

warp amount を急変させると

**クリックノイズ**

必要

```
current += (target - current) * smoothing
```

例

```
smoothing = 0.001
```

---

# 11 Warp と Aliasing

危険な warp

```
sync
fm
quantize
```

倍音爆発する。

対策

```
band-limited wavetable
oversampling
```

---

# 12 Warp Engine Structure

実用的な設計

```
WarpProcessor
 ├ type
 ├ amount
 └ process(phase)
```

types

```
NONE
BEND
SYNC
PHASE_DIST
MIRROR
QUANTIZE
FM
```

---

# 13 Vital風 Oscillator 完成形

最終 oscillator

```
Oscillator
 ├ phase
 ├ frequency
 ├ wavetable
 ├ warp
 ├ unison
 ├ detune
 └ stereo spread
```

処理

```
for each unison voice:

    phase += freq

    warped = warp(phase)

    sample = wavetable(warped)

sum voices
```

---

# 14 実用レベルの oscillator signal chain

```
phase
 ↓
warp
 ↓
wavetable lookup
 ↓
unison mix
 ↓
drive
 ↓
filter
```

---

# 15 Vital級に近づく追加機能

これがあると一気にプロレベル。

```
spectral warp
formant shift
wavefold
ring mod
```

特に

**spectral warp**

これは Vital の真骨頂。

---

# 16 重要な事実

Serum / Vital の音は

```
wavetable + warp
```

でほぼ決まる。

つまり

* filter
* fx

より

**oscillator engine**

が重要。

---
