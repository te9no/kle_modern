import React, { useCallback } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { importKLE } from "../utils/importKLE";
import { importZMKKeymap } from "../utils/importZMKKeymap";
import { exportZMK, exportQMK } from "../utils/exportZMK";

export const Toolbar: React.FC = () => {
  const { setKeys, rotateSelected, keys, unitPitch, viewMode, setViewMode } = useLayoutStore();

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith(".json")) {
          const parsed = importKLE(JSON.parse(text));
          setKeys(parsed);
          return;
        }
        const zmk = importZMKKeymap(text);
        setKeys(zmk.keys);
      } catch (error) {
        console.error(error);
        alert("Failed to import layout. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const onImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importFile(file);
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    importFile(file);
  }, []);

  const download = (name: string, data: string, type: string) => {
    const blob = new Blob([data], { type });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
  };

  return (
    <div
      style={{ display: "flex", gap: 10, padding: 10, borderBottom: "1px solid #223" }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <input type="file" accept=".json,.keymap,.dtsi,.dts" onChange={onImport} />
      <button onClick={() => rotateSelected(15)}>Rotate +15°</button>
      <button onClick={() => download("layout.keymap", exportZMK(keys, unitPitch), "text/plain")}>
        Export ZMK
      </button>
      <button
        onClick={() =>
          download("layout_qmk.json", JSON.stringify(exportQMK(keys), null, 2), "application/json")
        }
      >
        Export QMK
      </button>
      <button onClick={() => setViewMode(viewMode === "canvas" ? "node" : "canvas")}>
        {viewMode === "canvas" ? "Show Node Editor" : "Show Canvas Editor"}
      </button>
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        💡 KLE JSONやZMK keymapをドラッグ＆ドロップでインポートできます。
      </span>
    </div>
  );
};
