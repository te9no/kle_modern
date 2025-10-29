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
    return `(${scaled})`;
  }
  return padPositive(scaled, width);
};

export function exportZMK(keys: KLEKey[]): string {
  const bindings = keys.map((k) => k.binding || `&kp ${k.label || "NO"}`).join(" ");

  const keyLines = keys
    .map((k) => {
      const w = formatField(k.w, 3);
      const h = formatField(k.h, 3);
      const x = formatField(k.x, 4);
      const y = formatField(k.y, 4);
      const rot = formatField(k.rotationAngle, 7);
      const rx = formatField(k.rotationCenter.x, 5);
      const ry = formatField(k.rotationCenter.y, 5);
      return `<&key_physical_attrs ${w} ${h} ${x} ${y} ${rot} ${rx} ${ry}>`;
    })
    .join("\n            , ");

  const positions = keys.map((_, index) => index).join(" ");

  return [
    "#include <dt-bindings/zmk/matrix_transform.h>",
    "#include <physical_layouts.dtsi>",
    "",
    "/ {",
    "    keymap {",
    '        compatible = "zmk,keymap";',
    "        default_layer {",
    `            bindings = <${bindings}>;`,
    "        };",
    "        physical_layout = <&imported_layout>;",
    "    };",
    "",
    "    imported_layout: imported_layout {",
    '        compatible = "zmk,physical-layout";',
    '        display-name = "Imported Layout";',
    "        keys  //                     w   h    x    y     rot    rx    ry",
    "            = <",
    `            ${keyLines}`,
    "            >;",
    "    };",
    "",
    "    position_map {",
    '        compatible = "zmk,physical-layout-position-map";',
    "        map_0: map_0 {",
    "            physical-layout = <&imported_layout>;",
    `            positions = <${positions}>;`,
    "        };",
    "    };",
    "};",
  ].join("\n");
}

export function exportQMK(keys: KLEKey[]): any {
  return { layout: "CUSTOM", keymap: keys.map((k) => k.label || "KC_NO") };
}
