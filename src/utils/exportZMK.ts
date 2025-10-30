import type { KLEKey } from "./importKLE";
import { DEFAULT_PITCH_MM } from "../store/layoutStore";

const padPositive = (value: number, width: number) => {
  const str = value.toString();
  if (str.length >= width) {
    return str;
  }
  return `${" ".repeat(width - str.length)}${str}`;
};

const formatDimension = (value: number, pitchRatio: number, width: number) => {
  const scaled = Math.round(value * 100 * pitchRatio);
  if (scaled < 0) {
    const formatted = `(-${Math.abs(scaled)})`;
    return formatted.padStart(Math.max(width, formatted.length), " ");
  }
  return padPositive(scaled, width);
};

const formatAngle = (value: number, width: number) => {
  const scaled = Math.round(value * 100);
  if (scaled < 0) {
    const formatted = `(-${Math.abs(scaled)})`;
    return formatted.padStart(Math.max(width, formatted.length), " ");
  }
  return padPositive(scaled, width);
};

export function exportZMK(keys: KLEKey[], pitchMm: number = DEFAULT_PITCH_MM): string {
  const pitchRatio = pitchMm / DEFAULT_PITCH_MM;
  const keyLines = keys.map((k) => {
    const w = formatDimension(k.w, pitchRatio, 3);
    const h = formatDimension(k.h, pitchRatio, 3);
    const x = formatDimension(k.x, pitchRatio, 4);
    const y = formatDimension(k.y, pitchRatio, 4);
    const rot = formatAngle(k.rotationAngle, 7);
    const rx = formatDimension(k.rotationCenter.x, pitchRatio, 5);
    const ry = formatDimension(k.rotationCenter.y, pitchRatio, 5);
    return `<&key_physical_attrs ${w} ${h} ${x} ${y} ${rot} ${rx} ${ry}>`;
  });

  const formattedKeys =
    keyLines.length > 0
      ? keyLines
          .map((line, index) => (index === 0 ? line : `, ${line}`))
          .join("\n            ")
      : "";

  return [
    "#include <dt-bindings/zmk/matrix_transform.h>",
    "#include <physical_layouts.dtsi>",
    "",
    "/ {",
    "    imported_layout: imported_layout {",
    '        compatible = "zmk,physical-layout";',
    '        display-name = "Imported Layout";',
    "        keys  //                     w   h    x    y     rot    rx    ry",
    "            = <",
    formattedKeys ? `            ${formattedKeys}` : "            ",
    "            >;",
    "    };",
    "};",
  ].join("\n");
}

export function exportQMK(keys: KLEKey[]): any {
  return {
    layout: "CUSTOM",
    keymap: keys.map((k) => (k.labels?.[4] || k.label || "KC_NO") || "KC_NO"),
  };
}
