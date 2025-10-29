import React, { useState } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { useLayoutStore } from "../store/layoutStore";

export const CanvasEditor: React.FC = () => {
  const { keys, updateKey, toggleSelect, selectedKeys } = useLayoutStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState("");

  return (
    <Stage width={900} height={500}>
      <Layer>
        {keys.map((k) => (
          <Group
            key={k.id}
            x={k.rotationCenter.x * 60}
            y={k.rotationCenter.y * 60}
            rotation={k.rotationAngle}
            onClick={(e) => {
              e.evt.stopPropagation();
              toggleSelect(k.id);
            }}
          >
            <Rect
              x={(k.x - k.rotationCenter.x) * 60}
              y={(k.y - k.rotationCenter.y) * 60}
              width={k.w * 60}
              height={k.h * 60}
              cornerRadius={4}
              fill={selectedKeys.includes(k.id) ? "#25436b" : "#1e2a4a"}
              stroke={selectedKeys.includes(k.id) ? "#9cf" : "#666"}
              strokeWidth={1.5}
              onDblClick={() => {
                setEditingId(k.id);
                setTempText(k.label || "");
              }}
            />
            <Text
              text={k.label ?? ""}
              x={(k.x - k.rotationCenter.x) * 60 + 5}
              y={(k.y - k.rotationCenter.y) * 60 + 20}
              fontSize={16}
              fill="#cde0ff"
            />
          </Group>
        ))}
      </Layer>
      {editingId && (
        <foreignObject
          x={400}
          y={440}
          width={200}
          height={30}
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <input
            autoFocus
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onBlur={() => {
              updateKey(editingId, { label: tempText, binding: `&kp ${tempText}` });
              setEditingId(null);
            }}
            style={{
              width: "100%",
              color: "#fff",
              background: "transparent",
              border: "1px solid #999",
            }}
          />
        </foreignObject>
      )}
    </Stage>
  );
};