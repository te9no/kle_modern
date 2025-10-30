import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLayoutStore, DEFAULT_PITCH_MM } from "../store/layoutStore";

const BASE_UNIT_PX = 60;

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  height: "100%",
  width: "100%",
  background: "repeating-linear-gradient(0deg, #111a2e, #111a2e 30px, #0d1422 30px, #0d1422 60px)",
  overflow: "hidden",
};

const svgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
};

const nodeBaseStyle: React.CSSProperties = {
  position: "absolute",
  minWidth: 120,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1f2a3f",
  background: "rgba(17, 26, 46, 0.9)",
  color: "#e2ecff",
  boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
  cursor: "grab",
  userSelect: "none",
  transform: "translate(-50%, -50%)",
};

const nodeSelectedStyle: React.CSSProperties = {
  ...nodeBaseStyle,
  border: "1px solid #7dd3fc",
  boxShadow: "0 0 0 2px rgba(125, 211, 252, 0.2)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 4,
};

const metaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#8ea0c4",
};

export const NodeEditor: React.FC = () => {
  const { keys, selectedKeys, selectKey, clearSelection, updateKey, unitPitch } = useLayoutStore();
  const unitPx = useMemo(() => (BASE_UNIT_PX * unitPitch) / DEFAULT_PITCH_MM, [unitPitch]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);

  const nodes = useMemo(
    () =>
      keys.map((key) => ({
        id: key.id,
        x: key.rotationCenter.x * unitPx,
        y: key.rotationCenter.y * unitPx,
        label: key.labels?.[4] || key.label || "NO",
        width: key.w * unitPx,
        height: key.h * unitPx,
        keyRef: key,
        selected: selectedKeys.includes(key.id),
      })),
    [keys, selectedKeys, unitPx]
  );

  const edges = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    const result: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      result.push({
        from: { x: current.x, y: current.y },
        to: { x: next.x, y: next.y },
      });
    }
    return result;
  }, [nodes]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      selectKey(nodeId);
      setDragging({
        id: nodeId,
        offsetX: event.clientX - node.x,
        offsetY: event.clientY - node.y,
      });
    },
    [nodes, selectKey]
  );

  useEffect(() => {
    if (!dragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const xPx = event.clientX - dragging.offsetX;
      const yPx = event.clientY - dragging.offsetY;
      const centerX = xPx / unitPx;
      const centerY = yPx / unitPx;
      const key = keys.find((k) => k.id === dragging.id);
      if (!key) return;
      const deltaX = centerX - key.rotationCenter.x;
      const deltaY = centerY - key.rotationCenter.y;
      updateKey(dragging.id, {
        x: key.x + deltaX,
        y: key.y + deltaY,
        rotationCenter: {
          x: centerX,
          y: centerY,
        },
      });
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, keys, unitPx, updateKey]);

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === containerRef.current) {
      clearSelection();
    }
  };

  return (
    <div ref={containerRef} style={containerStyle} onClick={handleBackgroundClick}>
      <svg style={svgStyle}>
        {edges.map((edge, index) => (
          <line
            key={`edge-${index}`}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            stroke="#1f334d"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}
      </svg>
      {nodes.map((node) => (
        <div
          key={node.id}
          onPointerDown={(event) => handlePointerDown(event, node.id)}
          style={{
            ...(node.selected ? nodeSelectedStyle : nodeBaseStyle),
            left: node.x,
            top: node.y,
          }}
        >
          <div style={labelStyle}>{node.label}</div>
          <div style={metaStyle}>
            x: {node.keyRef.x.toFixed(2)} / y: {node.keyRef.y.toFixed(2)} / rot {node.keyRef.rotationAngle.toFixed(1)}°
          </div>
        </div>
      ))}
    </div>
  );
};
