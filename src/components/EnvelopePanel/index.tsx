"use client";

import { useSnapshot } from "valtio";
import { synthState } from "../../state/synthState";

export function EnvelopePanel() {
  const snap = useSnapshot(synthState);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Amp Envelope</h2>

      <label style={labelStyle}>
        Attack
        <input
          type="range"
          min={0.001}
          max={2}
          step={0.001}
          value={snap.envelope.attack}
          onChange={(e) => {
            synthState.envelope.attack = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.envelope.attack.toFixed(3)}s</span>
      </label>

      <label style={labelStyle}>
        Decay
        <input
          type="range"
          min={0.001}
          max={2}
          step={0.001}
          value={snap.envelope.decay}
          onChange={(e) => {
            synthState.envelope.decay = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.envelope.decay.toFixed(3)}s</span>
      </label>

      <label style={labelStyle}>
        Sustain
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snap.envelope.sustain}
          onChange={(e) => {
            synthState.envelope.sustain = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.envelope.sustain.toFixed(2)}</span>
      </label>

      <label style={labelStyle}>
        Release
        <input
          type="range"
          min={0.001}
          max={5}
          step={0.001}
          value={snap.envelope.release}
          onChange={(e) => {
            synthState.envelope.release = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.envelope.release.toFixed(3)}s</span>
      </label>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "#252540",
  borderRadius: 8,
  padding: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  margin: "0 0 12px",
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#8888aa",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
};

const sliderStyle: React.CSSProperties = { flex: 1 };

const valueStyle: React.CSSProperties = {
  width: 50,
  textAlign: "right",
  fontFamily: "monospace",
  fontSize: 12,
};
