import React from "react";
import { useLayoutStore } from "../store/layoutStore";
import { importKLE } from "../utils/importKLE";
import { exportZMK, exportQMK } from "../utils/exportZMK";

export const Toolbar: React.FC = () => {
  const { setKeys, rotateSelected, keys } = useLayoutStore();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = importKLE(JSON.parse(reader.result as string));
      setKeys(parsed);
    };
    reader.readAsText(file);
  };

  const handleExportZMK = () => {
    const data = exportZMK(keys);
    const blob = new Blob([data], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "layout.keymap";
    a.click();
  };

  const handleExportQMK = () => {
    const data = JSON.stringify(exportQMK(keys), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "layout_qmk.json";
    a.click();
  };

  return (
    <div style={{ display: "flex", gap: 10, padding: 10 }}>
      <input type="file" accept=".json" onChange={handleImport} />
      <button onClick={() => rotateSelected(15)}>Rotate +15°</button>
      <button onClick={handleExportZMK}>Export ZMK</button>
      <button onClick={handleExportQMK}>Export QMK</button>
    </div>
  );
};