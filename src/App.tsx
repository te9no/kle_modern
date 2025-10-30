import React, { useEffect } from "react";
import { CanvasEditor } from "./components/CanvasEditor";
import { NodeEditor } from "./components/NodeEditor";
import { Toolbar } from "./components/Toolbar";
import { ExportPreview } from "./components/ExportPreview";
import { useLayoutStore } from "./store/layoutStore";

export default function App() {
  const viewMode = useLayoutStore((state) => state.viewMode);
  const undo = useLayoutStore((state) => state.undo);
  const redo = useLayoutStore((state) => state.redo);
  const duplicateSelected = useLayoutStore((state) => state.duplicateSelected);
  const deleteSelected = useLayoutStore((state) => state.deleteSelected);
  const EditorComponent = viewMode === "node" ? NodeEditor : CanvasEditor;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const isMac = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
      const meta = isMac ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      if (meta) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (key === "y") {
          event.preventDefault();
          redo();
          return;
        }
        if (key === "d" || key === "c") {
          event.preventDefault();
          duplicateSelected();
          return;
        }
      } else if (key === "delete" || key === "backspace") {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, duplicateSelected, deleteSelected]);

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
          <EditorComponent />
        </div>
        <div style={{ flex: "0 0 40%", minWidth: 280, maxWidth: 520 }}>
          <ExportPreview />
        </div>
      </div>
    </div>
  );
}
