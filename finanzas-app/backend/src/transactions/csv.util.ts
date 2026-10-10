// Minimal RFC 4180 helpers (no dependency): quote on export, parse quotes on import.

export function escapeCsvField(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvLine(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  const endRecord = () => {
    record.push(field);
    field = '';
    // Skip blank lines (a lone empty field)
    if (!(record.length === 1 && record[0].trim() === '')) records.push(record);
    record = [];
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      endRecord();
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length > 0) endRecord();
  return records;
}
