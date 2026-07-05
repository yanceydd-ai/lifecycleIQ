export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    // Formula-injection guard: only free-text (string) fields can carry
    // attacker-controlled formulas; numbers stay untouched so negatives
    // survive round-trips.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const headerLine = headers.length > 0 ? [headers.map(escape).join(',')] : [];
  const lines = [...headerLine, ...rows.map(row => row.map(escape).join(','))];
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
