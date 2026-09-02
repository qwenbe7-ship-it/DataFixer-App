declare module 'xlsx' {
  export interface WorkSheet {}
  export interface WorkBook { SheetNames: string[]; Sheets: Record<string, WorkSheet>; Props?: Record<string, unknown> }
  export const utils: {
    book_new(): WorkBook;
    aoa_to_sheet(rows: unknown[][]): WorkSheet;
    book_append_sheet(workbook: WorkBook, sheet: WorkSheet, name: string): void;
    sheet_to_json<T>(sheet: WorkSheet, options: { header: 1; raw: boolean; defval: null; blankrows: boolean }): T[];
  };
  export function read(input: string | ArrayBuffer, options: { type: 'string' | 'array'; dense: boolean; raw: boolean; cellDates: boolean }): WorkBook;
  export function write(workbook: WorkBook, options: { type: 'array'; bookType: 'xlsx'; compression?: boolean }): ArrayBuffer | Uint8Array;
}
