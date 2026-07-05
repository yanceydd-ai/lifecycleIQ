import { Injectable } from '@nestjs/common';
import * as Papa from 'papaparse';

export interface ImportPreview {
  totalRows: number;
  validRows: Record<string, string>[];
  invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[];
}

@Injectable()
export class CsvService {
  parse(csvString: string): Record<string, string>[] {
    const filtered = csvString
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .map((line) => line.replace(/\r$/, ''))
      .join('\n');
    const result = Papa.parse<Record<string, string>>(filtered, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  }

  serialize<T extends object>(records: T[], columns: (keyof T)[]): string {
    const header = columns.join(',');
    const rows = records.map((r) =>
      columns
        .map((col) => {
          const val = r[col];
          let str = val === null || val === undefined ? '' : String(val);
          // Formula-injection guard: only free-text (string) fields can carry
          // attacker-controlled formulas; numeric/Decimal/Date values stay
          // untouched so negative numbers survive round-trips.
          if (typeof val === 'string' && /^[=+\-@\t\r]/.test(str)) {
            str = `'${str}`;
          }
          return str.includes(',') || str.includes('\n') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
