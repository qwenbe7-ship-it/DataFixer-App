import * as XLSX from 'xlsx';
import { DataFixerError } from '../domain/errors';
import type { ProcessingResult } from '../domain/types';
import { buildRejectedWorkbookModel, buildResultWorkbookModel, type WorkbookModel } from './workbook-model';

function writeWorkbook(model: WorkbookModel): Uint8Array {
  try {
    const workbook = XLSX.utils.book_new();
    workbook.Props = {};
    for (const sheetModel of model.sheets) {
      const sheet = XLSX.utils.aoa_to_sheet(sheetModel.rows);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetModel.name);
    }
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true });
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  } catch (error) {
    if (error instanceof DataFixerError) throw error;
    throw new DataFixerError('EXPORT_FAILED', { artifact: 'xlsx' });
  }
}

function assertExportable(result: ProcessingResult): void {
  if (!result.summary.reconciled) {
    throw new DataFixerError('EXPORT_FAILED', { issue: 'unreconciled-result' });
  }
}

export function buildResultWorkbook(result: ProcessingResult): Uint8Array {
  assertExportable(result);
  return writeWorkbook(buildResultWorkbookModel(result));
}

export function buildRejectedWorkbook(result: ProcessingResult): Uint8Array {
  assertExportable(result);
  return writeWorkbook(buildRejectedWorkbookModel(result));
}
