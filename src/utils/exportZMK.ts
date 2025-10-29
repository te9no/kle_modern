import type { KLEKey } from './importKLE';
export function exportZMK(keys:KLEKey[]):string{
  const bindings=keys.map(k=>k.binding||`&kp ${k.label||'NO'}`).join(' ');
  const cols=Math.ceil(Math.sqrt(keys.length));const rows=Math.ceil(keys.length/cols);
  return `/ { keymap { compatible="zmk,keymap"; default_layer { bindings=<${bindings}>; }; }; position_map { compatible="zmk,position-map"; cols=<${cols}>; rows=<${rows}>; }; };`;
}
export function exportQMK(keys:KLEKey[]):any{
  return { layout:'CUSTOM', keymap:keys.map(k=>k.label||'KC_NO') };
}
