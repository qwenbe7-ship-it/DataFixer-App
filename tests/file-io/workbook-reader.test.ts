import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { inspectWorkbook, readWorksheet } from '../../src/file-io/workbook-reader';

describe('workbook reader', () => {
  it('reads quoted CSV values and treats row two as source row two', async () => {
    const input = new File(['name,note\nAlice,"hello, world"\n'], 'people.csv', { type: 'text/csv' });
    const inspection = await inspectWorkbook(input);
    expect(inspection.sheets).toEqual([{ name: 'Sheet1', rows: 1, columns: ['name', 'note'] }]);
    const dataset = await readWorksheet(input, 'Sheet1');
    expect(dataset.rows[0]).toMatchObject({
      rowId: 'people.csv:2',
      sourceRowNumber: 2,
      values: { name: 'Alice', note: 'hello, world' },
    });
  });

  it('preserves source row numbers across blank CSV lines', async () => {
    const input = new File(['name\nAlice\n\nCarol\n'], 'people.csv', { type: 'text/csv' });
    const dataset = await readWorksheet(input, 'Sheet1');
    expect(dataset.rows.map((row) => row.rowId)).toEqual(['people.csv:2', 'people.csv:4']);
  });

  it('accepts a UTF-8 BOM CSV', async () => {
    const input = new File(['\uFEFFname\nAlice\n'], 'people.csv', { type: 'text/csv' });
    expect((await readWorksheet(input, 'Sheet1')).columns).toEqual(['name']);
  });

  it('rejects malformed UTF-8 CSV bytes', async () => {
    const input = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'bad.csv');
    await expect(readWorksheet(input, 'Sheet1')).rejects.toThrowError('PARSE_FAILED');
  });

  it('lists XLSX sheets before reading the selected sheet', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['id'], [1]]), 'Orders');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['id'], [2]]), 'Returns');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const input = new File([bytes], 'book.xlsx');
    const inspection = await inspectWorkbook(input);
    expect(inspection.sheets.map((sheet) => sheet.name)).toEqual(['Orders', 'Returns']);
  });

  it('rejects an unknown sheet', async () => {
    const input = new File(['name\nAlice\n'], 'people.csv');
    await expect(readWorksheet(input, 'Missing')).rejects.toThrowError('PARSE_FAILED');
  });

  it('rejects unsupported and empty files', async () => {
    await expect(inspectWorkbook(new File(['x'], 'people.txt'))).rejects.toThrowError('UNSUPPORTED_FILE');
    await expect(inspectWorkbook(new File([], 'empty.csv'))).rejects.toThrowError('EMPTY_FILE');
  });

  it('rejects a corrupt XLSX archive', async () => {
    await expect(inspectWorkbook(new File(['not a zip'], 'broken.xlsx'))).rejects.toThrowError('PARSE_FAILED');
  });
});
