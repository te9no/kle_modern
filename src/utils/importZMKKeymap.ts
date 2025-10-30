import type { KLEKey } from "./importKLE";

const parseNumber = (raw: string): number => {
  const cleaned = raw.replace(/[()]/g, "");
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric value: ${raw}`);
  }
  return value / 100;
};

const parseLines = (text: string, regex: RegExp): RegExpMatchArray[] => {
  const matches: RegExpMatchArray[] = [];
  let match: RegExpMatchArray | null;
  const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  while ((match = globalRegex.exec(text)) !== null) {
    matches.push(match);
  }
  return matches;
};

const parseBindings = (text: string): string[] => {
  const bindingsMatch = text.match(/bindings\s*=\s*<([^>]+)>/s);
  if (!bindingsMatch) return [];
  const tokens = bindingsMatch[1]
    .replace(/[\n\r\t]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[>;]+$/g, ""));

  const bindings: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("&")) continue;
    let binding = token;
    while (i + 1 < tokens.length && !tokens[i + 1].startsWith("&")) {
      binding += ` ${tokens[i + 1]}`;
      i += 1;
    }
    bindings.push(binding.trim());
  }

  return bindings;
};

const bindingToLabel = (binding?: string) => {
  if (!binding) return "";
  const kpMatch = binding.match(/&kp\s+(\S+)/);
  if (kpMatch) return kpMatch[1];
  return binding;
};

export const importZMKKeymap = (text: string): { keys: KLEKey[] } => {
  const keyLines = parseLines(text, /<&key_physical_attrs([^>]+)>/g);
  if (!keyLines.length) {
    throw new Error("ZMK physical layout not found");
  }

  const bindings = parseBindings(text);

  const keys: KLEKey[] = keyLines.map((match, index) => {
    const parts = match[1]
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length < 7) {
      throw new Error(`Invalid key definition: ${match[0]}`);
    }

    const [w, h, x, y, rotation, rx, ry] = parts.map(parseNumber);
    const binding = bindings[index]?.trim();
    const label = bindingToLabel(binding);

    return {
      id: crypto.randomUUID(),
      x,
      y,
      w,
      h,
      rotationAngle: rotation,
      rotationCenter: { x: rx, y: ry },
      labels: [
        "",
        "",
        "",
        "",
        label,
        "",
        "",
        "",
        "",
      ],
      label,
      binding,
    };
  });

  return { keys };
};
