import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useLayoutStore, DEFAULT_PITCH_MM } from "../store/layoutStore";
import type { KLEKey } from "../store/layoutStore";

const BASE_UNIT_PX = 60;
const INITIAL_SCALE = 0.6;
const STAGE_WIDTH = 2000;
const STAGE_HEIGHT = 1200;
const PADDING = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

interface Bounds {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

const computeBounds = (keys: KLEKey[], unitPx: number): Bounds => {
  if (keys.length === 0) {
    return {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      offsetX: PADDING,
      offsetY: PADDING,
    };
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (const key of keys) {
    const baseX = key.x * unitPx;
    const baseY = key.y * unitPx;
    const width = key.w * unitPx;
    const height = key.h * unitPx;

    const originX = key.rotationCenter.x * unitPx;
    const originY = key.rotationCenter.y * unitPx;
    const angle = (key.rotationAngle * Math.PI) / 180;

    const corners = [
      { x: baseX, y: baseY },
      { x: baseX + width, y: baseY },
      { x: baseX, y: baseY + height },
      { x: baseX + width, y: baseY + height },
    ];

    for (const corner of corners) {
      const dx = corner.x - originX;
      const dy = corner.y - originY;
      const rotatedX = originX + dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotatedY = originY + dx * Math.sin(angle) + dy * Math.cos(angle);

      xs.push(rotatedX);
      ys.push(rotatedY);
    }
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = clamp(maxX - minX + PADDING * 2, 600, STAGE_WIDTH);
  const height = clamp(maxY - minY + PADDING * 2, 400, STAGE_HEIGHT);

  return {
    width,
    height,
    offsetX: -minX + PADDING,
    offsetY: -minY + PADDING,
  };
};

const SNAP_THRESHOLD_PX = 10;

type Point = { x: number; y: number };

const createLabelArray = (key?: Partial<KLEKey>): string[] => {
  const base = Array(9).fill("");
  if (!key) return base;
  if (Array.isArray(key.labels) && key.labels.length > 0) {
    for (let i = 0; i < Math.min(9, key.labels.length); i += 1) {
      base[i] = key.labels[i] ?? "";
    }
  } else if (key.label) {
    base[4] = key.label;
  }
  return base;
};

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

const getCornerPointsPx = (key: KLEKey, unitPx: number): Point[] => {
  const centerX = key.rotationCenter.x * unitPx;
  const centerY = key.rotationCenter.y * unitPx;
  const baseX = key.x * unitPx;
  const baseY = key.y * unitPx;
  const width = key.w * unitPx;
  const height = key.h * unitPx;
  const rad = deg2rad(key.rotationAngle);
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  const corners = [
    { x: baseX, y: baseY },
    { x: baseX + width, y: baseY },
    { x: baseX, y: baseY + height },
    { x: baseX + width, y: baseY + height },
  ];

  return corners.map((corner) => {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });
};

const computeSnapOffset = (movingKey: KLEKey, allKeys: KLEKey[], unitPx: number): Point | null => {
  const movingCorners = getCornerPointsPx(movingKey, unitPx);
  let best: { dx: number; dy: number; distance: number } | null = null;

  for (const other of allKeys) {
    if (other.id === movingKey.id) continue;
    const otherCorners = getCornerPointsPx(other, unitPx);
    for (const movingCorner of movingCorners) {
      for (const targetCorner of otherCorners) {
        const dx = targetCorner.x - movingCorner.x;
        const dy = targetCorner.y - movingCorner.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= SNAP_THRESHOLD_PX) {
          if (!best || distance < best.distance) {
            best = { dx, dy, distance };
          }
        }
      }
    }
  }

  return best ? { x: best.dx, y: best.dy } : null;
};

const getBoundingRect = (key: KLEKey, unitPx: number, offset: Point) => {
  const corners = getCornerPointsPx(key, unitPx);
  const xs = corners.map((c) => c.x + offset.x);
  const ys = corners.map((c) => c.y + offset.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const rectanglesIntersect = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) => {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return !(a.x > bx2 || ax2 < b.x || a.y > by2 || ay2 < b.y);
};

const useArrowKeys = (enabled: boolean, handler: (dx: number, dy: number) => void) => {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      let dx = 0;
      let dy = 0;

      switch (event.key) {
        case "ArrowUp":
          dy = -0.25;
          break;
        case "ArrowDown":
          dy = 0.25;
          break;
        case "ArrowLeft":
          dx = -0.25;
          break;
        case "ArrowRight":
          dx = 0.25;
          break;
        default:
          return;
      }

      event.preventDefault();
      handler(dx, dy);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handler]);
};

export const CanvasEditor: React.FC = () => {
  const {
    keys,
    updateKey,
    toggleSelect,
    selectedKeys,
    clearSelection,
    nudgeSelected,
    selectKey,
    setSelectedKeys,
    unitPitch,
    setUnitPitch,
  } = useLayoutStore();

  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeRect, setMarqueeRect] = useState({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const stageRef = useRef<any>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState({
    labels: Array(9).fill(""),
    x: "",
    y: "",
    rotationAngle: "",
  });
  const [isAnnotationOpen, setAnnotationOpen] = useState(false);
  const [annotationPrefix, setAnnotationPrefix] = useState("SW");
  const [annotationStart, setAnnotationStart] = useState(1);
  const [annotationDigits, setAnnotationDigits] = useState(2);

  const unitPx = useMemo(() => (BASE_UNIT_PX * unitPitch) / DEFAULT_PITCH_MM, [unitPitch]);

  const bounds = useMemo(() => computeBounds(keys as KLEKey[], unitPx), [keys, unitPx]);
  const layerOffset = useMemo(
    () => ({
      x: bounds.offsetX,
      y: bounds.offsetY,
    }),
    [bounds.offsetX, bounds.offsetY]
  );
  const activeKey = useMemo(() => {
    if (selectedKeys.length === 0) return null;
    return keys.find((k) => k.id === selectedKeys[0]) ?? null;
  }, [keys, selectedKeys]);

  const selectedKeyObjects = useMemo(() => {
    const map = new Map(keys.map((k) => [k.id, k]));
    return selectedKeys
      .map((id) => map.get(id))
      .filter((k): k is KLEKey => Boolean(k));
  }, [keys, selectedKeys]);

  const focusLabelInput = () => {
    requestAnimationFrame(() => {
      labelInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (activeKey) {
      setFormState({
        labels: createLabelArray(activeKey),
        x: activeKey.x.toString(),
        y: activeKey.y.toString(),
        rotationAngle: activeKey.rotationAngle.toString(),
      });
    } else {
      setFormState({
        labels: Array(9).fill(""),
        x: "",
        y: "",
        rotationAngle: "",
      });
    }
  }, [
    activeKey?.id,
    activeKey?.x,
    activeKey?.y,
    activeKey?.rotationAngle,
    activeKey?.labels ? activeKey.labels.join("|") : activeKey?.label,
  ]);

  useEffect(() => {
    if (activeKey) {
      focusLabelInput();
    }
  }, [activeKey?.id]);

  useEffect(() => {
    if (isAnnotationOpen && selectedKeyObjects.length === 0) {
      setAnnotationOpen(false);
    }
  }, [isAnnotationOpen, selectedKeyObjects.length]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });

    const newPosition = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPosition);
    stage.batchDraw();
  };

  useArrowKeys(selectedKeys.length > 0, (dx, dy) => {
    nudgeSelected(dx, dy);
  });

  const getStagePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const scale = stage.scaleX();
    return {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };
  }, []);

  const clearMarquee = useCallback(() => {
    setMarqueeStart(null);
    setMarqueeRect({
      visible: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  }, []);

  const handleStageMouseDown = useCallback(
    (evt: KonvaEventObject<MouseEvent>) => {
      if (evt.target !== stageRef.current) {
        return;
      }
      if (!evt.evt.shiftKey) {
        clearSelection();
        return;
      }
      const point = getStagePointerPosition();
      if (!point) return;
      setMarqueeStart(point);
      setMarqueeRect({
        visible: true,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
    },
    [clearSelection, getStagePointerPosition]
  );

  const handleStageMouseMove = useCallback(() => {
    if (!marqueeStart) return;
    const point = getStagePointerPosition();
    if (!point) return;
    setMarqueeRect({
      visible: true,
      x: Math.min(point.x, marqueeStart.x),
      y: Math.min(point.y, marqueeStart.y),
      width: Math.abs(point.x - marqueeStart.x),
      height: Math.abs(point.y - marqueeStart.y),
    });
  }, [getStagePointerPosition, marqueeStart]);

  const handleStageMouseUp = useCallback(() => {
    if (!marqueeStart) return;
    if (marqueeRect.width < 4 && marqueeRect.height < 4) {
      clearMarquee();
      return;
    }
    const selectionRect = {
      x: marqueeRect.x,
      y: marqueeRect.y,
      width: marqueeRect.width,
      height: marqueeRect.height,
    };
    const selectedIds = keys
      .filter((key) => rectanglesIntersect(selectionRect, getBoundingRect(key, unitPx, layerOffset)))
      .map((key) => key.id);
    setSelectedKeys(selectedIds);
    clearMarquee();
  }, [clearMarquee, keys, layerOffset, marqueeRect.height, marqueeRect.width, marqueeRect.x, marqueeRect.y, marqueeStart, setSelectedKeys, unitPx]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #334",
    background: "rgba(15, 23, 42, 0.85)",
    color: "#fff",
    borderRadius: 4,
    fontSize: 14,
  };

  const compactInputStyle: React.CSSProperties = {
    ...inputStyle,
    width: 90,
    padding: "4px 6px",
  };

  const labelWrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    color: "#cde0ff",
    fontSize: 12,
  };

  const handleLegendChange =
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((prev) => {
        const nextLabels = [...prev.labels];
        nextLabels[index] = value;
        return { ...prev, labels: nextLabels };
      });

      if (!activeKey) return;
      const state = useLayoutStore.getState();
      const current = state.keys.find((k) => k.id === activeKey.id);
      if (!current) return;

      const nextLabels = createLabelArray(current);
      nextLabels[index] = value;
      const patch: Partial<KLEKey> = { labels: nextLabels };

      if (index === 4) {
        patch.label = value;
        patch.binding = `&kp ${value || "NO"}`;
      }

      updateKey(activeKey.id, patch);
    };

  const handleNumberChange =
    (field: "x" | "y" | "rotationAngle") => (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: raw }));
      if (!activeKey) return;
      const numeric = parseFloat(raw);
      if (Number.isNaN(numeric)) {
        return;
      }
      const state = useLayoutStore.getState();
      const current = state.keys.find((k) => k.id === activeKey.id);
      if (!current) return;

      if (field === "x") {
        const delta = numeric - current.x;
        updateKey(activeKey.id, {
          x: numeric,
          rotationCenter: {
            x: current.rotationCenter.x + delta,
            y: current.rotationCenter.y,
          },
        });
      } else if (field === "y") {
        const delta = numeric - current.y;
        updateKey(activeKey.id, {
          y: numeric,
          rotationCenter: {
            x: current.rotationCenter.x,
            y: current.rotationCenter.y + delta,
          },
        });
      } else {
        updateKey(activeKey.id, { rotationAngle: numeric });
      }
    };

  const handleInspectorKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Tab" || !activeKey) {
      return;
    }
    event.preventDefault();
    if (keys.length === 0) return;

    const direction = event.shiftKey ? -1 : 1;
    const currentIndex = keys.findIndex((k) => k.id === activeKey.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + keys.length) % keys.length;
    const nextKey = keys[nextIndex];
    selectKey(nextKey.id);
  };

  const handlePitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (Number.isNaN(value) || value <= 0) {
      return;
    }
    setUnitPitch(value);
  };

  const handleDragMove = (evt: KonvaEventObject<DragEvent>, keyId: string) => {
    const node = evt.target;
    const state = useLayoutStore.getState();
    const current = state.keys.find((k) => k.id === keyId);
    if (!current) return;

    let centerX = node.x();
    let centerY = node.y();
    let centerUnitsX = centerX / unitPx;
    let centerUnitsY = centerY / unitPx;

    const deltaX = centerUnitsX - current.rotationCenter.x;
    const deltaY = centerUnitsY - current.rotationCenter.y;
    let newX = current.x + deltaX;
    let newY = current.y + deltaY;

    let draftKey: KLEKey = {
      ...current,
      x: newX,
      y: newY,
      rotationCenter: { x: centerUnitsX, y: centerUnitsY },
    };

    const snapOffset = computeSnapOffset(draftKey, state.keys as KLEKey[], unitPx);
    if (snapOffset) {
      centerX += snapOffset.x;
      centerY += snapOffset.y;
      node.position({ x: centerX, y: centerY });
      centerUnitsX = centerX / unitPx;
      centerUnitsY = centerY / unitPx;

      const snapDeltaX = centerUnitsX - current.rotationCenter.x;
      const snapDeltaY = centerUnitsY - current.rotationCenter.y;

      newX = current.x + snapDeltaX;
      newY = current.y + snapDeltaY;

      draftKey = {
        ...draftKey,
        x: newX,
        y: newY,
        rotationCenter: { x: centerUnitsX, y: centerUnitsY },
      };
    }

    updateKey(keyId, {
      x: draftKey.x,
      y: draftKey.y,
      rotationCenter: draftKey.rotationCenter,
    });
  };

  const handleDragEnd = (evt: KonvaEventObject<DragEvent>, keyId: string) => {
    handleDragMove(evt, keyId);
  };

  const buttonStyle: React.CSSProperties = {
    background: "#1e293b",
    color: "#cde0ff",
    border: "1px solid #334",
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 42, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  };

  const modalStyle: React.CSSProperties = {
    background: "#0b1220",
    border: "1px solid #334",
    borderRadius: 8,
    padding: 20,
    minWidth: 320,
    maxWidth: 420,
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
  };

  const modalButtonRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  };

  const handleOpenAnnotation = () => {
    if (selectedKeyObjects.length < 2) return;
    const count = selectedKeyObjects.length;
    const maxNumber = annotationStart + Math.max(0, count - 1);
    const requiredDigits = Math.max(2, String(maxNumber).length);
    setAnnotationDigits(requiredDigits);
    setAnnotationOpen(true);
  };

  const applyAnnotation = () => {
    if (selectedKeyObjects.length === 0) return;
    const sorted = [...selectedKeyObjects].sort((a, b) => a.x - b.x || a.y - b.y);
    sorted.forEach((key, index) => {
      const labelValue = `${annotationPrefix}${String(annotationStart + index).padStart(annotationDigits, "0")}`;
      const labels = createLabelArray(key);
      labels[0] = labelValue;
      updateKey(key.id, { labels });
    });
  };

  const handleAnnotationSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyAnnotation();
    setAnnotationOpen(false);
  };

  const closeAnnotation = () => setAnnotationOpen(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
      }}
    >
      <div style={{ flex: "1 1 auto", overflow: "auto" }}>
        <Stage
          ref={stageRef}
          width={bounds.width}
          height={bounds.height}
          scaleX={INITIAL_SCALE}
          scaleY={INITIAL_SCALE}
          draggable={marqueeStart === null}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
        >
          <Layer x={bounds.offsetX} y={bounds.offsetY}>
            {keys.map((key) => {
              const isSelected = selectedKeys.includes(key.id);
              const groupX = key.rotationCenter.x * unitPx;
              const groupY = key.rotationCenter.y * unitPx;
              const rectX = (key.x - key.rotationCenter.x) * unitPx;
              const rectY = (key.y - key.rotationCenter.y) * unitPx;
              const legends = createLabelArray(key);
              const padding = 6;
              const textWidth = key.w * unitPx - padding * 2;
              const fontSize = 14;
              const verticalPositions = [
                rectY + padding,
                rectY + (key.h * unitPx) / 2 - fontSize / 2,
                rectY + key.h * unitPx - padding - fontSize,
              ];
              const alignments: ("left" | "center" | "right")[] = ["left", "center", "right"];

              return (
                <Group
                  key={key.id}
                  x={groupX}
                  y={groupY}
                  rotation={key.rotationAngle}
                  draggable
                  onMouseDown={(evt: KonvaEventObject<MouseEvent>) => {
                    if (evt.evt.detail !== 1) {
                      evt.cancelBubble = true;
                      return;
                    }
                    evt.cancelBubble = true;
                    toggleSelect(key.id);
                  }}
                  onTap={(evt) => {
                    evt.cancelBubble = true;
                    toggleSelect(key.id);
                  }}
                  onDragStart={(evt) => {
                    evt.cancelBubble = true;
                    selectKey(key.id);
                  }}
                  onDragMove={(evt) => handleDragMove(evt, key.id)}
                  onDragEnd={(evt) => handleDragEnd(evt, key.id)}
                >
                  <Rect
                    x={rectX}
                    y={rectY}
                    width={key.w * unitPx}
                    height={key.h * unitPx}
                    cornerRadius={4}
                    fill={isSelected ? "#345a9a" : "#1e2a4a"}
                    stroke={isSelected ? "#9cf" : "#666"}
                    strokeWidth={1.5}
                    onDblClick={(evt: KonvaEventObject<MouseEvent>) => {
                      evt.cancelBubble = true;
                      selectKey(key.id);
                      focusLabelInput();
                    }}
                  />
                  {legends.map((legend, legendIndex) => {
                    if (!legend) return null;
                    const row = Math.floor(legendIndex / 3);
                    const col = legendIndex % 3;
                    return (
                      <Text
                        key={`${key.id}-legend-${legendIndex}`}
                        text={legend}
                        x={rectX + padding}
                        y={verticalPositions[row]}
                        width={textWidth}
                        fontSize={fontSize}
                        fill="#cde0ff"
                        align={alignments[col]}
                        listening={false}
                      />
                    );
                  })}
                </Group>
              );
            })}
            {marqueeRect.visible && (
              <Rect
                listening={false}
                x={marqueeRect.x - bounds.offsetX}
                y={marqueeRect.y - bounds.offsetY}
                width={marqueeRect.width}
                height={marqueeRect.height}
                stroke="#7dd3fc"
                strokeWidth={1}
                dash={[4, 4]}
                fill="rgba(125, 211, 252, 0.12)"
              />
            )}
          </Layer>
        </Stage>
      </div>
      <div
        style={{
          borderTop: "1px solid #223",
          background: "#0f172a",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 16 }}>
          <strong style={{ color: "#cde0ff" }}>Inspector</strong>
          <label
            style={{
              color: "#94a3b8",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Pitch (mm)
            <input
              type="number"
              step="0.1"
              min="10"
              value={unitPitch}
              onChange={handlePitchChange}
              style={compactInputStyle}
            />
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleOpenAnnotation}
              disabled={selectedKeys.length < 2}
              style={{
                ...buttonStyle,
                opacity: selectedKeys.length < 2 ? 0.4 : 1,
                cursor: selectedKeys.length < 2 ? "not-allowed" : "pointer",
              }}
            >
              Annotate
            </button>
          </div>
        </div>
        {activeKey ? (
          <form
            onKeyDown={handleInspectorKeyDown}
            onSubmit={(event) => event.preventDefault()}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {["Top Left", "Top", "Top Right", "Left", "Center", "Right", "Bottom Left", "Bottom", "Bottom Right"].map(
                (title, index) => (
                  <label key={title} style={labelWrapperStyle}>
                    <span>{title}</span>
                    <input
                      ref={index === 4 ? labelInputRef : undefined}
                      type="text"
                      value={formState.labels[index] ?? ""}
                      onChange={handleLegendChange(index)}
                      style={inputStyle}
                    />
                  </label>
                )
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <label style={labelWrapperStyle}>
                <span>X (units)</span>
                <input
                  type="number"
                  step="0.25"
                  value={formState.x}
                  onChange={handleNumberChange("x")}
                  style={inputStyle}
                />
              </label>
              <label style={labelWrapperStyle}>
                <span>Y (units)</span>
                <input
                  type="number"
                  step="0.25"
                  value={formState.y}
                  onChange={handleNumberChange("y")}
                  style={inputStyle}
                />
              </label>
              <label style={labelWrapperStyle}>
                <span>Rotation (°)</span>
                <input
                  type="number"
                  step="1"
                  value={formState.rotationAngle}
                  onChange={handleNumberChange("rotationAngle")}
                  style={inputStyle}
                />
              </label>
            </div>
          </form>
        ) : (
          <span style={{ color: "#94a3b8" }}>キーを選択してください。</span>
        )}
      </div>
      {isAnnotationOpen && (
        <div style={overlayStyle} onClick={closeAnnotation}>
          <form
            style={modalStyle}
            onSubmit={handleAnnotationSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ color: "#cde0ff", margin: "0 0 12px" }}>Annotate Keys</h3>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
              {selectedKeyObjects.length} keys will be annotated from the top-left label.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={labelWrapperStyle}>
                <span>Prefix</span>
                <input
                  type="text"
                  value={annotationPrefix}
                  onChange={(e) => setAnnotationPrefix(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={labelWrapperStyle}>
                <span>Start Number</span>
                <input
                  type="number"
                  min={0}
                  value={annotationStart}
                  onChange={(e) => setAnnotationStart(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={inputStyle}
                />
              </label>
              <label style={labelWrapperStyle}>
                <span>Digits</span>
                <input
                  type="number"
                  min={1}
                  value={annotationDigits}
                  onChange={(e) => setAnnotationDigits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={modalButtonRowStyle}>
              <button
                type="button"
                style={{ ...buttonStyle, background: "transparent" }}
                onClick={closeAnnotation}
              >
                Cancel
              </button>
              <button type="submit" style={buttonStyle}>
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
