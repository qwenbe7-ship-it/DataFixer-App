export function buildDownloadFileName(stem: string, extension: string): string {
  const safeStem = stem.replace(/[^A-Za-z0-9._-]/g, '_') || 'file';
  const safeExtension = extension.replace(/[^A-Za-z0-9]/g, '') || 'bin';
  return `datafixer-${safeStem}.${safeExtension}`;
}

export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const ownedBytes = new Uint8Array(bytes.byteLength);
  ownedBytes.set(bytes);
  const blob = new Blob([ownedBytes.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(text: string, fileName: string, mimeType: string): void {
  downloadBytes(new TextEncoder().encode(text), fileName, mimeType);
}
