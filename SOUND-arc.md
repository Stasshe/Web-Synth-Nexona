では、**実用レベルのシンセ**にするための DSP コア設計を整理する。
ここは UI より遥かに重要。音質はほぼここで決まる。

対象は

* Vital / Serum 系 wavetable synth
* WebAudio + AudioWorklet
* TypeScript DSP

を前提にする。

説明は

1. Oscillator品質
2. Unisonアルゴリズム
3. Filter設計
4. Saturation / Drive
5. Oversampling
6. Analog drift
7. Noise設計
8. CPU budget
9. 実用レベルのDSP構成

の順で整理する。

---

# 1 Oscillator品質

wavetable synthの音質の7割はここ。

必要要素

```
band-limited wavetable
phase interpolation
frame interpolation
```

### phase interpolation

wavetable lookup

```
index = phase * tableSize
```

整数だけだとギザギザになる。

線形補間

```
sample = a + (b - a) * frac
```

ここは必須。

---

### frame interpolation

wavetable morph

```
frameIndex = morph * (numFrames - 1)
```

```
sample = lerp(frameA, frameB)
```

Vitalの音の滑らかさはこれ。

---

### table resolution

最低

```
tableSize = 2048
frames = 256
```

これ以下だと音が荒れる。

---

# 2 Unisonアルゴリズム

ここが「太さ」。

悪い実装

```
detune = random
```

良い実装

**symmetric detune**

例

```
voices = 7
detuneSpread = d
```

配置

```
-3d
-2d
-1d
0
+1d
+2d
+3d
```

周波数

```
f_i = f * 2^(detune_i / 1200)
```

(cents)

---

### pan spread

左右配置

```
pan = [-1 ... 1]
```

例

```
-1
-0.6
-0.2
0
0.2
0.6
1
```

---

### phase randomization

ノート開始

```
phase = random()
```

これが無いと

**フランジャーっぽくなる**

---

# 3 Filter設計

ここは初心者が一番失敗する。

基本候補

```
state variable filter
ladder filter
```

Web synthならまず

**State Variable Filter**

式

```
g = tan(pi * cutoff / sampleRate)
```

更新

```
hp = input - lp - k * bp
bp += g * hp
lp += g * bp
```

```
k = resonance
```

---

### drive

Vitalの音はここが大きい。

filter前

```
x = tanh(drive * x)
```

---

# 4 Saturation

デジタルはクリーンすぎる。

必要

**soft clipping**

簡単な式

```
y = tanh(x)
```

または

```
y = x / (1 + abs(x))
```

入れる場所

```
osc mix
filter
master
```

---

# 5 Oversampling

aliasingを減らす。

普通

```
1x
```

良い

```
2x
```

処理

```
upsample
process
downsample
```

ただし CPU増える。

Web synthなら

```
filter only oversampling
```

でも十分。

---

# 6 Analog drift

アナログシンセは

完全に安定していない。

これを再現。

### pitch drift

低周波ノイズ

```
f = base + drift
```

drift

```
0.1–0.5 cent
```

---

### phase drift

```
phase += tinyNoise
```

これだけで

**かなりアナログ感出る。**

---

# 7 Noise generator

意外と重要。

種類

```
white
pink
brown
```

pink noise

```
1 / f spectrum
```

アナログっぽい。

---

# 8 CPU Budget

AudioWorklet

```
sampleRate = 48000
block = 128
```

1秒

```
375 blocks
```

もし

```
voices = 16
osc = 3
unison = 8
```

実質

```
16 * 3 * 8 = 384 oscillators
```

この規模でも

**TypeScriptで普通に動く。**

---

# 9 実用レベルDSP構成

最終形

```
Voice
 ├ OscA
 ├ OscB
 ├ Sub
 ├ Noise
 │
 ├ Mixer
 │
 ├ Drive
 │
 ├ Filter
 │
 ├ Amp Envelope
 │
 └ Pan
```

Voice mix

↓

```
Chorus
Delay
Reverb
Limiter
```

---

# 10 実用シンセに必須の10要素

これが無いと「デモ」。

必須

```
band-limited wavetable
unison detune
frame interpolation
filter drive
soft saturation
random phase
stereo spread
analog drift
pink noise
modulation matrix
```

---

# 11 Web Synth特有の落とし穴

これはかなり重要。

### parameter smoothing

UI変更

```
cutoff = 200 → 2000
```

一瞬で変えると

**クリックノイズ**

必要

```
smooth = lerp(current, target, α)
```

---

### denormal numbers

小さい値

```
1e-20
```

CPU爆死する。

対策

```
if abs(x) < 1e-12 → 0
```

---

# 12 Vital級にするなら

次に必要なのはこれ。

```
warp algorithms
spectral warp
FM oscillator
wavetable editor
```

特に

**warp**

ここが Vital の最大の特徴。

---

もし希望あれば次は

**「VitalのwarpモードをWeb synthで再現するDSP」**

を解説できる。

これは
**シンセ設計の一番面白い部分**。
