import React, { useMemo, useState } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { exportZMK, exportQMK } from "../utils/exportZMK";

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
  whiteSpace: "pre-wrap",
  fontFamily: "monospace",
  fontSize: 12,
  color: "#e2ecff",
  flex: 1,
  overflow: "auto",
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

  const { zmk, qmk, activeKey } = useMemo(() => {
    if (!keys.length) {
      return { zmk: "", qmk: "", activeKey: null as null | Parameters<typeof useLayoutStore.getState>["keys"][number] };
    }
    const preview = {
      zmk: exportZMK(keys, unitPitch),
      qmk: JSON.stringify(exportQMK(keys), null, 2),
      activeKey: null as null | Parameters<typeof useLayoutStore.getState>["keys"][number],
    };
    if (selectedKeys.length > 0) {
      preview.activeKey = keys.find((k) => k.id === selectedKeys[0]) ?? null;
    }
    return preview;
  }, [keys, unitPitch, selectedKeys]);

  const renderContent = () => {
    if (activeTab === "zmk") {
      return zmk ? (
        <pre style={preStyle}>{zmk}</pre>
      ) : (
        <span style={placeholderStyle}>レイアウトを読み込むと表示されます。</span>
      );
    }

    return qmk ? (
      <pre style={preStyle}>{qmk}</pre>
    ) : (
      <span style={placeholderStyle}>レイアウトを読み込むと表示されます。</span>
    );
  };

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
            <span style={keyBadgeStyle(!!activeKey)}>
              {activeKey ? activeKey.labels?.[4] || activeKey.label || "UNLABELED" : "--"}
            </span>
            {activeKey && (
              <span style={keyLabelStyle}>
                ({activeKey.x.toFixed(2)}, {activeKey.y.toFixed(2)}) / rot {activeKey.rotationAngle.toFixed(1)}°
              </span>
            )}
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
