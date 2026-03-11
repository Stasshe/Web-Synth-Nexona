"use client";

import { useSnapshot } from "valtio";
import { synthState } from "../../state/synthState";

export function FilterPanel() {
  const snap = useSnapshot(synthState);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Filter</h2>

      <label style={labelStyle}>
        Cutoff
        <input
          type="range"
          min={20}
          max={20000}
          step={1}
          value={snap.filter.cutoff}
          onChange={(e) => {
            synthState.filter.cutoff = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.filter.cutoff}</span>
      </label>

      <label style={labelStyle}>
        Resonance
        <input
          type="range"
          min={0}
          max={0.99}
          step={0.01}
          value={snap.filter.resonance}
          onChange={(e) => {
            synthState.filter.resonance = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.filter.resonance.toFixed(2)}</span>
      </label>

      <label style={labelStyle}>
        Drive
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={snap.filter.drive}
          onChange={(e) => {
            synthState.filter.drive = Number(e.target.value);
          }}
          style={sliderStyle}
        />
        <span style={valueStyle}>{snap.filter.drive.toFixed(1)}</span>
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
