import { describe, it, expect } from 'vitest';
import {
  resolveString,
  resolveRequestVariables,
  extractVariableRefs,
} from './resolve-variables';

describe('resolveString', () => {
  it('replaces variables with values from the map', () => {
    const vars = new Map([
      ['baseUrl', 'https://api.example.com'],
      ['version', 'v2'],
    ]);
    expect(resolveString('{{baseUrl}}/{{version}}/users', vars)).toBe(
      'https://api.example.com/v2/users',
    );
  });

  it('leaves unresolved variables as-is', () => {
    const vars = new Map([['baseUrl', 'https://api.example.com']]);
    expect(resolveString('{{baseUrl}}/{{unknown}}', vars)).toBe(
      'https://api.example.com/{{unknown}}',
    );
  });

  it('returns string unchanged when no variables present', () => {
    const vars = new Map([['foo', 'bar']]);
    expect(resolveString('no variables here', vars)).toBe('no variables here');
  });

  it('handles empty string', () => {
    expect(resolveString('', new Map())).toBe('');
  });

  it('handles empty variable map', () => {
    expect(resolveString('{{foo}}', new Map())).toBe('{{foo}}');
  });
});

describe('resolveRequestVariables', () => {
  it('resolves variables in URL, headers, query params, and body', () => {
    const input = {
      method: 'GET' as const,
      url: '{{baseUrl}}/posts',
      headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
      query_params: [{ key: 'page', value: '{{page}}', enabled: true }],
      body_type: 'json' as const,
      body_content: '{"key": "{{apiKey}}"}',
    };

    const vars: [string, string][] = [
      ['baseUrl', 'https://api.example.com'],
      ['token', 'abc123'],
      ['page', '1'],
      ['apiKey', 'secret'],
    ];

    const result = resolveRequestVariables(input, vars);

    expect(result.url).toBe('https://api.example.com/posts');
    expect(result.headers[0].value).toBe('Bearer abc123');
    expect(result.query_params[0].value).toBe('1');
    expect(result.body_content).toBe('{"key": "secret"}');
  });

  it('preserves method and body_type', () => {
    const input = {
      method: 'POST' as const,
      url: 'http://localhost',
      headers: [],
      query_params: [],
      body_type: 'none' as const,
      body_content: null,
    };

    const result = resolveRequestVariables(input, []);
    expect(result.method).toBe('POST');
    expect(result.body_type).toBe('none');
    expect(result.body_content).toBeNull();
  });

  it('preserves enabled state of headers and params', () => {
    const input = {
      method: 'GET' as const,
      url: 'http://localhost',
      headers: [{ key: 'X-Custom', value: '{{val}}', enabled: false }],
      query_params: [{ key: 'q', value: '{{search}}', enabled: true }],
      body_type: 'none' as const,
      body_content: null,
    };

    const result = resolveRequestVariables(input, [['val', 'resolved']]);
    expect(result.headers[0].enabled).toBe(false);
    expect(result.query_params[0].enabled).toBe(true);
  });
});

describe('extractVariableRefs', () => {
  it('extracts variable names from a string', () => {
    expect(extractVariableRefs('{{baseUrl}}/{{version}}/users')).toEqual([
      'baseUrl',
      'version',
    ]);
  });

  it('returns empty array for string without variables', () => {
    expect(extractVariableRefs('no variables')).toEqual([]);
  });

  it('handles duplicate references', () => {
    expect(extractVariableRefs('{{a}} and {{a}}')).toEqual(['a', 'a']);
  });
});
