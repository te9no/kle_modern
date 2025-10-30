import React, { useMemo, useState } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { exportZMK, exportQMK, generateZmkKeyLines } from "../utils/exportZMK";

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "#0b1220",
  borderLeft: "1px solid #223",
  height: "100%",
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #1a2236",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 12px",
  cursor: "pointer",
  color: active ? "#e2ecff" : "#7c8cb0",
  background: active ? "#121b2f" : "transparent",
  borderBottom: active ? "2px solid #7dd3fc" : "2px solid transparent",
  textAlign: "center",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
});

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 12,
  justifyContent: "space-between",
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
  whiteSpace: "pre",
  fontFamily: "monospace",
  fontSize: 12,
  color: "#e2ecff",
  flex: 1,
  overflow: "auto",
};

const codeStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const lineStyle: React.CSSProperties = {
  display: "block",
  padding: "0 6px",
};

const highlightLineStyle: React.CSSProperties = {
  ...lineStyle,
  background: "rgba(125, 211, 252, 0.16)",
  borderRadius: 4,
};

const placeholderStyle: React.CSSProperties = {
  color: "#5f6f94",
  fontStyle: "italic",
};

const keySummaryStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
};

const keyBadgeStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 6px",
  borderRadius: 4,
  border: active ? "1px solid #7dd3fc" : "1px solid #2d3a55",
  color: active ? "#7dd3fc" : "#9ca5c1",
  background: active ? "rgba(125, 211, 252, 0.12)" : "transparent",
  fontFamily: "monospace",
  fontSize: 11,
});

const keyLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
};

type TabKey = "zmk" | "qmk";

export const ExportPreview: React.FC = () => {
  const { keys, unitPitch, selectedKeys } = useLayoutStore();
  const [activeTab, setActiveTab] = useState<TabKey>("zmk");

  const preview = useMemo(() => {
    if (!keys.length) {
      return {
        zmkText: "",
        qmkText: "",
        zmkLines: [] as string[],
        qmkValues: [] as string[],
        activeKey: null as null | Parameters<typeof useLayoutStore.getState>["keys"][number],
      };
    }

    const zmkLines = generateZmkKeyLines(keys, unitPitch);
    const zmkText = exportZMK(keys, unitPitch);
    const qmkObject = exportQMK(keys);
    const qmkText = JSON.stringify(qmkObject, null, 2);

    let activeKey: Parameters<typeof useLayoutStore.getState>["keys"][number] | null = null;
    if (selectedKeys.length > 0) {
      activeKey = keys.find((k) => k.id === selectedKeys[0]) ?? null;
    }

    return {
      zmkText,
      qmkText,
      zmkLines,
      qmkValues: qmkObject.keymap,
      activeKey,
    };
  }, [keys, unitPitch, selectedKeys]);

  const selectedIndex = useMemo(
    () => (selectedKeys.length ? keys.findIndex((k) => k.id === selectedKeys[0]) : -1),
    [keys, selectedKeys]
  );

  const getHighlightedIndices = (text: string, search: string, occurrence: number) => {
    const lines = text.split("\n");
    let count = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(search)) {
        if (count === occurrence) {
          return new Set([i]);
        }
        count += 1;
      }
    }
    return new Set<number>();
  };

  const renderHighlightedPre = (text: string, highlightSet: Set<number>) => {
    if (!text) {
      return <span style={placeholderStyle}>レイアウトを読み込むと表示されます。</span>;
    }
    const lines = text.split("\n");
    return (
      <pre style={preStyle}>
        <code style={codeStyle}>
          {lines.map((line, index) => (
            <span key={index} style={highlightSet.has(index) ? highlightLineStyle : lineStyle}>
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    );
  };

  const zmkHighlight = useMemo(() => {
    if (selectedIndex < 0) return new Set<number>();
    const line = preview.zmkLines[selectedIndex];
    if (!line) return new Set<number>();
    return getHighlightedIndices(preview.zmkText, line.trim(), selectedIndex);
  }, [preview.zmkLines, preview.zmkText, selectedIndex]);

  const qmkHighlight = useMemo(() => {
    if (selectedIndex < 0) return new Set<number>();
    const value = preview.qmkValues[selectedIndex];
    if (value === undefined) return new Set<number>();
    const pattern = `"${value}"`;
    return getHighlightedIndices(preview.qmkText, pattern, selectedIndex);
  }, [preview.qmkText, preview.qmkValues, selectedIndex]);

  return (
    <div style={panelStyle}>
      <div style={tabBarStyle}>
        <button type="button" style={tabStyle(activeTab === "zmk")} onClick={() => setActiveTab("zmk")}>
          Physical Layout
        </button>
        <button type="button" style={tabStyle(activeTab === "qmk")} onClick={() => setActiveTab("qmk")}>
          QMK JSON
        </button>
      </div>
      <div style={contentStyle}>
        <div style={headerRowStyle}>
          <h3 style={headingStyle}>{activeTab === "zmk" ? "Physical Layout (Devicetree)" : "QMK JSON"}</h3>
          <div style={keySummaryStyle}>
            <span style={keyLabelStyle}>Selected</span>
            <span style={keyBadgeStyle(!!preview.activeKey)}>
              {preview.activeKey ? preview.activeKey.labels?.[4] || preview.activeKey.label || "UNLABELED" : "--"}
            </span>
            {preview.activeKey && (
              <span style={keyLabelStyle}>
                ({preview.activeKey.x.toFixed(2)}, {preview.activeKey.y.toFixed(2)}) / rot{" "}
                {preview.activeKey.rotationAngle.toFixed(1)}°
              </span>
            )}
          </div>
        </div>
        {activeTab === "zmk"
          ? renderHighlightedPre(preview.zmkText, zmkHighlight)
          : renderHighlightedPre(preview.qmkText, qmkHighlight)}
      </div>
    </div>
  );
};
