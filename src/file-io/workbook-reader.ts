import * as XLSX from 'xlsx';
import { DataFixerError } from '../domain/errors';
import type { Dataset } from '../domain/types';
import { normalizeSheet } from './normalize-sheet';

export interface SheetInspection {
  name: string;
  rows: number;
  columns: string[];
}

export interface WorkbookInspection {
  fileName: string;
  sheets: SheetInspection[];
}

function assertXlsxContainer(bytes: ArrayBuffer, fileName: string): void {
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (signature.length < 4
    || signature[0] !== 0x50
    || signature[1] !== 0x4b
    || signature[2] !== 0x03
    || signature[3] !== 0x04) {
    throw new DataFixerError('PARSE_FAILED', { file: fileName });
  }
}

async function parse(file: File): Promise<XLSX.WorkBook> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    throw new DataFixerError('UNSUPPORTED_FILE', { file: file.name });
  }
  if (file.size === 0) {
    throw new DataFixerError('EMPTY_FILE', { file: file.name });
  }

  try {
    const bytes = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) {
      const text = new TextDecoder('utf-8', { fatal: true })
        .decode(bytes)
        .replace(/^\uFEFF/, '');
      return XLSX.read(text, { type: 'string', dense: true, raw: true, cellDates: false });
    }
    assertXlsxContainer(bytes, file.name);
    return XLSX.read(bytes, { type: 'array', dense: true, raw: true, cellDates: false });
  } catch (error) {
    if (error instanceof DataFixerError) throw error;
    throw new DataFixerError('PARSE_FAILED', { file: file.name });
  }
}

function toMatrix(sheet: XLSX.WorkSheet, preserveBlankRows = false): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: preserveBlankRows,
  });
}

export async function inspectWorkbook(file: File): Promise<WorkbookInspection> {
  const workbook = await parse(file);
  return {
    fileName: file.name,
    sheets: workbook.SheetNames.map((name) => {
      const matrix = toMatrix(workbook.Sheets[name]);
      const columns = (matrix[0] ?? []).map((value) => String(value).trim());
      return { name, rows: Math.max(0, matrix.length - 1), columns };
    }),
  };
}

export async function readWorksheet(file: File, sheetName: string): Promise<Dataset> {
  const workbook = await parse(file);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new DataFixerError('PARSE_FAILED', { file: file.name, sheet: sheetName });
  }
  return normalizeSheet(file.name, toMatrix(sheet, true));
}
