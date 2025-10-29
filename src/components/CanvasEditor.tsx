import React, { useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Text } from "react-konva";
import { useLayoutStore } from "../store/layoutStore";

const UNIT = 60;
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

const computeBounds = (keys: ReturnType<typeof useLayoutStore>["keys"]): Bounds => {
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
    const baseX = key.x * UNIT;
    const baseY = key.y * UNIT;
    const width = key.w * UNIT;
    const height = key.h * UNIT;

    const originX = key.rotationCenter.x * UNIT;
    const originY = key.rotationCenter.y * UNIT;
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

export const CanvasEditor: React.FC = () => {
  const { keys, updateKey, toggleSelect, selectedKeys, clearSelection } = useLayoutStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState("");
  const stageRef = useRef<any>(null);

  const bounds = useMemo(() => computeBounds(keys), [keys]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

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

  return (
    <Stage
      ref={stageRef}
      width={bounds.width}
      height={bounds.height}
      scaleX={INITIAL_SCALE}
      scaleY={INITIAL_SCALE}
      draggable
      onWheel={handleWheel}
      onMouseDown={() => clearSelection()}
    >
      <Layer x={bounds.offsetX} y={bounds.offsetY}>
        {keys.map((key) => {
          const isSelected = selectedKeys.includes(key.id);
          const groupX = key.rotationCenter.x * UNIT;
          const groupY = key.rotationCenter.y * UNIT;
          const rectX = (key.x - key.rotationCenter.x) * UNIT;
          const rectY = (key.y - key.rotationCenter.y) * UNIT;

          return (
            <Group
              key={key.id}
              x={groupX}
              y={groupY}
              rotation={key.rotationAngle}
              onMouseDown={(evt) => {
                evt.cancelBubble = true;
                toggleSelect(key.id);
              }}
            >
              <Rect
                x={rectX}
                y={rectY}
                width={key.w * UNIT}
                height={key.h * UNIT}
                cornerRadius={4}
                fill={isSelected ? "#345a9a" : "#1e2a4a"}
                stroke={isSelected ? "#9cf" : "#666"}
                strokeWidth={1.5}
                onDblClick={() => {
                  setEditingId(key.id);
                  setTempLabel(key.label || "");
                }}
              />
              <Text
                text={key.label ?? ""}
                x={rectX + 10}
                y={rectY + key.h * UNIT * 0.5 - 8}
                fontSize={16}
                fill="#cde0ff"
              />
            </Group>
          );
        })}
      </Layer>
      {editingId && (
        <foreignObject x={20} y={20} width={260} height={40}>
          <input
            autoFocus
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateKey(editingId, {
                  label: tempLabel,
                  binding: `&kp ${tempLabel}`,
                });
                setEditingId(null);
              }
              if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            onBlur={() => {
              updateKey(editingId, {
                label: tempLabel,
                binding: `&kp ${tempLabel}`,
              });
              setEditingId(null);
            }}
            style={{
              width: "100%",
              color: "#fff",
              background: "rgba(0,0,0,0.7)",
              border: "1px solid #999",
              padding: "6px 8px",
            }}
          />
        </foreignObject>
      )}
    </Stage>
  );
};
