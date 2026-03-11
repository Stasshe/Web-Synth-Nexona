"use client";

import { useSnapshot } from "valtio";
import { synthState } from "../../state/synthState";

export function OscillatorPanel() {
  const snap = useSnapshot(synthState);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Oscillator A</h2>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={snap.oscillator.on}
          onChange={(e) => {
            synthState.oscillator.on = e.target.checked;
          }}
        />
        On
      </label>

      <label style={labelStyle}>
        Level
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snap.oscillator.level}
          onChange={(e) => {
            synthState.oscillator.level = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.oscillator.level.toFixed(2)}</span>
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
  width: 40,
  textAlign: "right",
  fontFamily: "monospace",
  fontSize: 12,
};
