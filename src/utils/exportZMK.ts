import type { KLEKey } from "./importKLE";

const scale = (value: number) => Math.round(value * 100);

const padPositive = (value: number, width: number) => {
  const str = value.toString();
  if (str.length >= width) {
    return str;
  }
  return `${" ".repeat(width - str.length)}${str}`;
};

const formatField = (value: number, width: number) => {
  const scaled = scale(value);
  if (scaled < 0) {
    const formatted = `(-${Math.abs(scaled)})`;
    return formatted.padStart(Math.max(width, formatted.length), " ");
  }
  return padPositive(scaled, width);
};

export function exportZMK(keys: KLEKey[]): string {
  const keyLines = keys.map((k) => {
    const w = formatField(k.w, 3);
    const h = formatField(k.h, 3);
    const x = formatField(k.x, 4);
    const y = formatField(k.y, 4);
    const rot = formatField(k.rotationAngle, 7);
    const rx = formatField(k.rotationCenter.x, 5);
    const ry = formatField(k.rotationCenter.y, 5);
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
