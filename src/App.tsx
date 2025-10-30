import React from "react";
import { CanvasEditor } from "./components/CanvasEditor";
import { Toolbar } from "./components/Toolbar";
import { ExportPreview } from "./components/ExportPreview";

export default function App() {
  return (
    <div
      style={{
        background: "#0d1422",
        color: "#cde0ff",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toolbar />
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        <div style={{ flex: "1 1 60%", minWidth: 0 }}>
          <CanvasEditor />
        </div>
        <div style={{ flex: "0 0 40%", minWidth: 280, maxWidth: 520 }}>
          <ExportPreview />
        </div>
      </div>
    </div>
  );
}
