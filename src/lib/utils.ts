export interface ErrorResponse {
  error: string;
  code: string;
}

export function createErrorResponse(error: string, code: string): ErrorResponse {
  if (typeof error !== 'string') {
    throw new TypeError('error must be a string');
  }
  if (typeof code !== 'string') {
    throw new TypeError('code must be a string');
  }
  return { error, code };
}

export function validateEnv(key: string): string {
  if (typeof key !== 'string') {
    throw new TypeError('key must be a string');
  }
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function formatDate(d: Date | string | number): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Invalid date input');
  }
  return date.toISOString();
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  const hex = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  
  return uuid;
}