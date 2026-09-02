interface GroupState {
  hasRepeat: boolean;
  hasAlternation: boolean;
}

function quantifierAt(pattern: string, index: number): { repeated: boolean; end: number } | null {
  const ch = pattern[index];
  if (ch === '*' || ch === '+') return { repeated: true, end: index };
  if (ch === '?') return { repeated: false, end: index };
  if (ch !== '{') return null;
  const match = /^\{(\d+)(?:,(\d*)?)?\}/.exec(pattern.slice(index));
  if (!match) return null;
  const min = Number(match[1]);
  const hasComma = match[0].includes(',');
  const maxText = match[2];
  const max = hasComma ? (maxText === '' || maxText === undefined ? Number.POSITIVE_INFINITY : Number(maxText)) : min;
  return { repeated: max > 1, end: index + match[0].length - 1 };
}

export function isSafeRegexPattern(pattern: string): boolean {
  if (pattern.length === 0 || pattern.length > 256) return false;
  const stack: GroupState[] = [{ hasRepeat: false, hasAlternation: false }];
  let inClass = false;

  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '\\') {
      const next = pattern[i + 1];
      if (next && /[1-9]/.test(next)) return false;
      i += 1;
      continue;
    }
    if (ch === '[') { inClass = true; continue; }
    if (ch === ']' && inClass) { inClass = false; continue; }
    if (inClass) continue;

    if (ch === '(') {
      if (pattern[i + 1] === '?' && pattern.slice(i, i + 3) !== '(?:') return false;
      stack.push({ hasRepeat: false, hasAlternation: false });
      continue;
    }
    if (ch === '|') {
      stack[stack.length - 1].hasAlternation = true;
      continue;
    }
    if (ch === ')') {
      if (stack.length === 1) continue;
      const group = stack.pop()!;
      const outer = quantifierAt(pattern, i + 1);
      if (outer?.repeated && (group.hasRepeat || group.hasAlternation)) return false;
      if (outer) {
        if (outer.repeated) stack[stack.length - 1].hasRepeat = true;
        i = outer.end;
      }
      continue;
    }

    const quantifier = quantifierAt(pattern, i);
    if (quantifier) {
      if (quantifier.repeated) stack[stack.length - 1].hasRepeat = true;
      i = quantifier.end;
    }
  }

  return true;
}
