# Web Synth - Nexona

## 1. プロジェクト概要

Web Synth - Nexona は、ブラウザ上で動作するリアルタイム wavetable シンセサイザー。
Next.js + React の UI と、AudioWorklet 上で動く TypeScript DSP エンジンを組み合わせ、低レイテンシで音を生成する。

---

## 2. 主要機能

### シンセ機能

- 3オシレーター構成（OSC A / B / C）
- Sub Oscillator / Noise 生成
- Wavetable プリセット切り替え
- フレーム位置モーフィング
- ユニゾン（Voice数 / Detune / Spread）
- 2段 Warp（Warp1 / Warp2）
- Spectral Morph（複数アルゴリズム）
- 位相オフセット・ランダム位相

### 波形編集機能

- 波形エディタ（Control Point ベース）
- カーブ種別（Linear / Smooth / Step / Sine）
- カスタム波形を wavetable として適用
- Oscillator ごとのカスタム波形保持

### フィルター・エンベロープ

- Filter 1 / Filter 2 の2系統
- フィルターカテゴリ切替（Analog / Ladder / Comb / Formant）
- Cutoff / Resonance / Drive / Env Amount 制御
- Amp Envelope（ADSR）
- Filter Envelope（ADSR）

### モジュレーション

- モジュレーションマトリクス方式
- ソース:
	- LFO1
	- LFO2
	- AMP_ENV
	- FILTER_ENV
	- VELOCITY
	- KEY_TRACK
	- MACRO1-4
	- RANDOM
- ターゲット:
	- OSC pitch / frame / warp / level / pan / unison
	- Filter / Filter2 cutoff / resonance / drive / env amount
	- Noise / Sub level
	- FXパラメータ（Dist/Chorus/Flanger/Phaser/Delay/Reverb/EQ）
- UI上でドラッグ&ドロップによるルーティング作成

### エフェクト

- Distortion
- Compressor
- Chorus
- Flanger
- Phaser
- Delay
- Reverb
- EQ

### UI / 操作機能

- Voiceページ / Effectsページのタブ切替
- 画面下部ピアノ鍵盤（ポインタ操作）
- QWERTY キーボード演奏（対応キー割当あり）
- マスター音量ノブ
- 波形ビジュアライザ
- パラメータJSONエディタ（JSONCコメント対応）

### パッチ機能

- Patch JSON の保存（Download）
- Patch JSON の読込（Upload）
- URLハッシュ共有（gzip + base64）
- 起動時に URL ハッシュから自動復元

### オーディオ基盤

- AudioWorkletNode + AudioWorkletProcessor 構成
- SharedArrayBuffer によるパラメータ共有
- MessagePort によるノート・イベント送信
- 128サンプルブロック処理
- モジュレーションフィードバックのUI返送

### テスト

- Vitest によるユニットテスト
- DSP（Osc/LFO/Filter/Envelope/Effects/Warp/SpectralMorph）
- エンジン層（SynthEngine）
- SABレイヤ（layout）

---

## 3. 使用方法

### 基本操作フロー

1. アプリを開く
2. `Click to start audio engine` ボタンを押す
3. 鍵盤またはキーボードでノートを鳴らす
4. Voice / Effects を編集して音作りする
5. 必要なら Save / Load / Share を使ってパッチを保存・共有する

### 初回起動

- ブラウザのオートプレイ制約のため、音声開始はユーザー操作が必要
- Startボタン押下後に AudioContext と Worklet が初期化される

### 演奏方法

#### 画面鍵盤

- 下部の白鍵/黒鍵をクリックまたはタッチ
- 鍵盤の縦位置でベロシティが変化

#### PCキーボード（QWERTY）

- 下段（例: `Z S X D C ...`）で C3〜B3
- 上段（例: `Q 2 W 3 E ...`）で C4〜E5

### 音作りの流れ（例）

1. OSC A を有効にする
2. プリセット波形を選ぶ
3. Frame / Warp / Spectral Morph を調整
4. Filter 1 の Cutoff と Resonance を設定
5. Amp Envelope の ADSR を調整
6. LFO をドラッグして対象ノブへ割り当てる
7. 必要に応じて FX を追加する

### モジュレーション設定

- モジュレーションソースパネル（Envelope / LFO / Random）から対象ノブへドラッグ
- 追加されたルートは amount で量を調整
- 同一ターゲットへ複数ソースを重ねられる

### パッチ保存・読込

#### Save

- ヘッダーの `Save` を押す
- `patch.json` がダウンロードされる

#### Load

- ヘッダーの `Load` を押す
- `patch.json` を選択して反映

#### Share

- ヘッダーの `Share` を押す
- 現在のパッチがURLハッシュとして生成される
- クリップボードへ共有URLがコピーされる

### Param Editor

- ヘッダーの `Edit` から開く
- JSONC（`//` コメント可）でパラメータを直接編集
- `Apply` で状態へ反映
- `Reset` で現在状態を再生成

---

## 4. 動作環境

### 必須ランタイム

- Node.js（Next.js 16 が動作するバージョン）
- npm

### ブラウザ要件

- AudioWorklet 対応ブラウザ
- SharedArrayBuffer が利用可能な環境
- CompressionStream / DecompressionStream 対応環境（URLパッチ共有で使用）

### 必須ヘッダー

SharedArrayBuffer 利用のため、以下のヘッダーが必要。

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

本リポジトリでは `next.config.ts` と `vercel.json` の両方に設定済み。

### 推奨環境

- デスクトップブラウザ（UI密度が高いため）
- 48kHz サンプルレート環境（実装の初期化値）

---

## 5. インストール・実行方法

### 1) 依存関係インストール

```bash
npm install
```

### 2) 開発サーバ起動

```bash
npm run dev
```

`dev` は以下を実行:

1. `npm run build:worklet`
2. `next dev`

### 3) 本番ビルド

```bash
npm run build
```

`build` は以下を実行:

1. `npm run build:worklet`
2. `next build`

### 4) 本番起動

```bash
npm run start
```

### テスト

```bash
npm run test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Worklet単体ビルド

```bash
npm run build:worklet
```

`scripts/build-worklet.mjs` が `src/audio/worklet/processor.ts` をバンドルし、
`public/worklet/processor.js` を生成する。

---

## 6. ファイル構成

主要構成のみ抜粋。

```text
.
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # メタ情報とルートレイアウト
│  │  ├─ page.tsx                # メイン画面（起動・UI統合・保存/読込/共有）
│  │  └─ globals.css             # 全体スタイル
│  ├─ audio/
│  │  ├─ engine/
│  │  │  ├─ synthEngine.ts       # ブロック処理・SAB読取・LFO/FX統合
│  │  │  ├─ voice.ts             # 1ボイスの音声生成
│  │  │  └─ voiceManager.ts      # ポリフォニー管理
│  │  ├─ dsp/
│  │  │  ├─ oscillator/          # オシレータ/ユニゾン
│  │  │  ├─ wavetable/           # プリセット生成・補間
│  │  │  ├─ warp/                # Warpアルゴリズム
│  │  │  ├─ spectralMorph/       # スペクトル変形
│  │  │  ├─ filter/              # フィルター実装とレジストリ
│  │  │  ├─ envelope/            # ADSR
│  │  │  ├─ lfo/                 # LFO
│  │  │  ├─ modulation/          # ModMatrix
│  │  │  └─ effects/             # エフェクト群
│  │  ├─ sab/
│  │  │  ├─ layout.ts            # SABパラメータ定義とAtomics I/O
│  │  │  └─ init.ts              # SAB初期化
│  │  └─ worklet/
│  │     ├─ node.ts              # UIスレッド側ラッパ
│  │     └─ processor.ts         # AudioWorkletProcessor
│  ├─ components/
│  │  ├─ VoicePage/              # オシレータ/ノイズ/フィルタ画面
│  │  ├─ EffectsPage/            # エフェクト画面
│  │  ├─ Keyboard/               # 画面鍵盤 + QWERTY入力
│  │  ├─ WaveformEditor/         # 波形編集
│  │  ├─ ParamEditor/            # JSONCパラメータ編集
│  │  ├─ ModulatorSidebar/       # Env/LFO/Random
│  │  ├─ Visualizer/             # 波形表示
│  │  └─ ui/                     # Knob/Panel/Select/Toggle
│  ├─ patch/
│  │  ├─ schema.ts               # PatchData定義と簡易バリデーション
│  │  ├─ serializer.ts           # state → patch / patch → URL
│  │  └─ loader.ts               # URL/JSON patch読込
│  └─ state/
│     ├─ synthState.ts           # Valtio状態とSAB同期
│     └─ modFeedback.ts          # Workletからのモジュレーション可視化状態
├─ public/
│  └─ worklet/
│     └─ processor.js            # ビルド済みWorklet成果物
├─ scripts/
│  └─ build-worklet.mjs          # esbuildスクリプト
├─ DESIGN.md                     # アーキテクチャ設計メモ
├─ next.config.ts                # Next設定（COOP/COEPヘッダー）
├─ vercel.json                   # Vercelヘッダー設定
├─ vitest.config.ts              # Vitest設定
└─ biome.json                    # Lint/Format設定
```

### テストファイル配置

- `src/audio/dsp/**/__tests__/*.ts`
- `src/audio/engine/__tests__/synthEngine.test.ts`
- `src/audio/sab/__tests__/layout.test.ts`
- `src/patch/__tests__/*.ts`

---

## 7. 制限事項・既知の問題

### 機能的な制限

- Audio開始はユーザー操作必須（自動再生不可）
- MIDI入力デバイス連携は未実装（現状は画面鍵盤/QWERTY中心）
- プリセット管理UI（バンク管理など）は未実装

### パッチ互換に関する制限

- Patch schema / serializer で保存対象の `effects` は以下3種:
	- `chorus`
	- `delay`
	- `reverb`
- 実装上は Distortion / Compressor / Flanger / Phaser / EQ も存在するが、
	現在のパッチ保存フォーマットには含まれない

### 環境依存の制限

- SharedArrayBuffer 非対応・無効化環境では動作不可
- COOP/COEP ヘッダーが欠けるデプロイでは SAB が使えない
- CompressionStream 非対応環境では URL 共有機能に制約が出る可能性がある

### テスト範囲の制限

- ユニットテスト中心
- ブラウザE2EテストやUI自動操作テストは同梱されていない

---

## 8. 技術仕様

### フロントエンド

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Valtio
- react-dnd（D&DモジュレーションUI）
- lucide-react（アイコン）

### オーディオ処理

- Web Audio API
- AudioWorklet
- SharedArrayBuffer + Atomics
- ブロックサイズ: 128 samples
- sampleRate 初期値: 48000Hz（`new AudioContext({ sampleRate: 48000 })`）

### DSPサブシステム

- Oscillator / Sub Oscillator / Noise
- Warp types:
	- NONE
	- BEND
	- SYNC
	- PHASE_DISTORTION
	- MIRROR
	- QUANTIZE
	- FM
	- FORMANT
	- SQUEEZE
	- PULSE_WIDTH
- Spectral Morph types:
	- NONE
	- VOCODE
	- FORMANT_SCALE
	- HARMONIC_SCALE
	- INHARMONIC_SCALE
	- SMEAR
	- RANDOM_AMPLITUDES
	- LOW_PASS
	- HIGH_PASS
	- PHASE_DISPERSE
	- SHEPARD_TONE
	- SKEW

### フィルターアーキテクチャ

- レジストリ方式（`FILTER_REGISTRY`）
- カテゴリ:
	- Analog
	- Ladder
	- Comb
	- Formant
- Filter type は SAB 上で index 管理

### モジュレーション仕様

- `ModRoute = { source, target, amount }`
- ソース数: 11
- ターゲット数: 60（`ModTarget` enum）
- amount 範囲: `-1..1`

### SAB仕様

- スロット数: 256
- データ型: Float32 を Int32 に再解釈して保存
- 書込: `Atomics.store`
- 読取: `Atomics.load`

### パッチ仕様

- バージョン: `2`
- 形式: JSON
- 共有URL: `gzip -> base64 -> hash`
- バリデーション: `version` / `name` / `oscillators` の最小検証

### 開発ツール

- Vitest（テスト）
- Biome（lint/format）
- esbuild（workletビルド）

---

## 9. ライセンス

MIT License

詳細は `LICENSE` を参照。