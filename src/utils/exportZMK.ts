import type { KLEKey } from "./importKLE";

export function exportZMK(keys: KLEKey[]): string {
  const bindings = keys.map(k => k.binding || `&kp ${k.label || "NO"}`).join(" ");
  return `
/ {
  keymap {
    compatible = "zmk,keymap";
    default_layer {
      bindings = <
        ${bindings}
      >;
    };
  };
};
`.trim();
}

export function exportQMK(keys: KLEKey[]): any {
  return {
    layout: "CUSTOM",
    keymap: keys.map(k => k.label || "KC_NO"),
  };
}