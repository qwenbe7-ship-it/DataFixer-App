function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value !== null && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      const child = input[key];
      if (child !== undefined) output[key] = canonicalize(child);
    }
    return output;
  }
  return value;
}

export async function sha256Bytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Canonical(value: unknown): Promise<string> {
  const json = JSON.stringify(canonicalize(value));
  if (json === undefined) throw new TypeError('Canonical hash input must be JSON-serializable');
  const bytes = new TextEncoder().encode(json);
  return sha256Bytes(bytes.buffer);
}
