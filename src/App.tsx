import React from "react";
import { CanvasEditor } from "./components/CanvasEditor";
import { Toolbar } from "./components/Toolbar";

export default function App() {
  return (
    <div style={{ background: "#0d1422", color: "#cde0ff", height: "100vh" }}>
      <Toolbar />
      <CanvasEditor />
    </div>
  );
}