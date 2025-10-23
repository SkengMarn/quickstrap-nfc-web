/**
 * Input Sanitization Utilities
 * Prevents SQL injection and other injection attacks
 */

/**
 * Sanitizes user input for database queries
 * Removes or escapes dangerous characters that could be used in SQL injection
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';

  // Convert to string and trim
  let sanitized = String(input).trim();

  // Remove or escape dangerous SQL characters
  // Note: Supabase PostgREST handles most SQL injection, but we still sanitize for safety
  const dangerousChars = [
    ';', '--', '/*', '*/', 'xp_', 'sp_',
    'exec', 'execute', 'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'union', 'script', '<script', '</script>', 'javascript:', 'vbscript:',
    '\x00', '\x1a', '\n', '\r', '\t'
  ];

  // Replace dangerous patterns with safe alternatives
  dangerousChars.forEach(char => {
    const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Limit length to prevent DoS
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized;
}

/**
 * Sanitizes input specifically for LIKE queries
 * Escapes SQL LIKE wildcards
 */
export function sanitizeLikeInput(input: string | null | undefined): string {
  if (!input) return '';

  let sanitized = sanitizeInput(input);

  // Escape SQL LIKE wildcards
  sanitized = sanitized
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_');   // Escape underscores

  return sanitized;
}

/**
 * Sanitizes CSV cell content to prevent formula injection
 */
export function sanitizeCSVCell(cell: string | null | undefined): string {
  if (!cell) return '';

  let sanitized = String(cell).trim();

  // Check for formula injection patterns
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  const startsWithDangerous = dangerousPrefixes.some(prefix =>
    sanitized.toLowerCase().startsWith(prefix.toLowerCase())
  );

  if (startsWithDangerous) {
    // Prefix with single quote to prevent formula execution
    sanitized = "'" + sanitized;
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validates file MIME type for uploads
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  if (!file || !file.type) return false;

  return allowedTypes.includes(file.type.toLowerCase());
}

/**
 * Validates file size
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  if (!file) return false;

  return file.size <= maxSizeBytes;
}

/**
 * Creates a safe search term for database queries
 * Combines sanitization with length limits
 */
export function createSafeSearchTerm(input: string | null | undefined): string {
  const sanitized = sanitizeLikeInput(input);

  // Additional safety: ensure it's not just special characters
  if (!sanitized || /^[\\%_\s]*$/.test(sanitized)) {
    return '';
  }

  return sanitized;
}



