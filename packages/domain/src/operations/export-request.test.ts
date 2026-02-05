import { describe, it, expect } from 'vitest';
import { exportRequest, ExportRequestInput, ExportFormat } from './export-request';

const baseInput: ExportRequestInput = {
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: [],
  queryParams: [],
  bodyType: 'none',
  bodyContent: null,
};

describe('exportRequest', () => {
  describe('curl format', () => {
    it('exports basic GET request without method flag', () => {
      const result = exportRequest(baseInput, 'curl');
      expect(result).toBe("curl 'https://api.example.com/users'");
    });

    it('exports POST request with method flag', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('-X POST');
    });

    it('includes JSON body with Content-Type header', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'json',
        bodyContent: '{"name": "test"}',
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain("-H 'Content-Type: application/json'");
      expect(result).toContain("-d '{\"name\": \"test\"}'");
    });

    it('appends enabled query params to URL', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        queryParams: [
          { key: 'page', value: '1', enabled: true },
          { key: 'limit', value: '10', enabled: true },
          { key: 'disabled', value: 'skip', enabled: false },
        ],
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
      expect(result).not.toContain('disabled');
    });

    it('filters out disabled headers', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        headers: [
          { key: 'Authorization', value: 'Bearer token', enabled: true },
          { key: 'X-Disabled', value: 'skip', enabled: false },
        ],
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('Authorization: Bearer token');
      expect(result).not.toContain('X-Disabled');
    });

    it('escapes single quotes in values', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'json',
        bodyContent: "{'key': 'value'}",
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain("'\\''");
    });

    it('does not add Content-Type if already present', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        headers: [
          { key: 'Content-Type', value: 'application/xml', enabled: true },
        ],
        bodyType: 'json',
        bodyContent: '<xml/>',
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('application/xml');
      expect(result).not.toContain('application/json');
    });
  });

  describe('wget format', () => {
    it('exports basic GET request', () => {
      const result = exportRequest(baseInput, 'wget');
      expect(result).toContain('wget');
      expect(result).toContain('--method=GET');
      expect(result).toContain('-O -');
    });

    it('exports POST with body', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'json',
        bodyContent: '{"test": true}',
      };
      const result = exportRequest(input, 'wget');
      expect(result).toContain('--method=POST');
      expect(result).toContain('--body-data=');
    });

    it('includes headers', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        headers: [
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
      };
      const result = exportRequest(input, 'wget');
      expect(result).toContain("--header='Accept: application/json'");
    });
  });

  describe('fetch format', () => {
    it('exports as JavaScript fetch call', () => {
      const result = exportRequest(baseInput, 'fetch');
      expect(result).toContain('fetch(');
      expect(result).toContain('"https://api.example.com/users"');
      expect(result).toContain('"method": "GET"');
    });

    it('includes headers object', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        headers: [
          { key: 'Authorization', value: 'Bearer token', enabled: true },
        ],
      };
      const result = exportRequest(input, 'fetch');
      expect(result).toContain('"headers"');
      expect(result).toContain('"Authorization": "Bearer token"');
    });

    it('includes body string', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'json',
        bodyContent: '{"name": "test"}',
      };
      const result = exportRequest(input, 'fetch');
      expect(result).toContain('"body":');
    });

    it('appends query params to URL', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        queryParams: [
          { key: 'search', value: 'hello world', enabled: true },
        ],
      };
      const result = exportRequest(input, 'fetch');
      expect(result).toContain('search=hello+world');
    });
  });

  describe('httpie format', () => {
    it('exports basic request', () => {
      const result = exportRequest(baseInput, 'httpie');
      expect(result).toContain('http GET');
      expect(result).toContain("'https://api.example.com/users'");
    });

    it('includes headers', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        headers: [
          { key: 'Accept', value: 'application/json', enabled: true },
        ],
      };
      const result = exportRequest(input, 'httpie');
      expect(result).toContain("'Accept':'application/json'");
    });

    it('pipes body data with echo', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'json',
        bodyContent: '{"test": true}',
      };
      const result = exportRequest(input, 'httpie');
      expect(result).toContain('echo');
      expect(result).toContain('|');
    });
  });

  describe('all formats', () => {
    const formats: ExportFormat[] = ['curl', 'wget', 'fetch', 'httpie'];

    it.each(formats)('%s format handles empty headers and params', (format) => {
      const result = exportRequest(baseInput, format);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it.each(formats)('%s format includes the URL', (format) => {
      const result = exportRequest(baseInput, format);
      expect(result).toContain('api.example.com');
    });

    it.each(formats)('%s format handles all HTTP methods', (format) => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
      for (const method of methods) {
        const input: ExportRequestInput = { ...baseInput, method };
        const result = exportRequest(input, format);
        expect(result).toBeTruthy();
      }
    });
  });

  describe('edge cases', () => {
    it('handles URL with existing query string', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        url: 'https://api.example.com/users?existing=param',
        queryParams: [
          { key: 'new', value: 'param', enabled: true },
        ],
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('existing=param');
      expect(result).toContain('new=param');
      expect(result).toContain('&');
    });

    it('filters headers with empty keys', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        headers: [
          { key: '', value: 'empty key', enabled: true },
          { key: 'Valid', value: 'header', enabled: true },
        ],
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('Valid: header');
      expect(result).not.toContain('empty key');
    });

    it('filters query params with empty keys', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        queryParams: [
          { key: '', value: 'empty', enabled: true },
          { key: 'valid', value: 'param', enabled: true },
        ],
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('valid=param');
      expect(result).not.toContain('empty');
    });

    it('adds Content-Type for form_url_encoded', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'form_url_encoded',
        bodyContent: 'key=value',
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('application/x-www-form-urlencoded');
    });

    it('adds Content-Type for text body', () => {
      const input: ExportRequestInput = {
        ...baseInput,
        method: 'POST',
        bodyType: 'text',
        bodyContent: 'plain text',
      };
      const result = exportRequest(input, 'curl');
      expect(result).toContain('text/plain');
    });
  });
});
