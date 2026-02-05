import type { HttpMethod, BodyType, KeyValue } from '../types/http';

export type ExportFormat = 'curl' | 'wget' | 'fetch' | 'httpie';

export interface ExportRequestInput {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  bodyType: BodyType;
  bodyContent: string | null;
}

/**
 * Escapes a string for use in shell commands (single-quoted).
 * Handles single quotes by ending the quote, adding escaped quote, and resuming.
 */
function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Builds a full URL with query parameters appended.
 */
function buildUrl(baseUrl: string, queryParams: KeyValue[]): string {
  const enabledParams = queryParams.filter((p) => p.enabled && p.key.trim());
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  for (const param of enabledParams) {
    searchParams.append(param.key, param.value);
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${searchParams.toString()}`;
}

/**
 * Returns the Content-Type header value for a body type, or null if not applicable.
 */
function getContentType(bodyType: BodyType): string | null {
  switch (bodyType) {
    case 'json':
      return 'application/json';
    case 'form_url_encoded':
      return 'application/x-www-form-urlencoded';
    case 'text':
      return 'text/plain';
    case 'multipart':
      return 'multipart/form-data';
    default:
      return null;
  }
}

/**
 * Gets enabled headers and auto-adds Content-Type if needed.
 */
function getEffectiveHeaders(
  headers: KeyValue[],
  bodyType: BodyType,
): { key: string; value: string }[] {
  const enabledHeaders = headers
    .filter((h) => h.enabled && h.key.trim())
    .map((h) => ({ key: h.key, value: h.value }));

  const contentType = getContentType(bodyType);
  const hasContentType = enabledHeaders.some(
    (h) => h.key.toLowerCase() === 'content-type',
  );

  if (contentType && !hasContentType && bodyType !== 'none') {
    enabledHeaders.push({ key: 'Content-Type', value: contentType });
  }

  return enabledHeaders;
}

/**
 * Exports request as a curl command.
 */
function exportAsCurl(input: ExportRequestInput): string {
  const url = buildUrl(input.url, input.queryParams);
  const headers = getEffectiveHeaders(input.headers, input.bodyType);

  const parts: string[] = ['curl'];

  // Add method flag (GET is implicit)
  if (input.method !== 'GET') {
    parts.push(`-X ${input.method}`);
  }

  // Add headers
  for (const header of headers) {
    parts.push(`-H ${shellEscape(`${header.key}: ${header.value}`)}`);
  }

  // Add body
  if (input.bodyContent && input.bodyType !== 'none') {
    parts.push(`-d ${shellEscape(input.bodyContent)}`);
  }

  // Add URL (always last)
  parts.push(shellEscape(url));

  // Format as multiline for readability
  if (parts.length > 2) {
    return parts.join(' \\\n  ');
  }
  return parts.join(' ');
}

/**
 * Exports request as a wget command.
 */
function exportAsWget(input: ExportRequestInput): string {
  const url = buildUrl(input.url, input.queryParams);
  const headers = getEffectiveHeaders(input.headers, input.bodyType);

  const parts: string[] = ['wget'];

  // Add method
  parts.push(`--method=${input.method}`);

  // Add headers
  for (const header of headers) {
    parts.push(`--header=${shellEscape(`${header.key}: ${header.value}`)}`);
  }

  // Add body
  if (input.bodyContent && input.bodyType !== 'none') {
    parts.push(`--body-data=${shellEscape(input.bodyContent)}`);
  }

  // Output to stdout instead of file
  parts.push('-O -');

  // Add URL
  parts.push(shellEscape(url));

  // Format as multiline for readability
  if (parts.length > 3) {
    return parts.join(' \\\n  ');
  }
  return parts.join(' ');
}

/**
 * Exports request as JavaScript fetch code.
 */
function exportAsFetch(input: ExportRequestInput): string {
  const url = buildUrl(input.url, input.queryParams);
  const headers = getEffectiveHeaders(input.headers, input.bodyType);

  const options: Record<string, unknown> = {
    method: input.method,
  };

  if (headers.length > 0) {
    const headersObj: Record<string, string> = {};
    for (const header of headers) {
      headersObj[header.key] = header.value;
    }
    options.headers = headersObj;
  }

  if (input.bodyContent && input.bodyType !== 'none') {
    options.body = input.bodyContent;
  }

  const optionsJson = JSON.stringify(options, null, 2);
  return `fetch(${JSON.stringify(url)}, ${optionsJson})`;
}

/**
 * Exports request as an HTTPie command.
 */
function exportAsHttpie(input: ExportRequestInput): string {
  const url = buildUrl(input.url, input.queryParams);
  const headers = getEffectiveHeaders(input.headers, input.bodyType);

  const parts: string[] = ['http', input.method, shellEscape(url)];

  // Add headers (HTTPie uses Header:Value syntax)
  for (const header of headers) {
    parts.push(`${shellEscape(header.key)}:${shellEscape(header.value)}`);
  }

  // Add body for JSON (HTTPie can parse JSON bodies differently)
  if (input.bodyContent && input.bodyType !== 'none') {
    // For raw body data, use echo pipe
    return `echo ${shellEscape(input.bodyContent)} | ${parts.join(' ')}`;
  }

  // Format as multiline for readability
  if (parts.length > 3) {
    return parts.join(' \\\n  ');
  }
  return parts.join(' ');
}

/**
 * Exports a request in the specified format.
 */
export function exportRequest(
  input: ExportRequestInput,
  format: ExportFormat,
): string {
  switch (format) {
    case 'curl':
      return exportAsCurl(input);
    case 'wget':
      return exportAsWget(input);
    case 'fetch':
      return exportAsFetch(input);
    case 'httpie':
      return exportAsHttpie(input);
  }
}
