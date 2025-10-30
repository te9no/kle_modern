import React, { useMemo } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { exportZMK, exportQMK } from "../utils/exportZMK";

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "#0b1220",
  borderLeft: "1px solid #223",
  height: "100%",
};

const sectionStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #1a2236",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#cde0ff",
};

const preStyle: React.CSSProperties = {
  background: "#111a2e",
  border: "1px solid #1f2a3f",
  borderRadius: 6,
  padding: 12,
  whiteSpace: "pre-wrap",
  fontFamily: "monospace",
  fontSize: 12,
  color: "#e2ecff",
  minHeight: 160,
  overflow: "auto",
};

const placeholderStyle: React.CSSProperties = {
  color: "#5f6f94",
  fontStyle: "italic",
};

export const ExportPreview: React.FC = () => {
  const { keys, unitPitch } = useLayoutStore();

  const { zmk, qmk } = useMemo(() => {
    if (!keys.length) {
      return { zmk: "", qmk: "" };
    }
    try {
      return {
        zmk: exportZMK(keys, unitPitch),
        qmk: JSON.stringify(exportQMK(keys), null, 2),
      };
    } catch {
      return { zmk: "Failed to generate output.", qmk: "Failed to generate output." };
    }
  }, [keys, unitPitch]);

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Physical Layout (Devicetree)</h3>
        {zmk ? <pre style={preStyle}>{zmk}</pre> : <span style={placeholderStyle}>レイアウトを読み込むと表示されます。</span>}
      </div>
      <div style={{ ...sectionStyle, flex: 1, borderBottom: "none", overflow: "hidden" }}>
        <h3 style={headingStyle}>QMK JSON</h3>
        {qmk ? <pre style={{ ...preStyle, flex: 1 }}>{qmk}</pre> : <span style={placeholderStyle}>レイアウトを読み込むと表示されます。</span>}
      </div>
    </div>
  );
};
