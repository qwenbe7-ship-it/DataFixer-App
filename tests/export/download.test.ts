import { describe, expect, it } from 'vitest';
import { buildDownloadFileName } from '../../src/export/download';

describe('download filenames', () => {
  it('uses the datafixer prefix and a strict safe character set', () => {
    const name = buildDownloadFileName('../보고서<script>', 'html');
    expect(name).toMatch(/^datafixer-[A-Za-z0-9._-]+\.html$/);
  });
});
