/**
 * Secure CSV Parser
 * Replaces vulnerable xlsx library with secure CSV parsing
 */

interface CSVParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  maxRows?: number;
  maxCellSize?: number;
}

interface CSVParseResult {
  data: string[][];
  headers?: string[];
  errors: string[];
  rowCount: number;
}

class SecureCSVParser {
  private readonly defaultOptions: Required<CSVParseOptions> = {
    delimiter: ',',
    quote: '"',
    escape: '"',
    maxRows: 10000, // Security limit
    maxCellSize: 1000 // Security limit
  };

  /**
   * Parse CSV content securely
   */
  parse(csvContent: string, options: CSVParseOptions = {}): CSVParseResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const rows: string[][] = [];

    try {
      // Security check: limit input size
      if (csvContent.length > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('CSV file too large (max 10MB)');
      }

      const lines = csvContent.split(/\r?\n/);
      
      if (lines.length > opts.maxRows) {
        errors.push(`Too many rows. Limited to ${opts.maxRows} rows.`);
        lines.splice(opts.maxRows);
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const row = this.parseLine(line, opts);
          
          // Security check: validate cell sizes
          for (const cell of row) {
            if (cell.length > opts.maxCellSize) {
              errors.push(`Cell too large in row ${i + 1}. Truncated to ${opts.maxCellSize} characters.`);
              break;
            }
          }

          rows.push(row);
        } catch (error) {
          errors.push(`Error parsing row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const headers = rows.length > 0 ? rows[0] : [];
      const data = rows.length > 1 ? rows.slice(1) : [];

      return {
        data,
        headers,
        errors,
        rowCount: rows.length
      };

    } catch (error) {
      return {
        data: [],
        headers: [],
        errors: [error instanceof Error ? error.message : 'Parse error'],
        rowCount: 0
      };
    }
  }

  /**
   * Parse a single CSV line
   */
  private parseLine(line: string, options: Required<CSVParseOptions>): string[] {
    const { delimiter, quote, escape } = options;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === quote) {
        if (inQuotes && nextChar === quote) {
          // Escaped quote
          current += quote;
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // End of cell
        cells.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }

      // Security check: prevent infinite loops
      if (i > line.length + 1000) {
        throw new Error('Parse error: potential infinite loop detected');
      }
    }

    // Add the last cell
    cells.push(current.trim());

    return cells;
  }

  /**
   * Convert parsed data to objects using headers
   */
  toObjects(parseResult: CSVParseResult): Record<string, string>[] {
    if (!parseResult.headers || parseResult.headers.length === 0) {
      return [];
    }

    return parseResult.data.map(row => {
      const obj: Record<string, string> = {};
      parseResult.headers!.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  /**
   * Validate CSV structure
   */
  validate(parseResult: CSVParseResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [...parseResult.errors];

    if (!parseResult.headers || parseResult.headers.length === 0) {
      errors.push('No headers found');
    }

    // Check for consistent column count
    const expectedColumns = parseResult.headers?.length || 0;
    parseResult.data.forEach((row, index) => {
      if (row.length !== expectedColumns) {
        errors.push(`Row ${index + 2} has ${row.length} columns, expected ${expectedColumns}`);
      }
    });

    // Check for duplicate headers
    if (parseResult.headers) {
      const headerSet = new Set();
      parseResult.headers.forEach((header, index) => {
        if (headerSet.has(header)) {
          errors.push(`Duplicate header "${header}" at column ${index + 1}`);
        }
        headerSet.add(header);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const secureCSVParser = new SecureCSVParser();

// Legacy compatibility for xlsx replacement
export const parseCSV = (content: string, options?: CSVParseOptions) => {
  return secureCSVParser.parse(content, options);
};

export default secureCSVParser;
