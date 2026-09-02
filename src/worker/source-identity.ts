export interface SourceIdentityPart {
  name: string;
  bytes: number;
  hash: string;
  sheetName: string;
}

export function buildSourceIdentityDescriptor(parts: SourceIdentityPart[]): SourceIdentityPart[] {
  return parts.map((part) => ({ ...part }));
}
